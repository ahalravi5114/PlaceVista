require("dotenv").config();
const express = require("express");
const cors = require("cors"); // Keep this line only once
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ExifParser = require("exif-parser");

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server);

// **Remove duplicate CORS declaration**
app.use(cors({ origin: "*" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// **Ensure upload directory exists**
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// **Ensure JSON parsing is enabled**
app.use(express.json());

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message", async (msg) => {
    try {
      const { userId, text, imageUrl, location } = msg;
      if (!userId) return;
      const result = await pool.query(
        "INSERT INTO messages (user_id, text, image_url, location) VALUES ($1, $2, $3, $4) RETURNING *",
        [userId, text || null, imageUrl || null, location || null]
      );
      io.emit("message", result.rows[0]);
    } catch (error) {
      console.error("Database error:", error);
    }
  });

  socket.on("disconnect", () => console.log("User disconnected"));
});

app.post("/signup", async (req, res) => {
  const { fullname, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (fullname, email, password) VALUES ($1, $2, $3) RETURNING id, fullname, email",
      [fullname, email, hashedPassword]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });
    const isValidPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!isValidPassword) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: user.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const imageUrl = `/uploads/${req.file.filename}`;
  let location = null;
  const buffer = fs.readFileSync(req.file.path);
  const parser = ExifParser.create(buffer);
  const result = parser.parse();
  if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
    location = {
      latitude: result.tags.GPSLatitude,
      longitude: result.tags.GPSLongitude,
    };
  }

  try {
    const dbResult = await pool.query(
      "INSERT INTO images (filename, image_url, location) VALUES ($1, $2, $3) RETURNING *",
      [req.file.filename, imageUrl, location]
    );
    res.json({ imageUrl, image: dbResult.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

server.listen(PORT, () => console.log(`Server running on https://placevista.onrender.com`));
