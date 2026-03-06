const express = require("express");
const cors = require("cors");
require("dotenv").config();

const mongoose = require("mongoose");
const dns = require("node:dns"); // 1. Import dns module

// 2. Explicitly set DNS servers before connecting
dns.setServers(["8.8.8.8", "8.8.4.4"]); 


const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("DPO System API Running...");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});