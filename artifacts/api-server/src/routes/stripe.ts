import { Router, type IRouter } from "express";
import { db, organizationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";

const router: IRouter = Router();

// GET /api/stripe/publishable-key
router.get("/publishable-key", async (_req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stripe/billing-status — trial + subscription info for the logged-in org
router.get("/billing-status", async (req: any, res) => {
  try {
    const orgId = req.orgId ?? 1;
    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);

    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const now = new Date();
    const trialEndsAt = org.trialEndsAt;
    const trialActive = trialEndsAt ? trialEndsAt > now : false;
    const trialDaysLeft = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000))
      : 0;

    let subscription = null;
    if (org.stripeCustomerId) {
      const result = await db.execute(
        sql`SELECT id, status, current_period_end, cancel_at_period_end
            FROM stripe.subscriptions
            WHERE customer = ${org.stripeCustomerId}
              AND status NOT IN ('canceled', 'incomplete_expired')
            ORDER BY created DESC LIMIT 1`
      );
      subscription = result.rows[0] ?? null;
    }

    res.json({ trialActive, trialDaysLeft, trialEndsAt, subscription });
  } catch (err: any) {
    req.log.error({ err }, "billing-status error");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/checkout — create a Stripe Checkout session
router.post("/checkout", async (req: any, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);

    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    // Ensure Stripe customer exists
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org.email,
        name: org.name,
        metadata: { orgId: String(orgId) },
      });
      customerId = customer.id;
      await db
        .update(organizationsTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(organizationsTable.id, orgId));
    }

    // Use org's trial_ends_at if still in the future
    const now = new Date();
    const trialEnd =
      org.trialEndsAt && org.trialEndsAt > now
        ? Math.floor(org.trialEndsAt.getTime() / 1000)
        : undefined;

    const { priceId } = req.body as { priceId?: string };
    if (!priceId) {
      res.status(400).json({ error: "priceId is required" });
      return;
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: trialEnd ? { trial_end: trialEnd } : undefined,
      success_url: `${baseUrl}/org/billing?success=true`,
      cancel_url: `${baseUrl}/org/billing?cancelled=true`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    req.log.error({ err }, "checkout error");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/portal — Stripe Billing Portal session
router.post("/portal", async (req: any, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const [org] = await db
      .select({ stripeCustomerId: organizationsTable.stripeCustomerId })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);

    if (!org?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account found. Subscribe first." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${baseUrl}/org/billing`,
    });

    res.json({ url: portalSession.url });
  } catch (err: any) {
    req.log.error({ err }, "portal error");
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stripe/prices — list active prices (DB-synced first, live API fallback)
router.get("/prices", async (_req, res) => {
  // Try DB-synced stripe schema first
  try {
    const result = await db.execute(
      sql`SELECT p.id as price_id, p.unit_amount, p.currency, p.recurring,
                 pr.id as product_id, pr.name as product_name, pr.description as product_description
          FROM stripe.prices p
          JOIN stripe.products pr ON pr.id = p.product
          WHERE p.active = true AND pr.active = true
          ORDER BY p.unit_amount ASC`
    );
    if (result.rows.length > 0) {
      res.json({ data: result.rows });
      return;
    }
  } catch {
    // stripe schema not ready — fall through to live API
  }

  // Fall back: fetch directly from Stripe API
  try {
    const stripe = await getUncachableStripeClient();
    const priceList = await stripe.prices.list({ active: true, expand: ["data.product"], limit: 20 });
    const data = priceList.data
      .filter(p => p.recurring && typeof p.product === "object" && (p.product as Stripe.Product).active)
      .map(p => {
        const product = p.product as Stripe.Product;
        return {
          price_id: p.id,
          unit_amount: p.unit_amount ?? 0,
          currency: p.currency,
          recurring: p.recurring,
          product_id: product.id,
          product_name: product.name,
          product_description: product.description ?? null,
        };
      })
      .sort((a, b) => a.unit_amount - b.unit_amount);
    res.json({ data });
  } catch (err: any) {
    res.json({ data: [] });
  }
});

export { router as stripeRouter };
