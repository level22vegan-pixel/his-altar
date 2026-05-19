import { getUncachableStripeClient } from "./stripeClient";

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
    // Verify signature — throws if invalid
    stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
