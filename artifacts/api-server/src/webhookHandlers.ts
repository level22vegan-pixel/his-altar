import { db, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient";
import { logger } from "./lib/logger";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "Webhook payload must be a Buffer. Ensure the webhook route is registered BEFORE express.json()."
      );
    }

    const stripe = await getUncachableStripeClient();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    // Verify signature — throws if invalid or if the secret is for the wrong mode
    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    logger.info({ type: event.type }, "Stripe webhook received");

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (customerId) {
          await db
            .update(organizationsTable)
            .set({ plan: "pro", billingStatus: "active", stripeCustomerId: customerId })
            .where(eq(organizationsTable.stripeCustomerId, customerId));
          logger.info({ customerId }, "Checkout completed — org upgraded to pro");
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;

        let plan: string;
        let billingStatus: string;

        switch (sub.status) {
          case "active":
          case "trialing":
            plan = "pro";
            billingStatus = "active";
            break;
          case "past_due":
            plan = "pro";
            billingStatus = "past_due";
            break;
          case "canceled":
          case "incomplete_expired":
            plan = "free";
            billingStatus = "canceled";
            break;
          default:
            plan = "pro";
            billingStatus = sub.status;
        }

        await db
          .update(organizationsTable)
          .set({ plan, billingStatus })
          .where(eq(organizationsTable.stripeCustomerId, customerId));

        logger.info({ customerId, status: sub.status, plan, billingStatus }, "Subscription updated");
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (customerId) {
          await db
            .update(organizationsTable)
            .set({ plan: "free", billingStatus: "canceled" })
            .where(eq(organizationsTable.stripeCustomerId, customerId));
          logger.info({ customerId }, "Subscription canceled — org downgraded to free");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await db
            .update(organizationsTable)
            .set({ billingStatus: "past_due" })
            .where(eq(organizationsTable.stripeCustomerId, customerId));
          logger.info({ customerId }, "Invoice payment failed — billing status set to past_due");
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await db
            .update(organizationsTable)
            .set({ plan: "pro", billingStatus: "active" })
            .where(eq(organizationsTable.stripeCustomerId, customerId));
          logger.info({ customerId }, "Invoice paid — billing status restored to active");
        }
        break;
      }

      default:
        logger.info({ type: event.type }, "Unhandled Stripe event type (ignored)");
    }
  }
}
