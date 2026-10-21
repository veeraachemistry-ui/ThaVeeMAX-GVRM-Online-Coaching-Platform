# G.V.R.M. CLOUD LMS — Consolidated GitHub Source

This ZIP consolidates the colourful Electron desktop UI, supplied G.V.R.M. Solutions logo and UPI QR image, Windows installer workflow, manual UPI payment-review API, private activation-key endpoints, and Razorpay subscription API scaffold.

## Included
- `index.html`, `style.css`, `app.js`: animated colourful login/demo dashboard, subscription plans, manual UPI form, local demo records, JSON export.
- `main.js`, `package.json`, `BUILD-EXE-WINDOWS.bat`: Electron desktop shell and Windows NSIS installer configuration.
- `assets/`: logo, supplied UPI QR and login design reference. Assets are included in the packaged installer.
- `.github/workflows/build-windows.yml`: builds Windows `.exe` in GitHub Actions and uploads it as an artifact.
- `cloud-api/`: Node.js + PostgreSQL API scaffold for UPI payment submissions, admin approval, hashed private activation keys, and Razorpay recurring subscriptions.

## Upload to GitHub
1. Create a **separate private repository** such as `gvrm-cloud-lms-desktop`.
2. Download and extract this ZIP.
3. Upload the *contents* of `GVRM_CLOUD_LMS_Full_Source/` to the repository root. Include the hidden `.github` folder and `.gitignore`.
4. Commit to `main`.
5. Open the repository's **Actions** tab and run `Build GVRM CLOUD LMS Windows EXE`.
6. When the run succeeds, download `GVRM-CLOUD-LMS-Windows-Installer` from Artifacts, extract the artifact ZIP and run the `.exe` on Windows.

## Cloud API setup
The desktop app and GitHub Pages do not host a secure backend. Deploy `cloud-api/` to a Node.js host and attach a managed PostgreSQL database. Follow `cloud-api/README.md`; set environment variables from `.env.example` in the host's secret/environment settings. Never commit `.env`, Razorpay secrets, or `ADMIN_REVIEW_TOKEN`.

The API requires a database and valid environment configuration to start. Create the three monthly subscription plans in the Razorpay dashboard and configure their plan IDs. Set the Razorpay webhook URL to `https://YOUR-API-HOST/api/payments/webhook` and configure the same webhook secret on the server. Start with Razorpay test mode.

## Manual UPI workflow
1. Customer selects Teacher ₹499/month, Institution ₹999/month, or Coaching Centre ₹1,999/month and pays through the supplied UPI QR.
2. Customer submits email, plan and UTR in the desktop app. Configure the cloud API URL in the app's Cloud Sync settings first.
3. Admin independently checks the bank/UPI transaction and reviews the request using the admin API and the secret `ADMIN_REVIEW_TOKEN`.
4. On approval, the API returns a one-time-displayed private activation key. Deliver it privately to the customer. The server stores only the key hash. Keys default to one month; manual approval is not automatic renewal.

## Windows installer
Install Node.js 20+ on a Windows computer and run `BUILD-EXE-WINDOWS.bat`, or use GitHub Actions. The GitHub runner needs no local Node.js installation. The `.exe` is not code-signed, so Windows may display a SmartScreen warning.

## Critical status / limitations
This is a **starter implementation and integration scaffold, not yet a production-certified complete LMS**. The login form currently opens a local demo session; role choices do not enforce server-side permissions. Local student/course records are stored in browser local storage and are not yet synchronised to PostgreSQL. The activation-key endpoints exist, but they are not yet enforced across all LMS modules. The API payment routes need production hardening, authenticated account ownership, rate limiting, audit logging, backup/recovery, cancellation/refund processes and security review before collecting live payments or storing real student data. Do not use real student records or live payment credentials until a qualified deployment/security test is completed.

## Prices shown
- Teacher: ₹499/month
- Institution: ₹999/month
- Coaching Centre: ₹1,999/month

Prices are displayed as requested; configure matching prices and terms in your payment provider before going live.
