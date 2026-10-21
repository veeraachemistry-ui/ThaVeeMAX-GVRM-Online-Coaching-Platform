# GVRM CLOUD LMS Payments API (Razorpay Subscriptions)

This is a backend integration scaffold for monthly recurring subscriptions: Teacher ₹499, Institution ₹999, Coaching Centre ₹1,999. It uses Razorpay Subscriptions, PostgreSQL, server-side checkout creation, checkout signature verification, and signed webhooks.

## Before use
- Create a Razorpay account and configure three **monthly recurring plans** in the Razorpay Dashboard: INR 499, INR 999 and INR 1999. Copy their `plan_...` IDs.
- Create a managed PostgreSQL database.
- Copy `.env.example` to `.env` and fill all secrets/IDs. Never put `RAZORPAY_KEY_SECRET` or webhook secret in frontend/desktop files or GitHub.
- Configure a Razorpay webhook URL `https://YOUR_API_HOST/api/payments/webhook` and subscribe to subscription events such as `subscription.activated`, `subscription.authenticated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `subscription.paused`, `subscription.resumed`. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`.
- Use Razorpay test mode first. Test successful, failed, cancelled and recurring renewal cases before switching to live mode.

## Run locally
Node.js 20+, PostgreSQL required.

```bash
cd cloud-api
npm install
cp .env.example .env
# edit .env with real test credentials and DB URL
npm start
```

Health check: `GET /api/health`. The API creates the `lms_subscriptions` table on startup.

## API
- `GET /api/plans` - monthly price list
- `POST /api/subscriptions` JSON `{ "planKey":"teacher|institution|coaching", "email":"user@example.com" }` - creates a Razorpay subscription server-side
- `POST /api/subscriptions/verify` - verifies checkout signature; final active state is driven by signed webhooks
- `POST /api/payments/webhook` - validates `x-razorpay-signature` over the raw body and updates subscription state
- `GET /api/subscriptions/status?email=...` - status lookup

## Important production requirements
This scaffold is **not production-ready by itself**. Before accepting live payments, add proper user authentication and authorization to all subscription endpoints, institution/user ownership checks, rate limiting, audit logs, webhook event idempotency storage, cancellation/refund/customer support workflows, privacy/retention controls, database migrations/backups, monitoring and HTTPS. The status endpoint currently uses email as a lookup key and MUST be protected by real authentication before public deployment. Validate current Razorpay API requirements and legal/tax requirements for your business. Do not use live keys until the complete flow is security-reviewed.


## Manual UPI QR payment requests (admin review required)

The desktop subscription page includes the supplied `assets/gvrm-upi-qr.png`. Users choose a plan, pay the displayed amount in their UPI app, and submit their email plus UTR/reference number. The API records the request as `pending`; submitting a UTR is **not proof of payment** and does not activate a subscription.

Configure `ADMIN_REVIEW_TOKEN` as a long random secret (32+ characters) in the cloud host environment. Never put this token in frontend code or a public repository.

Admin review API:
- `GET /api/admin/upi-payment-requests` with header `x-admin-review-token: <ADMIN_REVIEW_TOKEN>`
- `POST /api/admin/upi-payment-requests/:id/review` with the same header and JSON `{"decision":"approved","reviewer":"GVRM Admin"}` or `{"decision":"rejected"}`

Before approving, independently verify the UTR, amount, date and payee in the bank/UPI merchant app. Duplicate UTRs are rejected. These endpoints are protected by the review token, but for production you should replace the shared token with authenticated, role-based admin accounts and rate limiting. Approval records a manual review decision; it does not by itself grant app access. Connect the approved status to a server-side authenticated entitlement/subscription check before using paid features.


## Private activation keys (added)
After an admin verifies the UPI payment, approving the request through `POST /api/admin/upi-payment-requests/:id/review` with `{"decision":"approved"}` generates a private activation key. The plaintext key is returned only in that one authorized response; the database stores only its SHA-256 hash. Deliver the key privately to the customer's registered email. Default approval key validity is one month.

Admin endpoints (all require `x-admin-review-token`):
- `POST /api/admin/activation-keys` JSON `{ "email":"teacher@example.com", "planKey":"teacher|institution|coaching", "months":1, "issuedBy":"GVRM Admin" }` creates a key manually after independently confirming payment. `months` is 1-36.
- `GET /api/admin/activation-keys` lists metadata only (never the full key).
- `POST /api/admin/activation-keys/:id/revoke` revokes an active key.
- `POST /api/activation/verify` JSON `{ "activationKey":"GVRM-...", "email":"teacher@example.com", "planKey":"teacher" }` checks key, email, plan, status and expiry.

Keep `ADMIN_REVIEW_TOKEN` private. Activation-key verification is a server endpoint; production paid-feature access must be enforced by authenticated backend routes, not by a client-only check. Keys are bearer secrets—send them privately and do not post them in public GitHub issues or commits.
