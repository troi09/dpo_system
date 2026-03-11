# RTU DPO Secure Document Automation System — Post-Implementation Guide

## Overview

This document covers every change made during the latest multi-phase upgrade of the RTU Data Protection Office (DPO) document automation system. Read this before deploying to any environment.

---

## Required Environment Variables

### Server (`server/.env`)

```env
# MongoDB
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/dpo_system

# JWT — change this to a long random secret in production
JWT_SECRET=your_strong_secret_here

# Google SMTP (use an App Password, not your account password)
SMTP_USER=your.address@gmail.com
SMTP_PASS=your_16_char_app_password

# Client origin (for CORS and email links)
CLIENT_URL=http://localhost:5173

# Allowed CORS origins (comma-separated, no trailing slash)
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.vercel.app

# Frontend URL (used for verification/activation email links)
FRONTEND_URL=http://localhost:5173
```

> **Getting a Gmail App Password**: Google Account → Security → 2-Step Verification → App Passwords. Generate one for "Mail" and paste it as `SMTP_PASS`. Do NOT use your normal Google password.

### Client (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000
```

> **Note**: Do NOT include `/api` in `VITE_API_BASE_URL`. The services append `/api/...` themselves.

---

## New Dependencies

### Server

```
nodemailer   — Google SMTP email delivery
node-cron    — 5-year automatic archiving job
```

Install: `cd server && npm install`

### Client

```
recharts       — Chart components (PieChart, BarChart, LineChart)
lucide-react   — Icon library
framer-motion  — Page and card entrance animations
```

Install: `cd client && npm install`

---

## Database Migration Notes

### For Existing Users (IMPORTANT)

If you have existing users in the database before deploying these changes, you must set `isVerified: true` for them, otherwise they won't be able to log in:

```js
// Run in MongoDB shell or Compass
db.users.updateMany(
  { isVerified: { $exists: false } },
  { $set: { isVerified: true, trustedDevices: [] } }
);
```

### New User Model Fields

| Field | Type | Default | Purpose |
|---|---|---|---|
| `isVerified` | Boolean | `false` | Email verification status |
| `verificationToken` | String | — | Token for email verification links |
| `verificationExpires` | Date | — | Expiry for verification token |
| `trustedDevices` | Array | `[]` | Context-aware OTP — trusted IP/UA combos |
| `trustedDevices[].ip` | String | — | Client IP address |
| `trustedDevices[].userAgent` | String | — | Browser user-agent |
| `trustedDevices[].label` | String | — | Human-readable device label |
| `trustedDevices[].lastOtpVerifiedAt` | Date | — | When device was last OTP-verified |

---

## Phase 1 — Security Enhancements

### Email Verification Flow

**Registration (OTP-Based)**: When a user registers, `isVerified` is set to `false` and a **6-digit OTP** is generated, hashed, and stored. The plain OTP is emailed to the user. The frontend redirects to `/verify-email?email=...` where the user enters the OTP to verify.

**Admin-Created Users (with password)**: When admin creates a user with a preset password, the same OTP-based verification flow is used. The user receives a verification OTP email.

**Admin-Created Users (without password)**: An activation link is sent instead. The user clicks the link, sets their password, and is automatically verified.

**Resend OTP**: Users can request a new verification OTP by clicking "Resend OTP" on the verify-email page.

**New/Updated Routes**:
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/verify-email` | public | Verify email via OTP or legacy token |
| `POST` | `/api/auth/resend-verification-otp` | public | Resend verification OTP |
| `POST` | `/api/auth/activate-account` | public | Set password + verify (admin-created users) |

**Frontend Pages**:
- `/verify-email?email=...` → OTP input form (`VerifyEmailPage.jsx`)
- `/verify-email?token=...` → Legacy token auto-verification (backwards compatible)
- `/activate?token=...` → `ActivateAccountPage.jsx`

### Context-Aware OTP (Login)

On login from an **untrusted device** (new IP + User-Agent combo), the server responds with `{ requireOtp: true }` instead of a JWT. A 6-digit OTP is emailed to the user. Once verified:
- The device is added to `trustedDevices[]`
- Future logins from the same device skip OTP for **72 hours**

**New Routes**:
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/verify-login-otp` | public | Verify login OTP and issue JWT |

### 15-Minute Inactivity Timeout

The `AuthContext` now tracks user activity (mousemove, keydown, scroll, mousedown, touchstart). After 13 minutes of inactivity, a **SessionWarningModal** appears with a 2-minute countdown. The user can click "Stay Logged In" to refresh the session, or they are auto-logged out at 15 minutes.

**New Routes**:
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/refresh-token` | JWT | Refresh JWT (extends session) |

**New Components**:
- `SessionWarningModal.jsx` — countdown overlay

### New Email Templates

| Function | Purpose |
|---|---|
| `sendVerificationEmail(email, name, verifyUrl)` | Registration verification (legacy: link-based) |
| `sendWelcomeVerificationEmail(email, name, activateUrl)` | Admin-created user activation |
| `sendLoginOtpEmail(email, otp)` | Login OTP for untrusted devices |
| `sendVerificationOtpEmail(email, name, otp)` | Registration/admin-creation verification OTP |

---

## Phase 2 — Profile Pages

### Admin Profile (`/admin/profile`) & Student Profile (`/student/profile`)

Both pages now have functional edit capabilities:
- **Name editing**: Inline form to update display name
- **Password change**: Requires current password + new password with confirmation
- Uses `PATCH /api/auth/profile` endpoint (JWT-protected)

**New Routes**:
| Method | Path | Auth | Description |
|---|---|---|---|
| `PATCH` | `/api/auth/profile` | JWT | Update name and/or password |

---

## Phase 3 — Bug Fixes

### Audit Log Filter Fix

**Root Cause**: Frontend sent UPPERCASE filter strings ("CREATE", "LOGIN") but the database stores lowercase action strings ("request_created", "login").

**Fix**: `ACTION_TYPES` in `AdminAuditLog.jsx` changed from a flat string array to an array of `{ label, value }` objects with correct lowercase DB action values. Also fixed `totalPages` calculation — backend returns `total` count, not `totalPages`.

### Dashboard Analytics Fix

**Root Cause**: Dashboard used `getRequestStats()` (an aggregate endpoint) while the Reports page used `getAllRequests()` with client-side `useMemo` derivation — producing accurate charts. The aggregate endpoint had mismatched field names and missing data.

**Fix**: Dashboard now fetches all requests via `getAllRequests()` and derives chart data client-side using `useMemo`, matching the same pattern as AdminReports. Added a monthly trend line chart (6-month lookback).

---

## Phase 4 — UI Overhaul

### Login Page Redesign

Brand and form are now **separated**:
- **Brand section** (logo + \"Data Protection Office\" + \"Rizal Technological University\") sits on the blue gradient background with white text
- **White form panel** below contains only the login/register toggle and form fields
- Layout is vertical: brand → white card (form)
- Login OTP step integrated: when `requireOtp: true` is returned, an OTP input form slides in
- Registration redirects to `/verify-email?email=...` for OTP entry

### Verified Status Iconography

All native emoji usage (✅ ❌) replaced with professional `lucide-react` vector icons:
- `CheckCircle` (green) replaces ✅ in VerifyEmailPage, ActivateAccountPage
- `XCircle` (red) replaces ❌ in VerifyEmailPage, ActivateAccountPage, VerifyDocument

### Form Centering

Profile pages (`StudentProfile`, `AdminProfile`) now use a centered layout:
- Outer wrapper: `display: flex; justify-content: center`
- Inner container: `maxWidth: 520px; width: 100%`

### Request Type Selection Redesign

`StudentNewRequest` page redesigned:
- Two large side-by-side card buttons (200x200px)
- Each card has a distinct `lucide-react` icon: `ShieldCheck` for NDA, `FileText` for Agreement
- Smooth hover effect: `scale(1.04)` + shadow elevation
- Centered on page with flexbox grid

### Templates Page Removed

- Route removed from `App.jsx`
- NavLink removed from `Navbar.jsx`
- `FileText` import removed from Navbar icons
- `AdminTemplates.jsx` file is now orphaned (can be deleted)

### Dynamic Headbar Titles

Added missing route-to-title mappings in `Headbar.jsx`:
| Route | Title |
|---|---|
| `/admin/users` | User Management |
| `/admin/archives` | Archives |
| `/admin/audit` | Audit Trail |

Removed the obsolete `/admin/templates → "Templates"` mapping.

### Dashboard Reordering

New layout order (top to bottom):
1. Summary cards (Total, Pending, Approved, Archived)
2. **Recent Requests table** (moved from bottom)
3. **Analytics Charts** — Status donut + Type bar chart (side by side)
4. **Monthly Trend** — Line chart (6-month lookback, total/approved/pending)
5. **Recent Audit Activity** (moved from right sidebar to full-width bottom)

### Full-Width Content

Removed restrictive `maxWidth` constraints:
- `dashboard-page`: removed `max-width: 1100px` and `margin: 0 auto`
- `.review-page`: removed `max-width: 800px`
- `AdminUsers.jsx`: removed inline `style={{ maxWidth: 1000 }}`

All content areas now expand to fill the available space in the page container.

---

## All Routes Summary

### Client Routes

| Path | Component | Guard |
|---|---|---|
| `/` | `Landing` | public |
| `/verify-email` | `VerifyEmailPage` | public |
| `/activate` | `ActivateAccountPage` | public |
| `/verify/:id` | `VerifyDocument` | public |
| `/sign/:token` | `RepSigningPage` | public |
| `/student` | `StudentDashboard` | student |
| `/student/new-request` | `StudentNewRequest` | student |
| `/student/profile` | `StudentProfile` | student |
| `/admin` | `AdminDashboard` | admin |
| `/admin/requests` | `AdminRequests` | admin |
| `/admin/requests/:id` | `AdminRequestReview` | admin |
| `/admin/reports` | `AdminReports` | admin |
| `/admin/users` | `AdminUsers` | admin |
| `/admin/archives` | `AdminArchives` | admin |
| `/admin/audit` | `AdminAuditLog` | admin |
| `/admin/profile` | `AdminProfile` | admin |

### Server Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | Register (sends verification email) |
| `POST` | `/api/auth/login` | public | Login (may return OTP challenge) |
| `POST` | `/api/auth/verify-login-otp` | public | Verify login OTP |
| `POST` | `/api/auth/verify-email` | public | Verify email (OTP or legacy token) |
| `POST` | `/api/auth/resend-verification-otp` | public | Resend verification OTP |
| `POST` | `/api/auth/activate-account` | public | Set password for admin-created user |
| `POST` | `/api/auth/forgot-password` | public | Send password reset OTP |
| `POST` | `/api/auth/verify-reset-otp` | public | Verify reset OTP |
| `POST` | `/api/auth/reset-password` | public | Set new password with reset token |
| `POST` | `/api/auth/refresh-token` | JWT | Refresh JWT (session extension) |
| `PATCH` | `/api/auth/profile` | JWT | Update name/password |
| `GET` | `/api/auth/users` | admin JWT | List all users |
| `POST` | `/api/auth/users` | admin JWT | Create user |
| `PATCH` | `/api/auth/users/:id/toggle-active` | admin JWT | Activate/deactivate |
| `POST` | `/api/auth/users/:id/trigger-reset` | admin JWT | Force password reset |
| `GET` | `/api/requests` | JWT | All requests |
| `GET` | `/api/requests/stats` | JWT | Aggregate stats |
| `GET` | `/api/requests/archived` | admin JWT | Archived requests |
| `GET` | `/api/audit` | admin JWT | Paginated audit log |
| `GET` | `/api/audit/recent` | admin JWT | Recent N audit entries |

---

## Running the Project

```bash
# Terminal 1 — server
cd server
npm install
node server.js

# Terminal 2 — client
cd client
npm install
npm run dev
```

---

## Deployment Notes (Vercel + Render)

### Client (Vercel)

The `client/vercel.json` rewrites all routes to `index.html` for SPA routing. Set these env vars in Vercel:
- `VITE_API_BASE_URL` = your deployed server URL (e.g., `https://your-api.onrender.com`)

### Server (Render / Railway / similar)

Set all server env vars (`MONGO_URI`, `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`, `CLIENT_URL`, `FRONTEND_URL`).

**FRONTEND_URL** must point to your deployed client URL (e.g., `https://your-app.vercel.app`) — this is used to generate verification and activation email links.

**CLIENT_URL** is used for CORS origin — make sure it matches the Vercel deployment URL exactly (no trailing slash).

---

## March 2026 Update Notes

### Login Portal Redesign (Glassmorphism + Hierarchy)

- The login portal now uses a stronger glassmorphic panel (`rgba(255,255,255,0.15)` + blur + subtle white border).
- Branding hierarchy was updated:
- DPO logo is larger.
- `Data Protection Office` title is larger than `Rizal Technological University`.
- Login/register form container was reduced in width and input sizes to keep visual balance.

### OTP Verification Flow Changes

- Public registration still creates users as `isVerified: false` and sends a 6-digit email OTP.
- Admin-created users now require a `temporary password` field and are always created as `isVerified: false`.
- Admin-created users receive:
- a welcome email containing the temporary password, and
- a verification OTP email.
- Login interception for unverified users now automatically sends a fresh verification OTP and returns a `requireVerification` response. The frontend redirects to `/verify-email?email=...`.

### Staff Access Scope

- `staff` now has access to the same operational admin pages as `admin`:
- dashboard, requests, reports, archives, and audit.
- `staff` does **not** have access to user management (`/admin/users` remains admin-only).
- Backend route guards were updated to enforce this policy server-side.

### Audit Trail Improvements

- Removed the `IP` column from the audit table UI.
- The `Details` column now renders human-readable event narratives (login, account creation, request lifecycle, password and status actions) instead of raw key-value tags when possible.

### Vercel / Production Checklist

1. Set client env in Vercel:
- `VITE_API_BASE_URL=https://<your-backend-host>`

2. Set server env in host (Render/Railway/etc):
- `MONGO_URI`
- `JWT_SECRET`
- `SMTP_USER`
- `SMTP_PASS`
- `FRONTEND_URL=https://<your-vercel-domain>`
- `ALLOWED_ORIGINS=https://<your-vercel-domain>`

3. Confirm email delivery:
- Gmail app password is valid.
- SMTP sender is allowed and not blocked by provider limits.

4. Verify end-to-end scenarios after deploy:
- Public registration -> OTP verification -> login.
- Admin creates user with temporary password -> user login intercepted -> OTP verification -> dashboard access.
- Staff account can access `/admin` operational pages but gets blocked from `/admin/users`.

---

## Security Notes

- OTPs are stored **hashed** (bcrypt, 10 rounds) in the database. The plain OTP is only ever sent by email, never stored.
- Registration verification OTPs expire after **10 minutes**.
- `resetToken` is a `crypto.randomBytes(32)` hex string with a 15-minute expiry.
- Verification tokens (legacy link-based) use `crypto.randomBytes(32)` hex with 24-hour expiry.
- Deactivated users receive a `403 Account is disabled` response on login — JWT is never issued.
- Unverified users receive a `403 Please verify your email before logging in` response.
- All admin-only endpoints are protected by `authMiddleware` + role check (`req.user.role !== "admin"`).
- Email enumeration on forgot-password is prevented: the endpoint always returns a 200 regardless of whether the email exists.
- Context-aware OTP trusts a device for 72 hours based on IP + User-Agent combination.
- Session timeout at 15 minutes of inactivity with a 2-minute warning countdown.
- JWT tokens expire after 8 hours.

---

## Files Changed

### New Files
| File | Purpose |
|---|---|
| `client/src/components/SessionWarningModal.jsx` | Session timeout warning overlay |
| `client/src/pages/VerifyEmailPage.jsx` | Email verification landing page |
| `client/src/pages/ActivateAccountPage.jsx` | Account activation + password set page |

### Modified Files
| File | Changes |
|---|---|
| `server/models/User.js` | Added isVerified, verificationToken, verificationExpires, trustedDevices |
| `server/utils/emailService.js` | Added 4 email templates (verification link, activation, login OTP, verification OTP) |
| `server/controllers/authController.js` | OTP-based registration verification, resendVerificationOtp, login OTP, profile update, device trust |
| `server/routes/authRoutes.js` | Added resend-verification-otp route |
| `client/src/services/authService.js` | Added verifyEmailByToken, resendVerificationOtp; updated verifyEmail for OTP |
| `client/src/context/AuthContext.jsx` | Added inactivity timer, session warning, updateUser |
| `client/src/App.jsx` | Removed Templates route, added verify-email/activate routes, session modal |
| `client/src/components/Navbar.jsx` | Removed Templates link, removed FileText import |
| `client/src/components/Headbar.jsx` | Added Users, Archives, Audit title mappings; removed Templates |
| `client/src/pages/Landing.jsx` | Brand separated from form panel; OTP redirect after register |
| `client/src/components/Landing.css` | Brand on blue bg, white panel for form only, wrapper layout |
| `client/src/pages/VerifyEmailPage.jsx` | Rewritten as OTP input form with resend; lucide-react icons |
| `client/src/pages/ActivateAccountPage.jsx` | Replaced emojis with lucide-react CheckCircle/XCircle |
| `client/src/pages/VerifyDocument.jsx` | Replaced emojis with lucide-react CheckCircle/XCircle |
| `client/src/pages/student/StudentNewRequest.jsx` | Redesigned with large side-by-side card buttons + icons |
| `client/src/pages/student/StudentProfile.jsx` | Centered form layout (flex justify-center) |
| `client/src/pages/admin/AdminProfile.jsx` | Centered form layout (flex justify-center) |
| `client/src/components/TypeChooser.css` | Added card-btn grid styles for request type selection |
| `client/src/pages/admin/AdminDashboard.jsx` | Rewritten — client-side analytics, reordered layout, trend chart |
| `client/src/pages/admin/AdminProfile.jsx` | Rewritten — name + password editing forms |
| `client/src/pages/student/StudentProfile.jsx` | Rewritten — name + password editing forms |
| `client/src/pages/admin/AdminAuditLog.jsx` | Fixed filter values + totalPages bug |
| `client/src/pages/admin/AdminUsers.jsx` | Removed maxWidth constraint |
| `client/src/index.css` | Removed maxWidth from dashboard-page and review-page |

---

## Phase 5 — UI Polish, E-Signature Workflow, Audit Trail (March 2026)

### 5.1 Login Page Glassmorphism
- **File:** `client/src/components/Landing.css`
- `.landing-panel` background changed from solid `var(--surface)` to `rgba(255, 255, 255, 0.8)` with `backdrop-filter: blur(16px)` and subtle white border
- Form inputs use `rgba(255, 255, 255, 0.95)` to remain fully readable on the frosted background
- **No new dependencies or env vars needed**

### 5.2 Agreement Link Persistence
- **File:** `client/src/pages/admin/AdminRequestReview.jsx`
- Signing link is reconstructed from `reqData.signingToken` on component mount (if token exists and not yet used)
- Link survives page refreshes — no longer lost when navigating away
- **File:** `server/controllers/requestController.js`
- `getRequestById` now strips `signingToken` from non-admin responses (security hardening)

### 5.3 Dual E-Signature for NDA Types

#### Schema
- **File:** `server/models/Request.js`
- Added fields: `studentSigUrl`, `studentSigPath`, `adminSigUrl`, `adminSigPath`
- Additive change — no migration required, defaults to empty strings

#### Backend
- **File:** `server/controllers/requestController.js`
- `createRequest` accepts `studentSigUrl`/`studentSigPath` for NDAs
- `updateRequestStatus` accepts `adminSigUrl`/`adminSigPath` when approving NDAs
- `resubmitRequest` accepts `studentSigUrl`/`studentSigPath` for NDA resubmissions
- `getSignatureImages` now returns `studentSig`/`adminSig` for NDA requests

#### Student Side
- **File:** `client/src/pages/student/StudentNDARequest.jsx`
- Added `SignaturePad` component — student must draw e-signature before submitting
- Signature uploaded to Firebase, stored as `studentSigUrl` on request
- **File:** `client/src/pages/student/StudentResubmitRequest.jsx`
- Added e-signature pad for NDA resubmissions

#### Admin Side
- **File:** `client/src/pages/admin/AdminRequestReview.jsx`
- `NdaReviewPanel` displays student's e-signature
- Admin must draw e-signature via `SignaturePad` before approving NDA
- Admin signature uploaded to Firebase, stored, then fetched via proxy for PDF generation

#### PDF Templates
- **File:** `client/src/config/documentTemplates/NDAResearchDoc.jsx`
- **File:** `client/src/config/documentTemplates/NDAStudentOrgActivitiesDoc.jsx`
- Both now render dual signature blocks (Student + DPO Admin) with signature images

### 5.4 Audit Trail Refinement

#### New Audit Log Entries (Backend)
| Action String | Trigger |
|---|---|
| `request_resubmitted` | Student resubmits a request |
| `signing_link_generated` | Admin generates a signing link |
| `rep_signature_submitted` | Representative submits signature |
| `rep_signature_declined` | Representative declines signing |

#### Frontend Human-Readable Formatting
- **File:** `client/src/pages/admin/AdminAuditLog.jsx`
- Added `ACTION_LABELS` mapping: raw strings → readable text (e.g., `request_created` → "Request Created")
- `prettyAction()` function transforms any action string
- Action badges use category-based color coding (green=create, blue=update, purple=login, red=declined, etc.)
- Resource type column capitalizes first letter
- Details column renders key-value pairs readably instead of raw JSON
- Filter dropdown expanded with new action types

---

### Deployment Notes (Phase 5)
- **No new dependencies** — all changes use existing packages
- **No new env vars** — existing `.env` files unchanged
- **No database migration** — schema changes are additive with defaults
- **Browser support** — `backdrop-filter` works in all modern browsers
- Push to `Branch-ni-Kurl!` and deploy

### Testing Checklist (Phase 5)
- [ ] Login page: frosted glass panel effect with readable text
- [ ] Agreement flow: generate signing link → refresh → link persists
- [ ] NDA submission: signature pad required, signature uploaded
- [ ] NDA admin approval: student sig displayed, admin sig required, PDF has both
- [ ] NDA resubmit: signature pad present for NDA type
- [ ] Audit trail: all actions show human-readable labels
- [ ] Audit trail filters: new action types work correctly

---

## Phase 6 — Login Parallax, Status Unification, CORS Fix, Global UI Polish

### 6.1 Login Page Parallax Background

- **File:** `client/src/pages/Landing.jsx`
- Added `useCallback`, `useRef` imports; `Eye`, `EyeOff` from `lucide-react`
- `bgRef` tracks a full-viewport background `<div>` with `RTU-Background.jpg`
- `handleMouseMove` applies a subtle `translate3d` (up to ±15px) via `requestAnimationFrame` for a parallax hover effect
- A gradient overlay sits between the background and the login panel for readability
- **File:** `client/src/components/Landing.css`
- `.landing-parallax-bg`: absolute-fill, `background-size: cover`, `will-change: transform`, `scale(1.05)` (prevents edge bleed during parallax)
- `.landing-overlay`: dark gradient overlay (`rgba(0,0,0,0.45) → rgba(0,0,0,0.65)`)
- `.landing-wrapper` z-index raised to 2
- **Asset:** `client/public/RTU-Background.jpg` — RTU campus photo used as background

### 6.2 Password Visibility Toggle

- **File:** `client/src/pages/Landing.jsx`
- `showPassword` state toggles `<input type>` between `password` and `text`
- Toggle button with `Eye`/`EyeOff` icon inside a `.landing-password-wrap` wrapper
- **File:** `client/src/components/Landing.css`
- `.landing-password-wrap`: relative positioned wrapper for password field + icon
- `.landing-password-toggle`: absolute-right positioned icon button (transparent bg, pointer cursor)

### 6.3 Status Unification ("Approved/Completed")

**Rationale:** The backend maintains both `approved` and `completed` statuses for different NDA lifecycle flows, but they represent the same end-user state. Display was unified to "Approved/Completed" — backend schema unchanged.

**Files modified:**
| File | Change |
|---|---|
| `AdminDashboard.jsx` | `STATUS_LABEL` map: `approved` and `completed` → `"Approved/Completed"`; chart legend updated |
| `StudentDashboard.jsx` | Same `STATUS_LABEL` map update |
| `AdminRequests.jsx` | Filter label → "Approved/Completed"; `prettyStatus` map updated; filter logic includes both `approved` and `completed` when filtering by "approved" |
| `AdminRequestReview.jsx` | `prettyStatus` map updated |
| `StudentRequestReview.jsx` | `prettyStatus` map updated |
| `AdminReports.jsx` | `prettyStatus` map updated; chart legend "Approved" → "Approved/Completed" |

### 6.4 Production CORS Fix

- **File:** `server/server.js`
- Replaced `app.use(cors())` with a proper CORS configuration:
  - `ALLOWED_ORIGINS` env var: comma-separated list of allowed origins (e.g., `https://your-app.vercel.app,http://localhost:5173`)
  - `credentials: true` — supports JWT cookies
  - `methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"]`
  - `allowedHeaders: ["Content-Type","Authorization"]`
  - Allows requests with no origin (mobile apps, cURL) as fallback

**New env var required in `server/.env`:**
```env
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.vercel.app
```

### 6.5 Global UI Polish

#### Loading Skeletons

All data-fetching table pages now show animated shimmer skeleton rows while loading, replacing the previous italic "Loading…" text placeholders.

**Files with skeleton loading added:**
| File | Skeleton Rows |
|---|---|
| `AdminDashboard.jsx` | 4 rows (5 cols) |
| `StudentDashboard.jsx` | 4 rows (4 cols) |
| `AdminRequests.jsx` | 4 rows (5 cols) |
| `AdminUsers.jsx` | 5 rows (6 cols) with full table headers |
| `AdminAuditLog.jsx` | 6 rows (6 cols) with full table headers |
| `AdminArchives.jsx` | 4 rows (6 cols) with full table headers |
| `AdminReports.jsx` | 4 KPI card skeletons (grid layout) |

#### CSS Design Tokens Added (`index.css`)

| Class | Purpose |
|---|---|
| `.skeleton-block` | Base shimmer block (gradient animation, 1.4s cycle) |
| `.skeleton-text` | Inline text placeholder (80×14px) |
| `.skeleton-pill` | Status pill placeholder (72×22px, pill border-radius) |
| `.skeleton-btn` | Button placeholder (52×28px) |
| `.skeleton-block--sm/md/lg/xl` | Preset width variants |
| `.skeleton-block--circle` | Avatar placeholder (32×32px circle) |
| `.skeleton-row` | Row container with consistent padding/gap |
| `@keyframes shimmer` | Background gradient slide animation |

#### Other Global Styles

| Change | Detail |
|---|---|
| `.dashboard-page` max-width | Set to `1200px` with `margin: 0 auto` |
| `.review-card` max-width | Set to `800px` with `margin: 0 auto` |
| Global input focus ring | All `input`, `select`, `textarea` get consistent `box-shadow: 0 0 0 3px rgba(15,45,107,0.1)` on focus |
| Global transitions | All `button`, `a`, `input`, `select`, `textarea` get `transition: 0.15s ease` on background, border-color, box-shadow, color, opacity, transform |
| Empty state polish | `.dashboard-empty-title` font-weight → 700; `.dashboard-empty-icon` opacity → 0.35 |

---

### Deployment Notes (Phase 6)

- **New server env var:** `ALLOWED_ORIGINS` — comma-separated list of allowed CORS origins. Must include your Vercel client URL and `http://localhost:5173` (for local dev).
- **New asset:** `client/public/RTU-Background.jpg` — must be present in the public folder for the parallax background.
- **No new npm dependencies** — all changes use existing packages (`lucide-react` already installed).
- **No database migration** — all changes are frontend-only or server config.
- Push to `Branch-ni-Kurl!` and deploy.

### Testing Checklist (Phase 6)
- [ ] Login page: parallax background moves subtly on mouse hover
- [ ] Login page: password eye icon toggles visibility
- [ ] All dashboards/tables: skeleton shimmer rows appear during initial load
- [ ] AdminReports: KPI card skeletons during load
- [ ] Status displays: "Approved/Completed" shown consistently for both `approved` and `completed` statuses
- [ ] AdminRequests filter: "Approved/Completed" button filters both `approved` and `completed` requests
- [ ] CORS: API calls work from Vercel deployment (set `ALLOWED_ORIGINS` on server)
- [ ] CORS: API calls work from localhost (include `http://localhost:5173` in `ALLOWED_ORIGINS`)
- [ ] Global: inputs show blue focus ring on focus
- [ ] Global: buttons/inputs have smooth hover transitions

---

## Phase 7 — Production Deployment Bug Fixes (Localhost vs. Vercel)

### 7.1 Critical Fix: Dashboard `Promise.all` Race Condition

**Root Cause:** `AdminDashboard.jsx` used `Promise.all([getAllRequests(), getRecentAuditLogs()])`. If **either** call failed (e.g., audit logs returning 401/403 during a brief token race), the entire `Promise.all` rejected and **neither** `setRequests` nor `setAuditLogs` was called. This caused:
- Summary cards showing `0` for Total, Pending, Approved, Archived
- Charts rendering empty (no data set)
- The identical charts on `AdminReports.jsx` **did** work because Reports only calls `getAllRequests()` independently

**Fix:** Replaced `Promise.all` with independent `try/catch` blocks. Each API call now succeeds or fails independently — a failure in audit logs no longer blocks request data from populating the dashboard.

**File:** `client/src/pages/admin/AdminDashboard.jsx`

### 7.2 CORS Hardening for Vercel

**Root Cause:** Trailing slashes in `ALLOWED_ORIGINS` or in the browser's `Origin` header caused exact-match failures (e.g., `https://app.vercel.app/` !== `https://app.vercel.app`). Additionally, explicit `OPTIONS` preflight handling was missing, which some edge runtimes require.

**Fix:**
- Both `ALLOWED_ORIGINS` values and incoming `Origin` headers are now normalized by stripping trailing slashes before comparison
- Added `app.options("*", cors(corsOptions))` for explicit preflight handling
- CORS options are extracted to a shared `corsOptions` object applied to both the preflight handler and the global middleware

**File:** `server/server.js`

### 7.3 Error Surface Improvements

**Root Cause:** Multiple admin pages caught API errors with only `console.error()`, hiding the actual HTTP status code and error message from the user. This made it impossible to diagnose whether failures were caused by 401 (auth), 403 (forbidden), 404 (bad route), or 500 (server error).

**Fix:** All admin data-fetching pages now surface the real `error.response.data.message` and HTTP status code in a visible red error banner at the top of the page.

**Files modified:**
| File | Change |
|---|---|
| `AdminDashboard.jsx` | Added `error` state; each fetch has its own catch that surfaces message + HTTP status |
| `AdminAuditLog.jsx` | Added `error` state; catch block surfaces message + HTTP status in red banner |
| `AdminReports.jsx` | Added `error` state; catch block surfaces message + HTTP status in red banner |
| `AdminUsers.jsx` | Already had error surfacing via flash messages (no change needed) |

### 7.4 Case-Sensitivity Audit

**Result:** All import paths across client and server were audited for Linux case-sensitivity compatibility. **No mismatches found** — all imports match exact file names on disk. The codebase is safe for Vercel's Linux file system.

---

### Deployment Notes (Phase 7)

- **No new dependencies**
- **No new env vars**
- **No database migration**
- Push to `Branch-ni-Kurl!` and deploy

### Testing Checklist (Phase 7)

- [ ] Admin Dashboard: summary cards show correct counts (not 0)
- [ ] Admin Dashboard: charts render data even if audit log fetch fails
- [ ] Admin Dashboard: error banner appears with HTTP status when API fails
- [ ] Audit Trail: error banner appears with HTTP status when fetch fails
- [ ] Reports: error banner appears with HTTP status when fetch fails
- [ ] User Management: "Failed to load users" shows specific HTTP error code
- [ ] CORS: no preflight failures in browser Network tab on Vercel

---

## Vercel Deployment Troubleshooting Guide

If admin pages show empty data, 0-count metrics, or "Failed to load" errors **only on Vercel** (but work locally), follow this checklist:

### Step 1: Verify Environment Variables

**Client (Vercel Dashboard → Project → Settings → Environment Variables):**

| Variable | Required Value | Common Mistake |
|---|---|---|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com` (no trailing `/`, no `/api`) | Leaving it as `http://localhost:5000` or adding `/api` suffix |

> After changing any `VITE_` env var in Vercel, you **must redeploy** — Vite bakes these into the build at compile time.

**Server (Render/Railway Dashboard → Environment):**

| Variable | Required Value | Common Mistake |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (exact URL, no trailing `/`) | Mismatch with actual Vercel URL, or missing preview deploy URLs |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Still set to `http://localhost:5173` |
| `CLIENT_URL` | `https://your-app.vercel.app` | Still set to `http://localhost:5173` |
| `MONGO_URI` | Your MongoDB Atlas connection string | Whitelist `0.0.0.0/0` in Atlas Network Access for Render/Railway |
| `JWT_SECRET` | A strong random string | Using a weak or empty value |

### Step 2: Check CORS in Browser DevTools

1. Open browser DevTools → **Network** tab
2. Find any failing API request (red status)
3. Check:
   - **Status Code**: `401` = token not sent, `403` = wrong role or expired token, `404` = wrong route, `500` = server error
   - **Response Headers**: look for `access-control-allow-origin`. If missing, CORS is blocking the request
   - **Preflight (OPTIONS)**: check if the OPTIONS request returns `200`. If not, the server isn't handling preflight

**Fix CORS issues:**
```env
# Server .env — include ALL client URLs (comma-separated, no trailing slashes)
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-branch-name.vercel.app,http://localhost:5173
```

> Vercel preview deployments get unique URLs (e.g., `https://your-app-abc123.vercel.app`). Add these to `ALLOWED_ORIGINS` or use a wildcard pattern in your CORS config.

### Step 3: Check Auth Token Propagation

If the Network tab shows `401 Unauthorized` on admin endpoints:

1. Open DevTools → **Application** → **Local Storage**
2. Confirm `token` key exists and has a valid JWT value
3. In the Network tab, click the failing request → **Headers** → check `Authorization: Bearer <token>` is present in the request headers
4. If the token exists in localStorage but not in the request header, clear localStorage and log in again

### Step 4: Check MongoDB Atlas Network Access

Render/Railway servers have dynamic IPs. If API calls return `500` errors:

1. Go to **MongoDB Atlas** → **Network Access**
2. Add `0.0.0.0/0` to allow connections from any IP (or add the specific hosting provider's IP range)
3. Wait 1-2 minutes for the change to propagate

### Step 5: Verify Backend is Running

1. Visit your backend URL directly: `https://your-backend.onrender.com`
2. You should see: `"DPO System API Running..."`
3. If you get a timeout or error:
   - **Render free tier**: servers spin down after 15 min of inactivity. The first request takes 30-60 seconds to cold-start
   - Check Render/Railway logs for startup errors (DB connection failures, missing env vars)

### Step 6: Vercel Redeployment After Env Changes

Vercel `VITE_*` variables are **build-time only**. After changing them:

1. Go to **Vercel Dashboard** → your project → **Deployments**
2. Click the `...` menu on the latest deployment → **Redeploy**
3. Or push a new commit to `Branch-ni-Kurl!` to trigger a fresh build

### Step 7: Preview Deployment CORS

Every PR or branch push creates a unique Vercel preview URL. To make API calls work from preview deployments:

1. Add the preview URL to `ALLOWED_ORIGINS` on the server, **or**
2. Use a wildcard approach in server CORS (not recommended for production)

### Quick Diagnostic Commands

```bash
# Test if backend is reachable from your machine
curl https://your-backend.onrender.com

# Test a protected endpoint (replace <TOKEN> with a valid JWT)
curl -H "Authorization: Bearer <TOKEN>" https://your-backend.onrender.com/api/requests/all

# Check CORS headers
curl -I -X OPTIONS \
  -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  https://your-backend.onrender.com/api/auth/users
```
