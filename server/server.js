const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const mongoose = require("mongoose");
const dns = require("node:dns");
const cron = require("node-cron");

// Explicitly set DNS servers before connecting
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");
const auditRoutes = require("./routes/auditRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOriginsFromEnv = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/+$/, ""))
  : [];

const defaultLocalOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
]
  .filter(Boolean)
  .map((o) => String(o).trim().replace(/\/+$/, ""));

const allowedOrigins = [...new Set([...allowedOriginsFromEnv, ...defaultLocalOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, curl)
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, "");
    if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    // Return a CORS deny without throwing a generic 500.
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Handle preflight for all routes explicitly (required by some edge runtimes)
app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(express.json());

// Express 5 compatibility: sanitize request payloads without reassigning req.query.
const sanitizeForNoSql = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeForNoSql);
  if (!value || typeof value !== "object") return value;

  const cleaned = {};
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    cleaned[key] = sanitizeForNoSql(val);
  }
  return cleaned;
};

app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeForNoSql(req.body);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeForNoSql(req.params);
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

// DB Connection
connectDB();

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/audit", auditRoutes);

// Centralized error handler to avoid opaque 500 responses.
app.use((err, req, res, next) => {
  if (!err) return next();
  console.error("[Server Error]", err.message);
  return res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// ── 5-year retention cron job (runs daily at 02:00) ──────────────────────────
// Flags final approved requests older than 5 years as isArchived=true
cron.schedule("0 2 * * *", async () => {
  try {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const Request = require("./models/Request");
    const result = await Request.updateMany(
      {
        isArchived: false,
        status: { $in: ["nda_approved", "agreement_approved"] },
        createdAt: { $lte: fiveYearsAgo },
      },
      { $set: { isArchived: true, archivedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Archive Job] Archived ${result.modifiedCount} requests (5-year retention policy).`);
    }
  } catch (err) {
    console.error("[Archive Job] Error:", err.message);
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("DPO System API Running...");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});