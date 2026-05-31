import { getUncachableRevenueCatClient } from "./revenueCatClient";
import { listProducts, listOfferings, listPackages, listEntitlements } from "@replit/revenuecat-sdk";

async function check() {
  const client = await getUncachableRevenueCatClient();
  const projectId = process.env.REVENUECAT_PROJECT_ID!;

  const { data: products, error: pe } = await listProducts({ client, path: { project_id: projectId }, query: { limit: 50 } });
  if (pe) { console.error("products error:", pe); return; }
  console.log("=== PRODUCTS ===");
  console.log(JSON.stringify(products.items.map((p: any) => ({ id: p.id, display_name: p.display_name, store_identifier: p.store_identifier, app_id: p.app_id, created_at: p.created_at })), null, 2));

  const { data: offerings, error: oe } = await listOfferings({ client, path: { project_id: projectId }, query: { limit: 20 } });
  if (oe) { console.error("offerings error:", oe); return; }
  console.log("\n=== OFFERINGS ===");
  console.log(JSON.stringify(offerings.items.map((o: any) => ({ id: o.id, lookup_key: o.lookup_key, is_current: o.is_current })), null, 2));

  for (const offering of offerings.items as any[]) {
    const { data: pkgs, error: pke } = await listPackages({ client, path: { project_id: projectId, offering_id: offering.id }, query: { limit: 20 } });
    if (pke) { console.error("packages error:", pke); continue; }
    console.log(`\n=== PACKAGES for offering ${offering.lookup_key} ===`);
    console.log(JSON.stringify(pkgs.items.map((pkg: any) => ({ id: pkg.id, lookup_key: pkg.lookup_key, products: pkg.products })), null, 2));
  }

  const { data: entitlements, error: ee } = await listEntitlements({ client, path: { project_id: projectId }, query: { limit: 20 } });
  if (ee) { console.error("entitlements error:", ee); return; }
  console.log("\n=== ENTITLEMENTS ===");
  console.log(JSON.stringify(entitlements.items.map((e: any) => ({ id: e.id, lookup_key: e.lookup_key, products: e.products })), null, 2));
}

check().catch(console.error);
