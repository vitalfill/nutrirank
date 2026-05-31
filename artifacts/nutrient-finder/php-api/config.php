<?php
// ─── Database ────────────────────────────────────────────────────────────────
// Set these as environment variables on your server (e.g. via .htaccess SetEnv,
// php-fpm pool env[], or your hosting control panel).  Never hard-code credentials
// in this file.
define('DB_HOST',    getenv('NUTRIRANK_DB_HOST')    ?: 'localhost');
define('DB_NAME',    getenv('NUTRIRANK_DB_NAME')    ?: '');
define('DB_USER',    getenv('NUTRIRANK_DB_USER')    ?: '');
define('DB_PASS',    getenv('NUTRIRANK_DB_PASS')    ?: '');
define('DB_CHARSET', 'utf8');

// ─── Stripe ──────────────────────────────────────────────────────────────────
// Get these from your Stripe Dashboard → Developers → API keys
define('STRIPE_SECRET_KEY', getenv('NUTRIRANK_STRIPE_SECRET_KEY') ?: '');  // sk_live_...
define('STRIPE_PRICE_ID',   getenv('NUTRIRANK_STRIPE_PRICE_ID')   ?: '');  // price_...

// ─── RevenueCat ──────────────────────────────────────────────────────────────
// RevenueCat Dashboard → Project → API keys → Secret key (starts with sk_...)
// Used server-side to verify that a subscriber has an active "premium" entitlement
// before serving premium nutrient search results.
define('REVENUECAT_SECRET_KEY', getenv('NUTRIRANK_REVENUECAT_SECRET_KEY') ?: '');

// ─── API access secret ────────────────────────────────────────────────────────
// Callers must send this value in the X-Api-Key request header to access
// sensitive endpoints (e.g. check-subscription.php).  Generate a random string
// (e.g. openssl rand -hex 32) and set it as an environment variable.
// If this variable is unset or empty, check-subscription.php returns 503
// (fail-closed) rather than allowing unauthenticated access.
define('API_SECRET_KEY', getenv('NUTRIRANK_API_SECRET_KEY') ?: '');

// ─── App base URL ─────────────────────────────────────────────────────────────
// URL of this api folder (no trailing slash)
define('APP_BASE_URL', 'https://drgily.com/app-api');
