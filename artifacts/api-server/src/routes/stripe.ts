import { Router, type IRouter } from "express";
import { db, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
      try {
        const stripe = await getUncachableStripeClient();
        const subs = await stripe.subscriptions.list({
          customer: org.stripeCustomerId,
          status: "all",
          limit: 5,
        });
        const active = subs.data.find(
          (s) => s.status !== "canceled" && s.status !== "incomplete_expired"
        );
        if (active) {
          const a = active as any;
          subscription = {
            id: active.id,
            status: active.status,
            current_period_end: a.current_period_end
              ? new Date(a.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: active.cancel_at_period_end,
          };
        }
      } catch {
        // ignore — subscription info optional
      }
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

// GET /api/stripe/prices — list active prices from Stripe API
router.get("/prices", async (_req, res) => {
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
  } catch {
    res.json({ data: [] });
  }
});

export { router as stripeRouter };
