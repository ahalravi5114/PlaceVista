require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const multer = require("multer");
const { Readable } = require("stream");
const speech = require("@google-cloud/speech");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Create HTTP server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://placevista.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://placevista.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ✅ Chatbot API Route
app.get("/api/chat", async (req, res) => {
  try {
    const userMessage = req.query.msg;
    let botResponse = "I didn't understand that.";

    if (userMessage.toLowerCase().includes("where am i")) {
      const locationResponse = await axios.get("https://ipapi.co/json/");
      botResponse = `You are in ${locationResponse.data.city}, ${locationResponse.data.country_name}.`;
    } else {
      const chatResponse = await axios.get(
        `https://api.monkedev.com/fun/chat?msg=${encodeURIComponent(userMessage)}`
      );
      botResponse = chatResponse.data.response;
    }

    res.json({ response: botResponse });
  } catch (error) {
    console.error("❌ Error fetching chat response:", error);
    res.status(500).json({ error: "Failed to fetch chat response" });
  }
});

// ✅ Image Location Detection (Dummy API)
app.post("/api/image-location", async (req, res) => {
  try {
    // Dummy response, replace with actual image processing API
    res.json({ location: "Paris, France" });
  } catch (error) {
    console.error("❌ Error processing image:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// ✅ Voice Note Processing
const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/voice-to-text", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const client = new speech.SpeechClient();
    const audioBytes = req.file.buffer.toString("base64");

    const request = {
      audio: { content: audioBytes },
      config: { encoding: "LINEAR16", sampleRateHertz: 16000, languageCode: "en-US" },
    };

    const [response] = await client.recognize(request);
    const transcription = response.results.map((result) => result.alternatives[0].transcript).join("\n");

    res.json({ text: transcription });
  } catch (error) {
    console.error("❌ Error processing voice:", error);
    res.status(500).json({ error: "Failed to convert voice to text" });
  }
});

// ✅ GET MESSAGES Route
app.get("/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM messages ORDER BY created_at DESC LIMIT 50");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ✅ SOCKET.IO Chat Handling
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("message", async (msg) => {
    try {
      const { userId, text, imageUrl } = msg;

      if (!userId) {
        console.error("❌ Missing userId in message:", msg);
        return;
      }

      // Save message to PostgreSQL
      const result = await pool.query(
        "INSERT INTO messages (user_id, text, image_url) VALUES ($1, $2, $3) RETURNING *",
        [userId, text || null, imageUrl || null]
      );

      const savedMessage = result.rows[0];
      io.emit("message", savedMessage);
    } catch (error) {
      console.error("❌ Database error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected");
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

    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token, user: user.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ✅ Start server with Socket.io
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
