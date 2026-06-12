<?php
// Returns a server-generated random nonce that the mobile client must:
//  1. Store locally (for use in the claim step below).
//  2. Set as a RevenueCat subscriber attribute via Purchases.setAttributes()
//     BEFORE calling Purchases.restorePurchases().
//
// When restorePurchases() fires a RevenueCat server-to-server webhook, RC includes the
// subscriber's current attributes in the event payload (event.subscriber_attributes).
// rc-webhook.php reads the nonce from that payload and stores it alongside the
// transaction_id in rc_webhook_claims.
//
// The mobile client then calls register-subscription.php with { restore_nonce }.
// The server looks up the webhook claim that contains that exact nonce and issues a
// server-generated device credential.
//
// Why this prevents rc_app_user_id sharing:
//   Writing a subscriber attribute (e.g. restore_nonce) to a RevenueCat account requires
//   running the RC SDK under that user's app_user_id context.  An attacker who knows a
//   subscriber's rc_app_user_id cannot set attributes on that account — the SDK will set
//   attributes on their own (different) account.  Therefore the nonce in the webhook
//   payload is guaranteed to have been written by the device that controls the account,
//   not by a third party who merely learned the user ID.
//
// The nonce is not a secret in isolation (any caller can get one).  Its security comes
// from the trusted RC webhook delivery path that binds it to the subscriber's account.

require_once __DIR__ . '/cors.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST required']);
    exit;
}

// 64 hex chars = 256 bits of entropy.  Large enough that two clients cannot
// guess each other's nonce during a narrow time window.
$nonce = bin2hex(random_bytes(32));
echo json_encode(['nonce' => $nonce]);
