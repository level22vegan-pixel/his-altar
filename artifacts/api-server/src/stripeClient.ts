import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

// Credentials: prefer STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY env vars (set in Secrets tab),
// then fall back to the Replit connectors proxy.
// WARNING: Never cache the Stripe client — always call getUncachableStripeClient().

async function getConnectorCredentials(): Promise<{ publishableKey: string; secretKey: string } | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) return null;

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", isProduction ? "production" : "development");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as any;
    const settings = data.items?.[0]?.settings;
    if (settings?.secret?.startsWith("sk_") && settings?.publishable) {
      return { secretKey: settings.secret, publishableKey: settings.publishable };
    }
  } catch {
    // ignore
  }
  return null;
}

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  // Try connector first (most up-to-date)
  const connector = await getConnectorCredentials();
  if (connector) return connector;

  // Fallback: environment secrets
  const envSecret = process.env.STRIPE_SECRET_KEY;
  const envPublishable = process.env.STRIPE_PUBLISHABLE_KEY;

  if (envSecret?.startsWith("sk_") && envPublishable) {
    return { secretKey: envSecret, publishableKey: envPublishable };
  }

  throw new Error(
    "Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in the Secrets tab."
  );
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
