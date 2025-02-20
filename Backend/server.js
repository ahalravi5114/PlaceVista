require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const vision = require('@google-cloud/vision'); // Google Cloud Vision API
const { Client } = require("@googlemaps/google-maps-services-js"); // Google Maps API
const axios = require("axios"); // Import axios for proxying requests

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Create HTTP server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://placevista.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✅ Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Middleware
app.use(express.json());
app.use(cors({ 
  origin: ["http://localhost:5173", "https://placevista.onrender.com"],
  methods: ["GET", "POST"],
  credentials: true 
}));

// ✅ Proxy route for external API (Fixes CORS issue)
app.get("/api/chat", async (req, res) => {
  try {
    const userMessage = req.query.msg;
    const response = await axios.get(`https://api.monkedev.com/fun/chat?msg=${encodeURIComponent(userMessage)}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching chat response:", error);
    res.status(500).json({ error: "Failed to fetch chat response" });
  }
});

// ✅ SOCKET.IO Chat Handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message", async (msg) => {
    try {
      const { userId, text, imageUrl, location } = msg;

      if (!userId) {
        console.error("Missing userId in message:", msg);
        return;
      }

      // Save message to PostgreSQL
      const result = await pool.query(
        "INSERT INTO messages (user_id, text, image_url, location) VALUES ($1, $2, $3, $4) RETURNING *",
        [userId, text || null, imageUrl || null, location || null]
      );

      const savedMessage = result.rows[0];

      // Emit only the saved message
      io.emit("message", savedMessage);
    } catch (error) {
      console.error("Database error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// ✅ SIGNUP Route
app.post("/signup", async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (fullname, email, password) VALUES ($1, $2, $3) RETURNING id, fullname, email",
      [fullname, email, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ✅ LOGIN Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });

    const isValidPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!isValidPassword) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login successful", token, user: user.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ✅ Start server with Socket.io
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
