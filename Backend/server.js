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
const fs = require('fs'); // Import the 'fs' module

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } }); // Allow requests from any origin

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Listen for incoming messages
  socket.on("message", async (msg) => {
    try {
      const { userId, text, imageUrl, location } = msg;

      // Save message to PostgreSQL
      const result = await pool.query(
        "INSERT INTO messages (user_id, text, image_url, location) VALUES ($1, $2, $3, $4) RETURNING *",
        [userId, text || null, imageUrl || null, location || null]
      );

      const savedMessage = result.rows[0];

      // Emit the saved message to all clients
      io.emit("message", savedMessage);
    } catch (error) {
      console.error("Database error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});


// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Ensure 'uploads' directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Serve uploaded files statically from the 'uploads' directory
app.use("/uploads", express.static(UPLOADS_DIR));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // Use the UPLOADS_DIR constant
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(cors());

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

// ✅ Upload Image Route
app.post("/upload", upload.single("image"), async (req, res) => {
    console.log("Upload route hit"); // Debugging
    if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
    }

    // Construct the image URL using a relative path
    const imageUrl = `/uploads/${req.file.filename}`;

    try {
        const result = await pool.query(
            "INSERT INTO images (filename, image_url) VALUES ($1, $2) RETURNING *",
            [req.file.filename, imageUrl]
        );

        console.log("Image saved to database:", result.rows[0]);
        res.json({ success: true, imageUrl, image: result.rows[0] });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Database error", details: error.message });
    }
});

// ✅ Fetch Uploaded Images
app.get("/images", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM images ORDER BY uploaded_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ SOCKET.IO Chat Handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message", (msg) => {
    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.get("/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT messages.*, users.fullname FROM messages JOIN users ON messages.user_id = users.id ORDER BY timestamp ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Start server with Socket.io
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
