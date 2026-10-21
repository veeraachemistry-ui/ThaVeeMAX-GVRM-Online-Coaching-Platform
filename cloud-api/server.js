import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import pg from 'pg';
import Razorpay from 'razorpay';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);
const required = ['DATABASE_URL','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','RAZORPAY_PLAN_TEACHER','RAZORPAY_PLAN_INSTITUTION','RAZORPAY_PLAN_COACHING'];
const missing = required.filter(k => !process.env[k] || process.env[k].includes('REPLACE'));
if (missing.length) console.warn('Payment API configuration incomplete:', missing.join(', '));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) : null;
const plans = {
  teacher: { name: 'Teacher', amount: 49900, planId: () => process.env.RAZORPAY_PLAN_TEACHER },
  institution: { name: 'Institution', amount: 99900, planId: () => process.env.RAZORPAY_PLAN_INSTITUTION },
  coaching: { name: 'Coaching Centre', amount: 199900, planId: () => process.env.RAZORPAY_PLAN_COACHING }
};

await pool.query(`CREATE TABLE IF NOT EXISTS lms_subscriptions (
  id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL, plan_key TEXT NOT NULL,
  razorpay_subscription_id TEXT UNIQUE, razorpay_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'created', current_start BIGINT, current_end BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_event_id TEXT
)`);

// Razorpay webhook needs the exact raw request body for signature verification.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.header('x-razorpay-signature') || '';
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '').update(req.body).digest('hex');
    const supplied = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (!signature || supplied.length !== expectedBuffer.length || !crypto.timingSafeEqual(supplied, expectedBuffer)) return res.status(400).send('Invalid webhook signature');
    const event = JSON.parse(req.body.toString('utf8'));
    const eventId = req.header('x-razorpay-event-id') || null;
    const sub = event.payload?.subscription?.entity;
    if (sub?.id) {
      const statusMap = { 'subscription.activated': 'active', 'subscription.authenticated': 'authenticated', 'subscription.charged': 'active', 'subscription.pending': 'pending', 'subscription.halted': 'halted', 'subscription.cancelled': 'cancelled', 'subscription.completed': 'completed', 'subscription.paused': 'paused', 'subscription.resumed': 'active' };
      const status = statusMap[event.event] || sub.status || 'unknown';
      await pool.query(`UPDATE lms_subscriptions SET status=$1,current_start=$2,current_end=$3,updated_at=NOW(),last_event_id=$4 WHERE razorpay_subscription_id=$5`, [status, sub.current_start || null, sub.current_end || null, eventId, sub.id]);
    }
    res.json({ received: true });
  } catch (e) { console.error('Webhook processing error:', e.message); res.status(500).send('Webhook processing failed'); }
});
app.use(express.json({ limit: '100kb' }));
const allowed = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) { if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true); return cb(new Error('Origin not allowed by CORS')); } }));
await pool.query(`CREATE TABLE IF NOT EXISTS lms_upi_payment_requests (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  plan_key TEXT NOT NULL CHECK (plan_key IN ('teacher','institution','coaching')),
  amount_inr INTEGER NOT NULL,
  utr TEXT NOT NULL UNIQUE,
  payer_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);

await pool.query(`CREATE TABLE IF NOT EXISTS lms_activation_keys (
  id BIGSERIAL PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  email TEXT NOT NULL,
  plan_key TEXT NOT NULL CHECK (plan_key IN ('teacher','institution','coaching')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  issued_by TEXT NOT NULL,
  source_request_id BIGINT UNIQUE REFERENCES lms_upi_payment_requests(id) ON DELETE SET NULL
)`);

const upiAmounts = { teacher: 499, institution: 999, coaching: 1999 };
const adminReviewAuthorized = (req) => {
  const configured = process.env.ADMIN_REVIEW_TOKEN || '';
  const provided = req.header('x-admin-review-token') || '';
  return configured.length >= 24 && provided.length === configured.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configured));
};

const hashActivationKey = (key) => crypto.createHash('sha256').update(String(key).trim().toUpperCase()).digest('hex');
const generateActivationKey = () => {
  const body = crypto.randomBytes(18).toString('hex').toUpperCase();
  return `GVRM-${body.slice(0,6)}-${body.slice(6,12)}-${body.slice(12,18)}-${body.slice(18,24)}-${body.slice(24,30)}`;
};
const planMonths = 1;

// A submitted UTR is a claim, NOT proof of payment. Never activate access here.
app.post('/api/upi-payment-requests', async (req,res) => {
  try {
    const { email, planKey, utr, payerName = '', notes = '' } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Valid email is required'});
    if (!Object.hasOwn(upiAmounts, planKey)) return res.status(400).json({error:'Invalid subscription plan'});
    if (typeof utr !== 'string' || !/^[A-Za-z0-9-]{8,100}$/.test(utr.trim())) return res.status(400).json({error:'Enter a valid UTR/reference number'});
    const result = await pool.query(
      `INSERT INTO lms_upi_payment_requests(email,plan_key,amount_inr,utr,payer_name,notes)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id,status,amount_inr,created_at`,
      [email.toLowerCase().trim(),planKey,upiAmounts[planKey],utr.trim(),String(payerName).slice(0,120),String(notes).slice(0,200)]
    );
    res.status(201).json({requestId:result.rows[0].id,status:result.rows[0].status,amount:result.rows[0].amount_inr,message:'Pending admin review'});
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({error:'This UTR/reference has already been submitted'});
    console.error('UPI request error:',e.message); res.status(500).json({error:'Could not submit payment request'});
  }
});

app.get('/api/admin/upi-payment-requests', async (req,res) => {
  if (!adminReviewAuthorized(req)) return res.status(401).json({error:'Admin review authorization required'});
  try {
    const result = await pool.query(`SELECT id,email,plan_key,amount_inr,utr,payer_name,notes,status,created_at,reviewed_at,reviewed_by FROM lms_upi_payment_requests ORDER BY created_at DESC LIMIT 500`);
    res.json(result.rows);
  } catch (e) { res.status(500).json({error:'Could not load requests'}); }
});

app.post('/api/admin/upi-payment-requests/:id/review', async (req,res) => {
  if (!adminReviewAuthorized(req)) return res.status(401).json({error:'Admin review authorization required'});
  const { decision, reviewer = 'GVRM Admin' } = req.body || {};
  if (!['approved','rejected'].includes(decision)) return res.status(400).json({error:'Decision must be approved or rejected'});
  try {
    const result = await pool.query(
      `UPDATE lms_upi_payment_requests SET status=$1,reviewed_by=$2,reviewed_at=NOW()
       WHERE id=$3 AND status='pending' RETURNING id,email,plan_key,amount_inr,status,reviewed_at`,
      [decision,String(reviewer).slice(0,120),req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({error:'Pending request not found'});
    let activationKey = null;
    if (decision === 'approved') {
      const request = result.rows[0];
      activationKey = generateActivationKey();
      const expires = new Date(); expires.setMonth(expires.getMonth() + planMonths);
      await pool.query(
        `INSERT INTO lms_activation_keys(key_hash,key_prefix,email,plan_key,expires_at,issued_by,source_request_id)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [hashActivationKey(activationKey), activationKey.slice(0,10), request.email.toLowerCase(), request.plan_key, expires.toISOString(), String(reviewer).slice(0,120), request.id]
      );
    }
    // Plaintext key is returned only once to the authorized admin response; only its hash is stored.
    res.json({request:result.rows[0],activationKey,message:decision==='approved'?'Payment approved. Give this private activation key to the customer securely.':'Payment request rejected.'});
  } catch (e) { res.status(500).json({error:'Could not review request'}); }
});

// Issue a private key manually after independently verifying payment. Admin token required.
app.post('/api/admin/activation-keys', async (req,res) => {
  if (!adminReviewAuthorized(req)) return res.status(401).json({error:'Admin review authorization required'});
  try {
    const { email, planKey, months = 1, issuedBy = 'GVRM Admin' } = req.body || {};
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({error:'Valid email required'});
    if (!Object.hasOwn(upiAmounts, planKey)) return res.status(400).json({error:'Invalid plan'});
    if (!Number.isInteger(months) || months < 1 || months > 36) return res.status(400).json({error:'months must be 1 to 36'});
    const key = generateActivationKey(); const expires = new Date(); expires.setMonth(expires.getMonth()+months);
    await pool.query(`INSERT INTO lms_activation_keys(key_hash,key_prefix,email,plan_key,expires_at,issued_by) VALUES($1,$2,$3,$4,$5,$6)`,
      [hashActivationKey(key),key.slice(0,10),email.toLowerCase().trim(),planKey,expires.toISOString(),String(issuedBy).slice(0,120)]);
    res.status(201).json({activationKey:key,email:email.toLowerCase().trim(),planKey,expiresAt:expires.toISOString(),message:'Save this key now; it is shown only once.'});
  } catch(e) { console.error('Activation key issue error:',e.message); res.status(500).json({error:'Could not issue activation key'}); }
});

// Verify key against the customer email and requested plan. Only the key hash is stored.
app.post('/api/activation/verify', async (req,res) => {
  try {
    const { activationKey, email, planKey } = req.body || {};
    if (typeof activationKey !== 'string' || activationKey.length > 120 || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Object.hasOwn(upiAmounts, planKey)) return res.status(400).json({valid:false,error:'Activation key, valid email and plan are required'});
    const result = await pool.query(`SELECT email,plan_key,status,expires_at FROM lms_activation_keys WHERE key_hash=$1 LIMIT 1`, [hashActivationKey(activationKey)]);
    if (!result.rowCount) return res.status(404).json({valid:false,error:'Activation key not found'});
    const license = result.rows[0];
    if (license.email !== email.toLowerCase().trim() || license.plan_key !== planKey) return res.status(403).json({valid:false,error:'Key does not match this email or plan'});
    if (license.status !== 'active' || new Date(license.expires_at) <= new Date()) return res.status(403).json({valid:false,error:'Activation key is inactive or expired'});
    res.json({valid:true,planKey:license.plan_key,expiresAt:license.expires_at,message:'Activation key valid'});
  } catch(e) { console.error('Activation verification error:',e.message); res.status(500).json({valid:false,error:'Could not verify activation key'}); }
});

app.get('/api/admin/activation-keys', async (req,res) => {
  if (!adminReviewAuthorized(req)) return res.status(401).json({error:'Admin review authorization required'});
  try {
    const result = await pool.query(`SELECT id,key_prefix,email,plan_key,status,issued_at,expires_at,issued_by FROM lms_activation_keys ORDER BY issued_at DESC LIMIT 500`);
    res.json(result.rows);
  } catch(e) { res.status(500).json({error:'Could not list activation keys'}); }
});

app.post('/api/admin/activation-keys/:id/revoke', async (req,res) => {
  if (!adminReviewAuthorized(req)) return res.status(401).json({error:'Admin review authorization required'});
  try {
    const result = await pool.query(`UPDATE lms_activation_keys SET status='revoked' WHERE id=$1 AND status='active' RETURNING id,key_prefix,email,plan_key,status`, [req.params.id]);
    if (!result.rowCount) return res.status(404).json({error:'Active activation key not found'});
    res.json({revoked:true,key:result.rows[0]});
  } catch(e) { res.status(500).json({error:'Could not revoke key'}); }
});

app.get('/api/health', (_req,res) => res.json({ ok: true, service: 'GVRM CLOUD LMS Payments API', paymentsConfigured: missing.length === 0 }));
app.get('/api/plans', (_req,res) => res.json(Object.entries(plans).map(([key,p]) => ({ key, name:p.name, amount:p.amount/100, currency:'INR', interval:'monthly' }))));

app.post('/api/subscriptions', async (req,res) => {
  try {
    if (!razorpay || missing.length) return res.status(503).json({ error: 'Payment gateway is not configured. Complete cloud-api/.env setup first.' });
    const { planKey, email } = req.body || {};
    const plan = plans[planKey];
    if (!plan) return res.status(400).json({ error: 'Choose a valid plan.' });
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'A valid account email is required.' });
    const planId = plan.planId();
    if (!planId || !planId.startsWith('plan_')) return res.status(503).json({ error: `Razorpay monthly plan ID missing for ${planKey}.` });
    const subscription = await razorpay.subscriptions.create({ plan_id: planId, total_count: 120, quantity: 1, customer_notify: 1, notes: { product: 'GVRM CLOUD LMS', plan_key: planKey, account_email: email } });
    await pool.query(`INSERT INTO lms_subscriptions(email,plan_key,razorpay_subscription_id,status) VALUES($1,$2,$3,$4) ON CONFLICT(razorpay_subscription_id) DO UPDATE SET email=EXCLUDED.email,updated_at=NOW()`, [email.toLowerCase(), planKey, subscription.id, subscription.status || 'created']);
    res.json({ subscriptionId: subscription.id, keyId: process.env.RAZORPAY_KEY_ID, planName: plan.name, amount: plan.amount, currency: 'INR', email: email.toLowerCase() });
  } catch (e) { console.error('Create subscription error:', e.message); res.status(502).json({ error: 'Could not create subscription with payment provider.' }); }
});

app.post('/api/subscriptions/verify', async (req,res) => {
  try {
    const { razorpay_payment_id: paymentId, razorpay_subscription_id: subscriptionId, razorpay_signature: signature } = req.body || {};
    if (![paymentId, subscriptionId, signature].every(v => typeof v === 'string' && v.length < 500)) return res.status(400).json({ verified: false, error: 'Missing payment verification fields.' });
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${paymentId}|${subscriptionId}`).digest('hex');
    const a = Buffer.from(expected); const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return res.status(400).json({ verified: false, error: 'Payment signature verification failed.' });
    // Signature confirms the checkout response; activation/status is updated from signed webhooks.
    const result = await pool.query(`UPDATE lms_subscriptions SET status='authenticated',updated_at=NOW() WHERE razorpay_subscription_id=$1 RETURNING plan_key,status`, [subscriptionId]);
    if (!result.rowCount) return res.status(404).json({ verified: false, error: 'Subscription record not found.' });
    res.json({ verified: true, status: result.rows[0].status, planKey: result.rows[0].plan_key, message: 'Checkout signature verified. Final activation follows the provider webhook.' });
  } catch (e) { console.error('Verify subscription error:', e.message); res.status(500).json({ verified: false, error: 'Verification failed.' }); }
});

app.get('/api/subscriptions/status', async (req,res) => {
  // For production, protect this endpoint with your real user authentication and tenant authorization.
  const email = String(req.query.email || '').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email required.' });
  const result = await pool.query(`SELECT plan_key,status,current_start,current_end,created_at FROM lms_subscriptions WHERE email=$1 ORDER BY created_at DESC LIMIT 10`, [email]);
  res.json({ subscriptions: result.rows });
});
app.listen(port, () => console.log(`GVRM CLOUD LMS API listening on ${port}`));
