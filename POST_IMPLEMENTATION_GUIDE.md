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
