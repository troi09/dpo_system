# RTU DPO System – Post-Implementation Setup Guide

This document outlines everything you need to do to complete the setup after the code changes have been deployed.

---

## 1. Environment Variables

### Server (`server/.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/dpo_system
JWT_SECRET=<your-long-random-secret>

# Google SMTP (Gmail App Password – see Section 3)
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password

# Frontend URL (used in password-reset emails)
FRONTEND_URL=https://your-frontend-domain.com
```

### Client (`client/.env`)

```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

---

## 2. Install Dependencies

Run these commands from the repository root:

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

New packages added:
- **server**: `nodemailer@^8.0.1`, `node-cron@^4.2.1`, `express-rate-limit@^8.3.0`
- **client**: `recharts`, `lucide-react`, `framer-motion`

---

## 3. Gmail SMTP Setup (App Password)

The system uses Gmail to send OTP emails, password reset links, and status notifications.

1. Sign in to the Gmail account you want to use as the sender.
2. Go to **Google Account → Security → 2-Step Verification** (must be enabled).
3. Scroll down to **App Passwords** → create a new app password (name it "RTU DPO System").
4. Copy the generated 16-character password.
5. Set `SMTP_USER` to the Gmail address and `SMTP_PASS` to this app password in `server/.env`.

> **Important:** Never commit the `.env` file. It is already in `.gitignore`.

---

## 4. MongoDB – Schema Changes

The following models have been updated. **Existing data is NOT affected** (all new fields have defaults):

### User model
New fields:
- `isActive` (Boolean, default: `true`) – deactivated users cannot log in
- `role` now accepts `"staff"` in addition to `"student"` and `"admin"`
- `otp`, `otpExpiry` – for login OTP flow
- `resetToken`, `resetTokenExpiry` – for password reset

### Request model
New field:
- `isArchived` (Boolean, default: `false`) – set by the 5-year cron job

### New model: AuditLog
Stores system events: `userId`, `action`, `details`, `createdAt`.

---

## 5. New Features – How to Use

### 5.1 Login with OTP
1. User enters email + password on the Login screen.
2. If credentials are valid, a 6-digit OTP is emailed to the user.
3. User enters the OTP on the verification screen.
4. OTPs expire after **10 minutes**.

### 5.2 Forgot Password
1. Click "Forgot Password?" on the Login screen.
2. Enter email; a reset link is emailed.
3. Follow the link to `/reset-password?token=...` to set a new password.
4. Reset links expire after **1 hour**.

### 5.3 Admin – Manage Users (`/admin/users`)
- View all users in a data table.
- Create new users with any role (Student, Staff, Admin).
- Activate/Deactivate users.
- Trigger password reset emails for any user.

### 5.4 Admin – Archives (`/admin/archives`)
- Displays requests that have been archived by the 5-year retention cron job.
- Searchable by name, email, or serial number.
- Read-only; no actions are available on archived records.

### 5.5 Dashboard Charts
- **Donut chart**: Live request status distribution.
- **Bar chart**: Document types submitted this month.
- **Recent Activity**: Last 5 audit log entries.
- **Recent Requests**: 4 most recent requests with a "View All" link.

### 5.6 Reports & Analytics (`/admin/reports`)
- Filter by **month** and **year**.
- Donut + Bar charts update with the selected period.
- Monthly trend line chart for the selected year.
- Smart programmatic summary below charts.

### 5.7 Request Stepper (Student View)
When students view a request, a horizontal stepper shows the current phase:
- Submitted → Under Review → Awaiting Signature → Approved

### 5.8 Outside Philippines (Agreement Form)
- A checkbox on the Agreement request form: "Is the requestee located outside of the Philippines?"
- When checked, the first file requirement changes from "Notarized Authorization Letter" to "Consular Notarized Authorization Letter".

---

## 6. 5-Year Archiving Cron Job

The cron job runs **every day at 02:00 UTC**.

It automatically sets `isArchived: true` on any request that:
- Has `status === "approved"`
- Was created more than 5 years ago

Archived requests no longer appear in the active request lists but are visible in `/admin/archives`.

---

## 7. Audit Trail

All of the following events are logged to the `AuditLog` collection:
- `ACCOUNT_CREATED`
- `LOGIN_OTP_SENT`
- `USER_LOGIN`
- `PASSWORD_RESET_REQUESTED`
- `PASSWORD_CHANGED`
- `PASSWORD_RESET_TRIGGERED`
- `ACCOUNT_ACTIVATED` / `ACCOUNT_DEACTIVATED`
- `REQUEST_SUBMITTED`
- `REQUEST_RESUBMITTED`
- `REQUEST_APPROVED` / `REQUEST_REVISION_REQUIRED`
- `DOCUMENT_UPLOADED`

The audit trail is accessible via `GET /api/audit` (admin-only) and displayed as a widget on the Admin Dashboard.

---

## 8. Roles Summary

| Role    | Access |
|---------|--------|
| student | `/student/*` routes – create requests, view own requests |
| staff   | `/admin/*` routes (except Users + Archives) – can review requests |
| admin   | All routes including Users + Archives management |

---

## 9. Deployment Checklist

- [ ] Set all environment variables in production
- [ ] Configure Gmail App Password for SMTP
- [ ] Set `FRONTEND_URL` to the correct frontend URL (for reset links)
- [ ] Ensure MongoDB Atlas allows connections from your server's IP
- [ ] Run `npm install` in both `server/` and `client/`
- [ ] Build client: `cd client && npm run build`
- [ ] Serve the `client/dist` folder via a static file server or CDN
- [ ] Start the server: `cd server && node server.js` (or use PM2/Render)

---

## 10. Running Locally

```bash
# Terminal 1 – Backend
cd server
cp .env.example .env   # fill in your values
npm run dev            # starts with nodemon on port 5000

# Terminal 2 – Frontend
cd client
cp .env.example .env   # set VITE_API_BASE_URL=http://localhost:5000
npm run dev            # starts on port 5173
```
