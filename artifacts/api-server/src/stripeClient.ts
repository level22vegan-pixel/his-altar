import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

// Credentials: prefer STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY env vars (set in Secrets tab),
// then fall back to the Replit connectors proxy.
// WARNING: Never cache the Stripe client — always call getUncachableStripeClient().

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  const envSecret = process.env.STRIPE_SECRET_KEY;
  const envPublishable = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!envSecret?.startsWith("sk_")) {
    throw new Error(
      "Stripe not configured. Add a valid STRIPE_SECRET_KEY (starting with sk_live_ or sk_test_) in the Secrets tab."
    );
  }
  if (!envPublishable) {
    throw new Error(
      "Stripe not configured. Add STRIPE_PUBLISHABLE_KEY in the Secrets tab."
    );
  }

  return { secretKey: envSecret, publishableKey: envPublishable };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as any });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSync(): Promise<StripeSync> {
  const { secretKey } = await getCredentials();
  return new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL!, max: 2 },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
}
