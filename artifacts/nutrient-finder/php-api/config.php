<?php
// ─── Database ────────────────────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'drgilyco_foods');
define('DB_USER', 'drgilyco_gily05');
define('DB_PASS', 'lacra77MDB');
define('DB_CHARSET', 'utf8');

// ─── Stripe ──────────────────────────────────────────────────────────────────
// Get these from your Stripe Dashboard → Developers → API keys
define('STRIPE_SECRET_KEY', 'sk_live_...');  // ← replace with your live secret key

// Create a product + price in Stripe Dashboard ($9.99/year recurring),
// then paste the price ID here (starts with price_)
define('STRIPE_PRICE_ID', 'price_...');      // ← replace

// ─── RevenueCat ──────────────────────────────────────────────────────────────
// RevenueCat Dashboard → Project → API keys → Secret key (starts with sk_...)
// Used server-side to verify that a subscriber has an active "premium" entitlement
// before serving premium nutrient search results.
define('REVENUECAT_SECRET_KEY', 'sk_...');   // ← replace with your RevenueCat secret key

// URL of this api folder (no trailing slash)
define('APP_BASE_URL', 'https://drgily.com/app-api');
