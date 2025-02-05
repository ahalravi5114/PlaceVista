require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http"); // Import HTTP module
const { Server } = require("socket.io"); // Import Socket.io

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Needed for NeonDB
});

// Middleware
app.use(express.json());
app.use(cors());

// 🟢 SIGNUP Route
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

// 🟢 LOGIN Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Login request received for:", email);

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      console.log("User not found in database");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    console.log("User found:", user.rows[0]);

    const isValidPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!isValidPassword) {
      console.log("Password incorrect");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login successful", token, user: user.rows[0] });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// 🟢 SOCKET.IO Chat Handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message", (msg) => {
    io.emit("message", msg); // Broadcast message to all users
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Start server with Socket.io
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
