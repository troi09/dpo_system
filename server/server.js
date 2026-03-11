const express = require("express");
const cors = require("cors");
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
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/+$/, ""))
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, curl)
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, "");
    if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Handle preflight for all routes explicitly (required by some edge runtimes)
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// DB Connection
connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/audit", auditRoutes);

// ── 5-year retention cron job (runs daily at 02:00) ──────────────────────────
// Flags approved/completed requests older than 5 years as isArchived=true
cron.schedule("0 2 * * *", async () => {
  try {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const Request = require("./models/Request");
    const result = await Request.updateMany(
      {
        isArchived: false,
        status: { $in: ["approved", "completed"] },
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