import { resolve } from "node:path";
import * as dotenv from "dotenv";
import DodoPayments from "dodopayments";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), "..", "env.local") });

const apiKey = process.env.DODO_PAYMENTS_API_KEY;

if (!apiKey) {
  console.error("❌ Missing DODO_PAYMENTS_API_KEY in .env.local");
  process.exit(1);
}

const environment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "test_mode"
    : "live_mode";

const client = new DodoPayments({
  bearerToken: apiKey,
  environment,
});

async function main() {
  console.log("⏳ Creating Attention Clock product in Dodo Payments...");

  try {
    const product = await client.products.create({
      name: "Attention Clock - 60s Screen Time",
      description: "Claim 100% internet share of voice for 60 seconds.",
      tax_category: "digital_products",
      price: {
        type: "one_time_price",
        currency: "USD",
        price: 500,
        discount: 0,
        purchasing_power_parity: false,
      },
    });

    console.log("\n✅ Product Created Successfully!");
    console.log("--------------------------------------------------");
    console.log(`Product Name : ${product.name}`);
    console.log(`Product ID   : ${product.product_id}`);
    console.log("--------------------------------------------------");
    console.log("\n👉 Add this to your .env.local:");
    console.log(`NEXT_PUBLIC_DODO_PRODUCT_ID="${product.product_id}"\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.error("❌ Failed to create product:", message);
    process.exit(1);
  }
}

main();
