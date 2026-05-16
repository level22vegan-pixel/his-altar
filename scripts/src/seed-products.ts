import { getUncachableStripeClient } from "./stripeClient";

async function seedProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log("Checking for existing His Altar subscription product…");

    const existing = await stripe.products.search({
      query: "name:'His Altar Monthly' AND active:'true'",
    });

    if (existing.data.length > 0) {
      const prod = existing.data[0];
      console.log(`Product already exists: ${prod.name} (${prod.id})`);
      const prices = await stripe.prices.list({ product: prod.id, active: true });
      prices.data.forEach(p => {
        console.log(`  Price: $${(p.unit_amount! / 100).toFixed(2)}/${(p.recurring as any)?.interval} — ${p.id}`);
      });
      return;
    }

    console.log("Creating product…");
    const product = await stripe.products.create({
      name: "His Altar Monthly",
      description: "Full platform access — Dbanc, PXP, Altar Reports, Roster, Check-in, and more.",
      metadata: { app: "his-altar", plan: "monthly" },
    });
    console.log(`Created product: ${product.id}`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 999, // $9.99
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log(`Created price: $9.99/month — ${price.id}`);
    console.log("\n✓ Done! Webhooks will sync this to your database.");
    console.log(`\nPrice ID to save: ${price.id}`);
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

seedProducts();
