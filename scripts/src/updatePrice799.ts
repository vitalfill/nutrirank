import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  createProduct,
  deleteProduct,
  attachProductsToEntitlement,
  detachProductsFromEntitlement,
  attachProductsToPackage,
  detachProductsFromPackage,
  getProductsFromPackage,
  getProductsFromEntitlement,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;
const TEST_STORE_APP_ID = process.env.REVENUECAT_TEST_STORE_APP_ID!;
const ENTITLEMENT_ID = "entl677de1ae4d"; // "premium"
const PACKAGE_ID = "pkge3191d3a2bf";   // "$rc_annual"

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function main() {
  const client = await getUncachableRevenueCatClient();

  // 1. Find current products attached to the package and entitlement
  console.log("Fetching current package products...");
  const { data: pkgProds, error: pkgErr } = await getProductsFromPackage({
    client,
    path: { project_id: PROJECT_ID, offering_id: "ofrng012f124094", package_id: PACKAGE_ID },
  });
  if (pkgErr) { console.error("Failed to get package products:", pkgErr); process.exit(1); }
  console.log("Current package products:", JSON.stringify(pkgProds, null, 2));

  const { data: entProds, error: entErr } = await getProductsFromEntitlement({
    client,
    path: { project_id: PROJECT_ID, entitlement_id: ENTITLEMENT_ID },
  });
  if (entErr) { console.error("Failed to get entitlement products:", entErr); process.exit(1); }
  console.log("Current entitlement products:", JSON.stringify(entProds, null, 2));

  // 2. Find or create new test-store product at $7.99
  console.log("\nFinding or creating new test-store product at $7.99...");
  const { data: allProducts, error: listErr } = await (await import("@replit/revenuecat-sdk")).listProducts({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 50 },
  });
  if (listErr) { console.error("Failed to list products:", listErr); process.exit(1); }

  let newProduct = (allProducts.items as any[]).find(
    (p: any) => p.store_identifier === "nutrirank_pro_annual_799" && p.app_id === TEST_STORE_APP_ID
  );

  if (newProduct) {
    console.log("Found existing new product:", newProduct.id);
  } else {
    const { data: created, error: createErr } = await createProduct({
      client,
      path: { project_id: PROJECT_ID },
      body: {
        store_identifier: "nutrirank_pro_annual_799",
        app_id: TEST_STORE_APP_ID,
        type: "subscription",
        display_name: "NutriRank Pro Annual",
        subscription: { duration: "P1Y" },
        title: "NutriRank Pro — Annual",
      },
    });
    if (createErr) { console.error("Failed to create product:", createErr); process.exit(1); }
    newProduct = created;
    console.log("Created new product:", newProduct.id);
  }

  // 3. Set price to $7.99 (safe to call even if already set)
  console.log("Setting price to $7.99...");
  const { data: priceData, error: priceErr } = await client.post<TestStorePricesResponse>({
    url: "/projects/{project_id}/products/{product_id}/test_store_prices",
    path: { project_id: PROJECT_ID, product_id: newProduct.id },
    body: {
      prices: [
        { amount_micros: 7990000, currency: "USD" },
        { amount_micros: 7990000, currency: "EUR" },
      ],
    },
  });
  if (priceErr && (priceErr as any)?.type !== "resource_already_exists") {
    console.error("Failed to set price:", priceErr); process.exit(1);
  }
  console.log("Price set:", priceData ?? "(already existed)");

  // 4. Detach old test-store products from package FIRST, then attach new one
  // Old test-store products: "Yearly" (prod2e393a5f2a) is the one in the package
  const oldTestStoreProductIds = [
    "prod2e393a5f2a", // "Yearly" - currently in package
    "prodc642c14e1f", // "NutriRank Premium Annual" - in entitlement
  ];

  for (const oldId of oldTestStoreProductIds) {
    console.log(`\nDetaching old product ${oldId} from package...`);
    const { error: detPkgErr } = await detachProductsFromPackage({
      client,
      path: { project_id: PROJECT_ID, offering_id: "ofrng012f124094", package_id: PACKAGE_ID },
      body: { product_ids: [oldId] },
    });
    if (detPkgErr) console.warn(`  Note - detach from package: ${JSON.stringify(detPkgErr)}`);
    else console.log("  Detached from package.");

    console.log(`Detaching old product ${oldId} from entitlement...`);
    const { error: detEntErr } = await detachProductsFromEntitlement({
      client,
      path: { project_id: PROJECT_ID, entitlement_id: ENTITLEMENT_ID },
      body: { product_ids: [oldId] },
    });
    if (detEntErr) console.warn(`  Note - detach from entitlement: ${JSON.stringify(detEntErr)}`);
    else console.log("  Detached from entitlement.");
  }

  // 5. Now attach new product to package and entitlement
  console.log("\nAttaching new product to package...");
  const { error: attachPkgErr } = await attachProductsToPackage({
    client,
    path: { project_id: PROJECT_ID, offering_id: "ofrng012f124094", package_id: PACKAGE_ID },
    body: { products: [{ product_id: newProduct.id, eligibility_criteria: "all" }] },
  });
  if (attachPkgErr) { console.error("Failed to attach to package:", attachPkgErr); process.exit(1); }
  console.log("Attached to package.");

  console.log("Attaching new product to entitlement...");
  const { error: attachEntErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: PROJECT_ID, entitlement_id: ENTITLEMENT_ID },
    body: { product_ids: [newProduct.id] },
  });
  if (attachEntErr) { console.error("Failed to attach to entitlement:", attachEntErr); process.exit(1); }
  console.log("Attached to entitlement.");

  // 6. Delete old test-store products entirely
  for (const oldId of oldTestStoreProductIds) {
    console.log(`\nDeleting old product ${oldId}...`);
    const { error: delErr } = await deleteProduct({
      client,
      path: { project_id: PROJECT_ID, product_id: oldId },
    });
    if (delErr) console.warn(`  Note - delete: ${JSON.stringify(delErr)}`);
    else console.log("  Deleted.");
  }

  console.log("\nDone! New $7.99/year product is live in the test store.");
}

main().catch(console.error);
