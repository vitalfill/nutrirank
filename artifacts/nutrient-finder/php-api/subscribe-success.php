<?php
// Stripe redirects here after successful checkout.
// Just shows a friendly page — the app verifies via check-subscription.php.
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Subscribed! – NutriRank</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #F5FAF5; color: #1B2B1B;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #fff; border-radius: 20px; padding: 40px 32px; text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,.08); max-width: 380px; width: 90%; }
  .icon { font-size: 56px; margin-bottom: 16px; }
  h1 { color: #2D6A4F; font-size: 24px; margin: 0 0 10px; }
  p  { color: #6B8F6B; line-height: 1.6; margin: 0 0 24px; }
  .back { background: #2D6A4F; color: #fff; border: none; border-radius: 12px;
          padding: 14px 28px; font-size: 16px; cursor: pointer; text-decoration: none;
          display: inline-block; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">🌿</div>
  <h1>You're subscribed!</h1>
  <p>Thank you for subscribing to NutriRank. Return to the app and tap <strong>Verify Subscription</strong> to unlock all nutrients.</p>
  <a class="back" href="javascript:window.close()">Close &amp; return to app</a>
</div>
</body>
</html>
