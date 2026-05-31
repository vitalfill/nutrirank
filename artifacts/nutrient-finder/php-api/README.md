# NutriRank — PHP API Files

Upload the contents of this folder to your server at `https://drgily.com/app-api/`.

## Files

| File | Purpose |
|---|---|
| `config.php` | DB credentials + Stripe keys — **edit this first** |
| `db.php` | Shared PDO connection helper |
| `cors.php` | CORS headers (allows the mobile app to call these endpoints) |
| `nutrients.php` | Returns nutrients (strips digit-starting names; renames DHA/EPA/ALA) |
| `food-groups.php` | Returns all food groups from `FD_GROUP` table |
| `search.php` | Runs the nutrient/food-group search with pagination |
| `register-email.php` | Legacy email unlock (kept for backward compat) |
| `create-checkout.php` | Creates a Stripe Checkout session → returns URL |
| `check-subscription.php` | Verifies an active Stripe subscription by email; caches in DB |
| `subscribe-success.php` | Stripe redirect page shown after successful payment |

---

## Setup Steps

### 1. Upload all files
Upload every file in this folder to `https://drgily.com/app-api/`.

### 2. Edit `config.php`
```php
define('STRIPE_SECRET_KEY',      'sk_live_...');   // Your Stripe live secret key
define('STRIPE_PRICE_ID',        'price_...');     // Your $9.99/year recurring price ID
define('REVENUECAT_SECRET_KEY',  'sk_...');        // Your RevenueCat secret key
```

- **Stripe secret key**: Stripe Dashboard → Developers → API keys → Secret key
- **Price ID**: Stripe Dashboard → Products → Create a product → Add a $9.99/year recurring price → copy the `price_xxxxx` ID
- **RevenueCat secret key**: RevenueCat Dashboard → Project → API keys → Secret key (starts with `sk_`). This is used by `search.php` to verify a subscriber's `premium` entitlement server-side before returning premium nutrient results. **Until this is set, all premium nutrient searches will return 403.**

### 3. Test
Open `https://drgily.com/app-api/nutrients.php` in a browser — you should see a JSON list of nutrients.

### 4. Tables auto-created
`check-subscription.php` creates `app_subscriptions` automatically:
```sql
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
2. User enters their email → app calls `create-checkout.php` → Stripe Checkout URL returned
3. Browser opens Stripe's hosted checkout page (secure, no card details in app)
4. After successful payment, Stripe redirects to `subscribe-success.php`
5. User returns to app and taps **Verify Subscription** → app calls `check-subscription.php`
6. If an active Stripe subscription is found, the app unlocks all nutrients

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

### POST /check-subscription.php
```json
{ "email": "user@example.com" }
```
Returns `{ "success": true, "subscribed": true, "expires_at": 1234567890 }`
