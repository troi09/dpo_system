# RTU DPO Secure Document Automation System — Post-Implementation Guide

## Overview

This document covers every change made during the Phase 1–4 upgrade of the RTU Data Protection Office (DPO) document automation system. Read this before deploying to any environment.

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

# Client origin (for CORS)
CLIENT_URL=http://localhost:5173
```

> **Getting a Gmail App Password**: Google Account → Security → 2-Step Verification → App Passwords. Generate one for "Mail" and paste it as `SMTP_PASS`. Do NOT use your normal Google password.

### Client (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

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
lucide-react   — Icon library (replaces text symbols in Navbar)
framer-motion  — Page and card entrance animations
```

Install: `cd client && npm install`

---

## Phase 1 — AI Removal

All AI integrations were removed:

| Deleted File | Was Used For |
|---|---|
| `client/src/components/AITriageChat.jsx` | Chatbot UI |
| `client/src/components/AITriageChat.css` | Chatbot styles |
| `client/src/services/aiService.js` | OpenAI API calls |
| `server/controllers/agentController.js` | AI agent logic |
| `server/routes/agentRoutes.js` | `/api/ai` routes |

`AdminRequestReview.jsx` and `AdminReports.jsx` had lingering imports from `aiService.js` that were also removed and replaced with real implementations.

---

## Phase 2 — Backend Changes

### Email Service (`server/utils/emailService.js`)

Exports four sending functions:

- `sendOtpEmail(email, otp, purpose)` — 6-digit OTP for forgot-password
- `sendPasswordResetEmail(email, resetUrl)` — fallback link flow (currently OTP-based)
- `sendStatusUpdateEmail(email, name, requestType, newStatus, remarks)` — triggered on every status change
- `sendWelcomeEmail(email, name, tempPassword)` — triggered when admin creates a new user

### User Model (`server/models/User.js`)

New fields:
- `isActive: Boolean` (default `true`) — deactivated users cannot log in
- `otp: String` — hashed OTP for forgot-password
- `otpExpiry: Date` — OTP expires after 10 minutes
- `resetToken: String` — short-lived token issued after OTP verification
- `resetTokenExpiry: Date` — token expires after 15 minutes
- Role enum expanded: `["student", "admin", "staff"]`
- Switched to `{ timestamps: true }` for `createdAt` / `updatedAt`

### Request Model (`server/models/Request.js`)

New fields:
- `isArchived: Boolean` (default `false`)
- `archivedAt: Date` (default `null`)

### Auth Controller — New Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/forgot-password` | Send OTP to email |
| `POST` | `/api/auth/verify-reset-otp` | Verify OTP, return `resetToken` |
| `POST` | `/api/auth/reset-password` | Set new password using `resetToken` |
| `GET` | `/api/auth/users` | Admin: list all users |
| `POST` | `/api/auth/users` | Admin: create user with temp password email |
| `PATCH` | `/api/auth/users/:id/toggle-active` | Admin: activate / deactivate |
| `POST` | `/api/auth/users/:id/trigger-reset` | Admin: force password reset OTP |

### Request Controller — New Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/requests/stats` | Aggregate counts for dashboard / reports |
| `GET` | `/api/requests/archived` | All archived requests |

### Audit Controller (`server/controllers/auditController.js`)

New file. Exposes:
- `GET /api/audit` — paginated log, filterable by `action` and `userId`
- `GET /api/audit/recent?count=5` — last N entries for dashboard widget

### Archiving Cron Job (`server/server.js`)

Runs every day at 02:00 server-time. Any request with status `approved` or `completed` and `createdAt` older than 5 years is automatically flagged `isArchived: true`. No data is deleted.

---

## Phase 3 — Frontend Changes

### Login / Forgot Password (`client/src/pages/Landing.jsx`)

The landing page now has three modes: `login`, `register`, `forgot`. The forgot-password flow is a 3-step inline form:

1. Enter email → OTP is sent to that address
2. Enter the 6-digit OTP
3. Enter and confirm new password

Errors are shown inline (no `alert()`). Uses `framer-motion` `AnimatePresence` for step transitions.

### Request Stepper (`client/src/components/RequestStepper.jsx`)

Horizontal progress stepper used in both `AdminRequestReview` and `StudentRequestReview`. Steps:

1. Submitted
2. Under Review
3. Awaiting Signature
4. Approved / Completed (turns red for Declined)

Pass a `status` string prop: e.g. `<RequestStepper status={reqData.status} />`.

### Outside-Philippines Checkbox (`client/src/pages/student/StudentAgreementRequest.jsx`)

When checked, the first file-slot label changes from `"Notarized Authorization Letter"` to `"Consular Notarized Authorization"`. The `outsidePH` boolean is also persisted in `formData` for admin review context.

### Admin Dashboard (`client/src/pages/admin/AdminDashboard.jsx`)

- 4 stat cards (Total, Pending, Approved, Archived) with stagger animation
- Donut chart: status distribution
- Bar chart: NDA vs Agreement volume
- Recent requests table (4 rows, "View All" link)
- Audit activity widget (5 recent logs, "View All" link)

### Admin Reports (`client/src/pages/admin/AdminReports.jsx`)

- Period filter: 7 days / 30 days / 90 days / All time
- 4 KPI cards
- Smart programmatic text summary (no AI)
- Donut chart (status distribution), Bar chart (type breakdown), Line chart (6-month trend)

### Admin Users (`client/src/pages/admin/AdminUsers.jsx`)

Route: `/admin/users`

Features:
- Search by name or email
- Create user form (name, email, role) — sends welcome email with temp password
- Activate / Deactivate toggle per user
- "Reset PW" button to trigger OTP password-reset email for a specific user

### Admin Archives (`client/src/pages/admin/AdminArchives.jsx`)

Route: `/admin/archives`

Read-only table of auto-archived requests. Filterable by type (NDA / Agreement) and searchable by student name / email.

### Admin Audit Trail (`client/src/pages/admin/AdminAuditLog.jsx`)

Route: `/admin/audit`

Full paginated audit log. Filter by action type. Columns: Timestamp, Action, User, Resource, Details, IP.

---

## Phase 4 — Global UI

- **Navbar**: All text-symbol icons replaced with `lucide-react` icons. New nav items: Users, Archives, Audit.
- **Animations**: `@keyframes fadeIn` + `.page-fade-in` utility added to `index.css`. Most new admin pages use `framer-motion` for list and card entrance animations.
- **No emojis** in any new UI code.

---

## Routes Summary

### New Client Routes

| Path | Component | Guard |
|---|---|---|
| `/admin/users` | `AdminUsers` | admin only |
| `/admin/archives` | `AdminArchives` | admin only |
| `/admin/audit` | `AdminAuditLog` | admin only |

### New Server Routes

| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/auth/forgot-password` | public |
| `POST` | `/api/auth/verify-reset-otp` | public |
| `POST` | `/api/auth/reset-password` | public |
| `GET` | `/api/auth/users` | admin JWT |
| `POST` | `/api/auth/users` | admin JWT |
| `PATCH` | `/api/auth/users/:id/toggle-active` | admin JWT |
| `POST` | `/api/auth/users/:id/trigger-reset` | admin JWT |
| `GET` | `/api/requests/stats` | any JWT |
| `GET` | `/api/requests/archived` | admin JWT |
| `GET` | `/api/audit` | admin JWT |
| `GET` | `/api/audit/recent` | admin JWT |

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

## Security Notes

- OTPs are stored **hashed** (bcrypt, 10 rounds) in the database. The plain OTP is only ever sent by email, never stored.
- `resetToken` is a `crypto.randomBytes(32)` hex string with a 15-minute expiry.
- Deactivated users receive a `403 Account is disabled` response on login — JWT is never issued.
- All admin-only endpoints are protected by `authMiddleware` + role check (`req.user.role !== "admin"`).
- Email enumeration on forgot-password is prevented: the endpoint always returns a 200 regardless of whether the email exists.
