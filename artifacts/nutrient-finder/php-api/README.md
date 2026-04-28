# NutrientFinder — PHP API Files

Upload the contents of this folder to your server at `https://drgily.com/app-api/`.

## Files

| File | Purpose |
|---|---|
| `config.php` | Database credentials — **edit this first** |
| `db.php` | Shared PDO connection helper |
| `cors.php` | CORS headers (allows the mobile app to call these endpoints) |
| `nutrients.php` | Returns all nutrients from `NUTR_DEF` table |
| `food-groups.php` | Returns all food groups from `FD_GROUP` table |
| `search.php` | Runs the nutrient/food-group search query with pagination |
| `register-email.php` | Stores user emails in `app_unlocks` table (auto-created) |
| `daily_values.json` | FDA Daily Values reference file — host alongside PHP files |
| `nutrient_roles.json` | Top 3 roles per nutrient for display in the app info box |

## Setup Steps

1. **Upload** all files to `https://drgily.com/app-api/`
2. **Edit `config.php`** if your database credentials ever change
3. **Test** by opening `https://drgily.com/app-api/nutrients.php` in a browser — you should see a JSON list of nutrients
4. The `app_unlocks` table is created automatically on the first email submission

## Email Unlock Table

The `register-email.php` script creates this table automatically:

```sql
CREATE TABLE app_unlocks (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_email (email)
);
```

You can query it anytime in phpMyAdmin to see who has unlocked the app:

```sql
SELECT email, created_at FROM app_unlocks ORDER BY created_at DESC;
```

## API Endpoints

### GET /nutrients.php
Returns all nutrients sorted alphabetically.

### GET /food-groups.php
Returns all food groups sorted alphabetically.

### POST /search.php
Body (JSON):
```json
{
  "nutrient_no": "301",
  "food_groups": ["0900", "1100"],
  "page": 1
}
```

### POST /register-email.php
Body (JSON):
```json
{ "email": "user@example.com" }
```
