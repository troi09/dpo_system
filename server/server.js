const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config();

const mongoose = require("mongoose");
const dns = require("node:dns"); // 1. Import dns module

// 2. Explicitly set DNS servers before connecting
dns.setServers(["8.8.8.8", "8.8.4.4"]); 


const connectDB = require("./config/db");
const Request = require("./models/Request");

const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("DPO System API Running...");
});

// ─── 5-Year Document Retention Cron Job ──────────────────────────────────────
// Runs every day at 02:00 UTC; marks approved requests older than 5 years as archived.
cron.schedule("0 2 * * *", async () => {
  try {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const result = await Request.updateMany(
      {
        status: "approved",
        isArchived: false,
        createdAt: { $lt: fiveYearsAgo },
      },
      { $set: { isArchived: true } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[archive-cron] Archived ${result.modifiedCount} request(s) older than 5 years.`
      );
    }
  } catch (err) {
    console.error("[archive-cron] Error:", err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});