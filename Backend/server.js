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

// ✅ Chatbot using Gemini API
test = async function callGeminiChatbot(message) {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText",
      { prompt: message },
      { params: { key: process.env.GEMINI_API_KEY } }
    );
    return response.data.candidates[0].output || "I didn't understand that.";
  } catch (error) {
    console.error("❌ Error with Gemini chatbot:", error);
    return "Error fetching chatbot response.";
  }
};

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await callGeminiChatbot(message);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: "Chatbot error" });
  }
});

// ✅ Image Recognition using Gemini Vision API
app.post("/api/image-location", multer().single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const base64Image = req.file.buffer.toString("base64");
    const response = await axios.post(
      "https://vision.googleapis.com/v1/images:annotate",
      {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "LANDMARK_DETECTION" }],
          },
        ],
      },
      { params: { key: process.env.GEMINI_API_KEY } }
    );

    const landmarks = response.data.responses[0]?.landmarkAnnotations || [];
    const location = landmarks.length > 0 ? landmarks[0].description : "Unknown location";

    res.json({ location });
  } catch (error) {
    console.error("❌ Image recognition error:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// ✅ Voice-to-Text using Gemini Speech API
app.post("/api/voice-to-text", multer().single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio uploaded" });

    const audioBytes = req.file.buffer.toString("base64");
    const response = await axios.post(
      "https://speech.googleapis.com/v1/speech:recognize",
      {
        config: { encoding: "LINEAR16", sampleRateHertz: 16000, languageCode: "en-US" },
        audio: { content: audioBytes },
      },
      { params: { key: process.env.GEMINI_API_KEY } }
    );

    const transcription = response.data.results?.map(r => r.alternatives[0].transcript).join(" ") || "Could not understand audio";

    res.json({ text: transcription });
  } catch (error) {
    console.error("❌ Voice processing error:", error);
    res.status(500).json({ error: "Failed to process audio" });
  }
});

// ✅ GET MESSAGES Route
app.get("/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, text, sender, created_at FROM messages ORDER BY created_at ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
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
