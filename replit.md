# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a mobile app (NutrientFinder) and an Express API server.

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

### NutrientFinder (Expo Mobile App)
- **Location**: `artifacts/nutrient-finder/`
- **Purpose**: FDA food database nutrient lookup tool; replicates functionality of drgily.com/top-foods-by-nutrient-new.php
- **Backend**: PHP API files in `artifacts/nutrient-finder/php-api/` — must be uploaded to `https://drgily.com/app-api/`
- **Features**:
  - Nutrient picker (searchable modal, pulls from drgily.com MySQL DB)
  - Food group multi-select (includes "All Plants" and "All Animal" shortcuts)
  - Auto-search with debounce (no search button needed)
  - Results with serving size adjustment (updates % DV and amount)
  - Daily Value % bar per result
  - Nutrient info box (top 3 body roles per nutrient)
  - Freemium email gate after 2 free pages (emails stored in `app_unlocks` DB table)
  - Green color palette throughout

### API Server
- **Location**: `artifacts/api-server/`
- **Paths**: `/api`

### Canvas (Mockup Sandbox)
- **Location**: `artifacts/mockup-sandbox/`
- **Paths**: `/__mockup`

## PHP API Files (upload to drgily.com)

Upload `artifacts/nutrient-finder/php-api/` contents to `https://drgily.com/app-api/`:
- `config.php` — DB credentials
- `db.php` — PDO connection helper
- `cors.php` — CORS headers for mobile app access
- `nutrients.php` — GET list of all nutrients
- `food-groups.php` — GET list of food groups
- `search.php` — POST search with pagination
- `register-email.php` — POST email unlock registration
- `daily_values.json` — FDA daily values reference
- `nutrient_roles.json` — Top 3 nutrient roles reference
- `README.md` — Setup instructions

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
