import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProducts,
  createProduct,
  attachProductsToEntitlement,
  attachProductsToPackage,
  detachProductsFromEntitlement,
  detachProductsFromPackage,
} from "@replit/revenuecat-sdk";

const PROJECT_ID    = "proja65927b7";
const TEST_APP_ID   = "app0e83153dbc";
const OFFERING_ID   = "ofrng012f124094";
const ENTITLEMENT_ID = "entl677de1ae4d";
const OLD_ANNUAL_799_ID = "prod2556774d89"; // nutrirank_pro_annual_799 — wrong price

const PACKAGES = [
  { id: "pkge3191d3a2bf", label: "Yearly",   ident: "nutrirank_pro_annual_1999",   title: "NutriRank Pro — Annual",   type: "subscription" as const, duration: "P1Y",  priceMicros: 19990000 },
  { id: "pkgecfbe733ab2", label: "Monthly",  ident: "nutrirank_pro_monthly_299",   title: "NutriRank Pro — Monthly",  type: "subscription" as const, duration: "P1M",  priceMicros: 2990000  },
  { id: "pkgee7e18eeab4", label: "Lifetime", ident: "nutrirank_pro_lifetime_3999", title: "NutriRank Pro — Lifetime", type: "non_consumable" as const, duration: null,  priceMicros: 39990000 },
];

type PricesResponse = { object: string; prices: { amount_micros: number; currency: string }[] };

async function main() {
  const client = await getUncachableRevenueCatClient();

  // 1. List existing products so we can skip re-creation
  console.log("Fetching existing products...");
  const { data: existing, error: listErr } = await listProducts({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 100 },
  });
  if (listErr) { console.error("Failed to list products:", listErr); process.exit(1); }

  const createdProducts: { pkg: typeof PACKAGES[0]; id: string }[] = [];

  for (const pkg of PACKAGES) {
    let prodId: string | undefined = existing.items
      ?.find((p: any) => p.store_identifier === pkg.ident && p.app_id === TEST_APP_ID)
      ?.id;

    if (prodId) {
      console.log(`  [${pkg.label}] product already exists: ${prodId}`);
    } else {
      const body: any = {
        store_identifier: pkg.ident,
        app_id: TEST_APP_ID,
        type: pkg.type,
        display_name: pkg.title,
        title: pkg.title,
      };
      if (pkg.duration) body.subscription = { duration: pkg.duration };

      const { data: created, error: createErr } = await createProduct({
        client,
        path: { project_id: PROJECT_ID },
        body,
      });
      if (createErr) { console.error(`  [${pkg.label}] failed to create:`, createErr); process.exit(1); }
      prodId = created.id;
      console.log(`  [${pkg.label}] created product: ${prodId}`);

      // Set test store price
      const { data: _pd, error: priceErr } = await client.post<PricesResponse>({
        url: "/projects/{project_id}/products/{product_id}/test_store_prices",
        path: { project_id: PROJECT_ID, product_id: prodId },
        body: { prices: [{ amount_micros: pkg.priceMicros, currency: "USD" }] },
      });
      if (priceErr && (priceErr as any)?.type !== "resource_already_exists") {
        console.error(`  [${pkg.label}] price error:`, priceErr);
      } else {
        console.log(`  [${pkg.label}] price set: $${(pkg.priceMicros / 1_000_000).toFixed(2)}`);
      }
    }

    createdProducts.push({ pkg, id: prodId });
  }

  // 2. Detach old $7.99 annual from package and entitlement
  console.log("\nDetaching old $7.99 product...");
  const { error: detPkgErr } = await detachProductsFromPackage({
    client,
    path: { project_id: PROJECT_ID, offering_id: OFFERING_ID, package_id: "pkge3191d3a2bf" },
    body: { product_ids: [OLD_ANNUAL_799_ID] },
  });
  if (detPkgErr) console.log("  detach from package (may already be absent):", (detPkgErr as any)?.message);
  else console.log("  detached from yearly package ✓");

  const { error: detEntErr } = await detachProductsFromEntitlement({
    client,
    path: { project_id: PROJECT_ID, entitlement_id: ENTITLEMENT_ID },
    body: { product_ids: [OLD_ANNUAL_799_ID] },
  });
  if (detEntErr) console.log("  detach from entitlement (may already be absent):", (detEntErr as any)?.message);
  else console.log("  detached from entitlement ✓");

  // 3. Attach new products to their packages
  console.log("\nAttaching new products to packages...");
  for (const { pkg, id } of createdProducts) {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: PROJECT_ID, offering_id: OFFERING_ID, package_id: pkg.id },
      body: { products: [{ product_id: id, eligibility_criteria: "all" }] },
    });
    if (error && (error as any)?.type !== "unprocessable_entity_error") {
      console.error(`  [${pkg.label}] attach to package failed:`, error);
    } else {
      console.log(`  [${pkg.label}] attached to package ✓`);
    }
  }

  // 4. Attach all new products to entitlement
  console.log("\nAttaching new products to entitlement...");
  const { error: entErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: PROJECT_ID, entitlement_id: ENTITLEMENT_ID },
    body: { product_ids: createdProducts.map(p => p.id) },
  });
  if (entErr && (entErr as any)?.type !== "unprocessable_entity_error") {
    console.error("  attach to entitlement failed:", entErr);
  } else {
    console.log("  all products attached to entitlement ✓");
  }

  console.log("\n=== Done ===");
  console.log("Annual  → $19.99/yr  (nutrirank_pro_annual_1999)");
  console.log("Monthly → $2.99/mo   (nutrirank_pro_monthly_299)");
  console.log("Lifetime → $39.99    (nutrirank_pro_lifetime_3999)");
}

main().catch(console.error);
