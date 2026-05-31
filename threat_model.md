# Threat Model

## Project Overview

This workspace contains a public NutriRank mobile artifact, a minimal Express API mounted at `/api`, and a separate PHP API under `artifacts/nutrient-finder/php-api/` that is intended to be uploaded to `https://drgily.com/app-api/`. The NutriRank client fetches food and nutrient data from that PHP API and uses RevenueCat for native subscriptions, while the PHP API still exposes legacy Stripe verification endpoints that remain production-relevant if deployed. A separate static Expo build server also exists under `artifacts/nutrient-finder/server/` and should be treated as a production web surface when that artifact is deployed.

Per project assumptions, the mockup sandbox is dev-only and is out of scope unless separately shown to be production-reachable. Replit-managed TLS is assumed in production.

## Assets

- **Subscription state and billing metadata** — whether a given email has an active paid subscription, subscription expiry, and Stripe customer/subscription identifiers cached in MySQL. Exposure leaks purchasing behavior and can enable targeted abuse.
- **User email addresses** — collected by the legacy email-unlock path and used by the Stripe verification path. This is personal data and should not be enumerable or unnecessarily exposed.
- **Database credentials and server-side secrets** — MySQL credentials and Stripe secret keys configured for the PHP API. Compromise would allow direct database access or unauthorized payment API calls.
- **Nutrition dataset and API availability** — public food/nutrient data is lower sensitivity, but the service still must resist abuse that can degrade availability or amplify upstream cost against MySQL or Stripe.

## Trust Boundaries

- **Mobile client to PHP API** — all requests from the mobile app to `https://drgily.com/app-api` cross from an untrusted client into public server endpoints. The client cannot be trusted to enforce entitlements, privacy, or request limits.
- **Browser/mobile client to Expo static server** — if `artifacts/nutrient-finder/server/` is deployed, browsers and Expo Go clients reach a public Node server that renders landing-page content and serves static assets based on request metadata.
- **PHP API to MySQL** — the PHP scripts hold direct database credentials. Any server-side injection, secret exposure, or broken authorization can translate into direct database impact.
- **PHP API to Stripe** — `create-checkout.php` and `check-subscription.php` use the Stripe secret key server-side. Public abuse of these endpoints can disclose billing state or consume paid third-party API capacity.
- **Public internet to Express `/api` service** — the Replit deployment exposes `/api`, but the current Express code only serves a health check. This remains low risk unless new routes are added.
- **Internal/dev-only boundary** — `artifacts/mockup-sandbox/`, Expo development paths, and local build scripts are normally out of scope for production findings unless separately deployed.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/nutrient-finder/app/_layout.tsx`, `artifacts/nutrient-finder/app/(tabs)/index.tsx`, `artifacts/nutrient-finder/server/serve.js`, and all scripts in `artifacts/nutrient-finder/php-api/`.
- Highest-risk area: `artifacts/nutrient-finder/php-api/` because it contains public endpoints, database credentials, and payment-related server-to-server calls.
- Public surfaces: `/api/healthz` on the Express service; the landing page/static asset routes served by `artifacts/nutrient-finder/server/serve.js`; and `nutrients.php`, `food-groups.php`, `search.php`, `food-detail.php`, `register-email.php`, `create-checkout.php`, and `check-subscription.php` on the PHP API.
- Dev-only areas to usually ignore: `artifacts/mockup-sandbox/`, Expo/local build scripts, and non-production preview helpers.

## Threat Categories

### Spoofing

The PHP payment and entitlement flows must not trust caller-supplied identifiers as proof of identity. Any endpoint that reveals subscription state or grants paid access based on an email address, RevenueCat app user ID, or similar client-provided identifier must require proof that the caller actually controls that account or holds a server-issued credential bound to it.

### Tampering

Client-side entitlement checks in the mobile app are advisory only. Any paid or identity-sensitive capability implemented through the PHP API must be enforced server-side, with request parameters validated and server-owned data or cryptographically verifiable proof used as the source of truth.

### Information Disclosure

The system handles email addresses, subscription status, expiry timestamps, database connection details, and server-side payment credentials. Public endpoints must not disclose whether arbitrary users are subscribed, and production error responses must not expose raw database internals or secrets.

### Denial of Service

The public PHP API can trigger database queries and, for some paths, live Stripe API requests. Public endpoints must defend against automated abuse with reasonable validation and rate controls so attackers cannot cheaply amplify load or upstream API spend.

### Elevation of Privilege

Direct access to database credentials or payment secrets would let an attacker move outside the intended application boundaries and operate on backend systems directly. Server-side secrets must stay out of source control and out of any deployment surface where untrusted parties can retrieve them.