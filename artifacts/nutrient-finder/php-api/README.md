# NutriRank — PHP API Files

Upload the contents of this folder to your server at `https://drgily.com/app-api/`.

## Files

| File | Purpose |
|---|---|
| `config.php` | Reads credentials from server env vars — **set env vars before deploying** |
| `db.php` | Shared PDO connection helper |
| `cors.php` | CORS headers (allows the mobile app to call these endpoints) |
| `nutrients.php` | Returns nutrients (strips digit-starting names; renames DHA/EPA/ALA) |
| `food-groups.php` | Returns all food groups from `FD_GROUP` table |
| `search.php` | Runs the nutrient/food-group search with pagination |
| `register-email.php` | Legacy email unlock (kept for backward compat) |
| `create-checkout.php` | Creates a Stripe Checkout session → returns URL; also issues a verify token |
| `check-subscription.php` | Verifies subscription using an email-bound one-time verify token |
| `subscribe-success.php` | Stripe redirect page — surfaces the verify token for the app to capture |

---

## Setup Steps

### 1. Upload all files
Upload every file in this folder to `https://drgily.com/app-api/`.

### 2. Set server environment variables

All credentials are read from environment variables — **never hard-code credentials into `config.php`**.  
Set these in your hosting control panel, `.htaccess` (`SetEnv`), or php-fpm pool config:

| Variable | Description |
|---|---|
| `NUTRIRANK_DB_HOST` | MySQL host (defaults to `localhost` if unset) |
| `NUTRIRANK_DB_NAME` | MySQL database name |
| `NUTRIRANK_DB_USER` | MySQL username |
| `NUTRIRANK_DB_PASS` | MySQL password |
| `NUTRIRANK_STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...`) |
| `NUTRIRANK_STRIPE_PRICE_ID` | Stripe price ID (`price_...`) for the $9.99/year plan |
| `NUTRIRANK_REVENUECAT_SECRET_KEY` | RevenueCat secret key (`sk_...`) |

**Where to get each key:**
- **Stripe secret key**: Stripe Dashboard → Developers → API keys → Secret key
- **Stripe price ID**: Stripe Dashboard → Products → Create a product → Add a $9.99/year recurring price → copy the `price_xxxxx` ID
- **RevenueCat secret key**: RevenueCat Dashboard → Project → API keys → Secret key (starts with `sk_`). Used by `search.php` to verify a subscriber's `premium` entitlement server-side. **Until this is set, all premium nutrient searches will return 403.**

#### Example `.htaccess` snippet
```
SetEnv NUTRIRANK_DB_HOST     localhost
SetEnv NUTRIRANK_DB_NAME     your_db_name
SetEnv NUTRIRANK_DB_USER     your_db_user
SetEnv NUTRIRANK_DB_PASS     your_db_password
SetEnv NUTRIRANK_STRIPE_SECRET_KEY     sk_live_...
SetEnv NUTRIRANK_STRIPE_PRICE_ID       price_...
SetEnv NUTRIRANK_REVENUECAT_SECRET_KEY sk_...
```

> **Important:** If your host serves `.htaccess` files as static content, move credentials to a php-fpm pool config or hosting control panel instead, and block `.htaccess` from being downloaded.

### 3. Test
Open `https://drgily.com/app-api/nutrients.php` in a browser — you should see a JSON list of nutrients.

### 4. Tables auto-created
`create-checkout.php` creates `app_verify_tokens` and `check-subscription.php` creates `app_subscriptions` automatically on first use:
```sql
CREATE TABLE app_verify_tokens (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    token_hash  CHAR(64)     NOT NULL,
    expires_at  DATETIME     NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_token (email, token_hash)
);

CREATE TABLE app_subscriptions (
    email         VARCHAR(255) NOT NULL UNIQUE,
    expires_at    DATETIME     NOT NULL,
    stripe_sub_id VARCHAR(255),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Free vs. Pro Nutrients

These nutrients are always free (no subscription required):

| Nutr_No | Name |
|---|---|
| 208 | Energy (kcal) |
| 203 | Protein |
| 204 | Total lipid (fat) |
| 504 | Histidine |
| 301 | Calcium |
| 306 | Potassium |
| 320 | Vitamin A, RAE |
| 318 | Vitamin A, IU |
| 430 | Vitamin K |
| 629 | EPA (20:5 n-3) |

All other nutrients require the $9.99/year Pro subscription.

---

## Stripe Payment Flow

1. User taps a locked nutrient in the app → Paywall modal appears
2. User enters their email → app calls `create-checkout.php` → receives a Stripe Checkout URL
3. Browser opens Stripe's hosted checkout page (secure, no card details in app)
4. After payment, Stripe redirects to `subscribe-success.php?token=TOKEN&email=EMAIL`
5. That page surfaces a deep link (`nutrirank://verify?token=TOKEN&email=EMAIL`) — the app captures the token on resume
6. App calls `check-subscription.php` with `{ "email": "...", "verify_token": "..." }` to unlock all nutrients

> **How token security works:** `create-checkout.php` generates a random 32-byte hex token per checkout, stores only its SHA-256 hash in the DB, and embeds the plain token in the Stripe success redirect URL. Only the party who completes payment sees that URL. `check-subscription.php` accepts only `{ email, verify_token }` — it hashes the provided token and compares against the stored hash. Tokens expire after 48 hours and are one-time use; once consumed they cannot be replayed. No static shared secret is needed in the app.

---

## API Endpoints

### GET /nutrients.php
Returns filtered & renamed nutrients sorted alphabetically.

### GET /food-groups.php
Returns all food groups.

### POST /search.php
```json
{ "nutrient_no": "301", "food_groups": ["0900", "1100"], "page": 1, "rc_app_user_id": "<RevenueCat appUserID>" }
```
Free nutrients (`is_free: true` in the nutrients list) do not require `rc_app_user_id`.
Premium nutrients return **403** if `rc_app_user_id` is missing or does not have an active `premium` entitlement in RevenueCat.

### POST /create-checkout.php
```json
{ "email": "user@example.com" }
```
Returns `{ "success": true, "url": "https://checkout.stripe.com/..." }`  
Also stores a one-time verify token in the DB and embeds it in the Stripe success redirect URL.

### POST /check-subscription.php
```json
{ "email": "user@example.com", "verify_token": "<token from subscribe-success.php>" }
```
Returns `{ "success": true, "subscribed": true }` or `{ "success": true, "subscribed": false }`  
Returns `400` if email or verify_token is missing.  
Returns `403` if the token is invalid, expired, or already used.
