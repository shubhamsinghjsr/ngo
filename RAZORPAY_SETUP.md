# Razorpay setup — Test Mode first

Razorpay is integrated alongside the existing QR/bank-transfer proof form. Online payment stays unavailable until private server keys are configured. No API secrets are included in public HTML, JavaScript, SQL or source control.

## 1. Add server credentials

The configuration file is **C:/xampp/ngo-private/config.php**, outside htdocs. Blank Razorpay settings were added while preserving existing database credentials. Add your own Razorpay Test Mode key ID and key secret:

```php
'RAZORPAY_ENABLED' => '1',
'RAZORPAY_MODE' => 'test',
'RAZORPAY_TEST_KEY_ID' => 'REPLACE_WITH_YOUR_TEST_KEY_ID',
'RAZORPAY_TEST_KEY_SECRET' => 'REPLACE_WITH_YOUR_TEST_KEY_SECRET',
'RAZORPAY_TEST_WEBHOOK_SECRET' => 'REPLACE_WITH_YOUR_OWN_TEST_WEBHOOK_SECRET',
'RAZORPAY_LIVE_KEY_ID' => '',
'RAZORPAY_LIVE_KEY_SECRET' => '',
'RAZORPAY_LIVE_WEBHOOK_SECRET' => '',
```

These keys may also be supplied as server environment variables (which override the private PHP file). Generate Test Mode credentials in the Razorpay Dashboard API Keys settings. The actual test key ID begins with rzp_test_. No test or live keys have been supplied in this project.

The Checkout key ID is a public identifier and is returned only when needed by Checkout; the key secret and webhook secret never leave PHP. Do not put secrets in assets/js/config.js. PHP cURL and an up-to-date TLS CA certificate store are required. Do not disable certificate verification to fix connection errors.

## 2. Payment capture and test checkout

Enable automatic payment capture in the Razorpay Dashboard. An authorized payment is not treated as Paid until captured and confirmed through the provider API.

Open http://localhost/ngo/donate.html, enter donor details and a whole-rupee amount, choose **Pay Online with Razorpay**, accept the consent notice and submit. Test Mode is clearly labelled. Use Razorpay's official test payment details and test both success and failure/cancellation.

Online order creation is server-side. The server stores donor details, INR amount, expected amount in paise, mode and Razorpay order ID. Verification uses the server-stored order ID to calculate the Checkout HMAC signature. The provider payment and order are fetched to confirm ID, captured status, amount, amount paid and INR currency before updating Paid. Forged browser callbacks cannot mark a donation paid.

Test payments are labelled TEST PAYMENT in Admin Donations and excluded from the dashboard's real verified donation amount. Payment/order details are read-only to admins; QR/bank transfer reviews retain the existing Verified/Rejected controls.

## 3. Signed webhook recovery

For browser-close/network recovery, configure the Razorpay webhook to subscribe to payment.captured and order.paid. Use the same separate webhook secret you set for the corresponding mode.

- Test webhook: https://YOUR_PUBLIC_HOST/ngo/api/razorpay-webhook.php?mode=test
- Live webhook: https://YOUR_PUBLIC_HOST/ngo/api/razorpay-webhook.php?mode=live

Razorpay cannot call a localhost URL. For local webhook testing, use a secure HTTPS development tunnel to your local PHP site or a test deployment. Test and live webhook secrets should be separate from API secrets and from each other.

The webhook verifies the HMAC over the unmodified request body and rechecks the provider payment/order before confirming Paid. Replays are safe. A late captured payment can confirm a donation whose Checkout was previously closed; failed/cancelled browser events cannot downgrade an already-Paid record.

If a donor was debited but confirmation is pending, ask them to contact the Trust with their order ID rather than pay again. Investigate failed/pending records and webhook delivery in the Razorpay Dashboard. A failed request or a closed Checkout is never shown as payment success.

## 4. Switch to Live Mode only after sandbox checks

Add your actual Live Mode API key ID/secret and live webhook secret in the same private config (or environment), configure the live webhook and capture settings, enable HTTPS, then set:

```php
'RAZORPAY_MODE' => 'live',
```

The live key ID must begin with rzp_live_. Test keys cannot be used in Live Mode. Keep mode-specific credentials available for old pending orders during a transition; verification uses the mode saved with each order. Set RAZORPAY_ENABLED to 0 to disable online checkout. This does not disable QR/bank transfer submissions.

## Schema and files

Migration migrations/004_razorpay.sql has already been applied locally and is included in database/schema.sql. It adds nullable gateway fields and expands the paid-state constraint to accept confirmed Razorpay payments while preserving manual transfer verification. Existing donor/gallery/application data is not replaced or deleted.

- backend/razorpay.php: private key loading, authenticated TLS API requests, HMAC and captured-payment confirmation.
- api/razorpay.php: order creation, callback verification, checkout events and owner-protected status.
- api/razorpay-webhook.php: signed webhook reconciliation.
- assets/js/razorpay.js: method selector and dynamically loaded official Checkout.
- donate.html / assets/js/backend.js: existing form integration.
- admin/records.php: method/mode, order/payment IDs and server-controlled online payment status.

## Validation and limits

The regression/browser suite passed 193 checks, including both payment-option layouts on mobile/tablet/desktop and existing QR/admin functionality. The isolated provider simulator passed 36 checks covering CSRF, ownership, idempotent creation/verification, forged signatures, order/amount/currency mismatch, authorized-versus-captured state, webhook signatures/replays, cancelled/failed/late-captured payments, error redaction and admin restrictions. It creates no real provider transaction. Run node tests/razorpay.mjs to repeat it.

The simulator's local API transport is restricted to PHP's CLI development server, explicit test-mode settings and 127.0.0.1; Apache and Live Mode always use the official HTTPS API. No fake payment adapter is activated in the public site.

An actual Razorpay Test Mode checkout still requires your account's real test keys. Refunds, partial payments and receipt/tax-document generation are outside this integration.

Official references:
- [Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Create an order](https://razorpay.com/docs/api/orders/create/)
- [Fetch a payment](https://razorpay.com/docs/api/payments/fetch-with-id/)
- [Validate webhooks](https://razorpay.com/docs/webhooks/validate-test/)
