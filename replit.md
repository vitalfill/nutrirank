# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a mobile app (NutriRank) and an Express API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (api-server); MySQL on drgily.com (mobile app)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### NutriRank (Expo Mobile App)
- **Location**: `artifacts/nutrient-finder/`
- **App name**: NutriRank
- **Purpose**: FDA food database nutrient ranking tool — ranks foods richest in any nutrient per 100 g
- **Backend**: PHP API files in `artifacts/nutrient-finder/php-api/` — upload to `https://drgily.com/app-api/`

### Features
- **Nutrient picker**: searchable modal; strips digit-starting nutrient names; DHA/EPA/ALA shown with common names; lock icon on premium nutrients
- **Food group picker**: 2-row layout — Row 1: Select All / All Plants / All Animal quick buttons; Row 2: individual groups on horizontal scroll
- **Results**: ranked per 100 g, star to favorite, serving size selector, % DV bar
- **Nutrient info box**: shows top 3 body roles + DV for selected nutrient
- **How-to modal**: 5-step guide + DV explanation + 100 g baseline note
- **Favorites**: save food + nutrient combos, revisit from star icon in header
- **Paywall**: Free nutrients: Energy(kcal), Protein, Fat, Histidine, Calcium, Potassium, Vitamin A, Vitamin K, EPA. All others require $9.99/yr Stripe subscription
- **Stripe flow**: email → create-checkout.php → Stripe Checkout → verify via check-subscription.php

### Free Nutrient IDs (no subscription needed)
`208, 203, 204, 504, 301, 306, 320, 318, 430, 629`

### AsyncStorage keys
- `nutrirank_subscription` — `{ email, expiresAt }` (Unix timestamp)
- `nutrirank_favorites` — `Favorite[]` JSON array

### PHP API Files (upload to drgily.com/app-api/)
- `config.php` — DB credentials + Stripe keys (STRIPE_SECRET_KEY, STRIPE_PRICE_ID)
- `nutrients.php` — filters digit-starting names, renames DHA/EPA/ALA
- `create-checkout.php` — creates Stripe Checkout session
- `check-subscription.php` — verifies active subscription + caches in `app_subscriptions` DB table
- `subscribe-success.php` — Stripe success redirect page
- See `php-api/README.md` for full setup instructions

### API Server
- **Location**: `artifacts/api-server/`
- **Paths**: `/api`

### Canvas (Mockup Sandbox)
- **Location**: `artifacts/mockup-sandbox/`
- **Paths**: `/__mockup`

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
