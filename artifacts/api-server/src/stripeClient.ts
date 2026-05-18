import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

// Credentials: prefer STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY env vars (set in Secrets tab),
// then fall back to the Replit connectors proxy.
// WARNING: Never cache the Stripe client — always call getUncachableStripeClient().

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  // Primary: environment secrets (works in dev + production)
  // These must start with sk_live_ or sk_test_ to be valid
  const envSecret = process.env.STRIPE_SECRET_KEY;
  const envPublishable = process.env.STRIPE_PUBLISHABLE_KEY;
  if (envSecret?.startsWith("sk_") && envPublishable) {
    return { secretKey: envSecret, publishableKey: envPublishable };
  }

  // Fallback: Replit connectors proxy
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in the Secrets tab."
    );
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Failed to fetch Stripe credentials: ${response.status}`);

  const data = await response.json() as any;
  const settings = data.items?.[0]?.settings;

  if (!settings?.publishable || !settings?.secret) {
    throw new Error(
      "Stripe connection missing keys. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in Secrets."
    );
  }

  return { publishableKey: settings.publishable, secretKey: settings.secret };
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
