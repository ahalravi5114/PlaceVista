import React, { useState, useEffect, useRef } from "react";
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  CameraIcon,
} from "@heroicons/react/solid";
import Avatar from "react-avatar";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import axios from "axios";

const socket = io("https://placevista.onrender.com", {
  transports: ["websocket", "polling"],
});

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("🔌 Connecting to Socket.io...");

    const handleMessageReceived = (message) => {
      console.log("📨 New message received:", message);
      setMessages((prevMessages) => [...prevMessages, message]);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    socket.on("message", handleMessageReceived);

    return () => {
      socket.off("message", handleMessageReceived);
    };
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);

    const newMessage = {
      id: Date.now(),
      text: input,
      sender: "You",
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      const response = await axios.post("/api/chat", { message: input });
      const botMessage = {
        id: Date.now() + 1,
        text: response.data.reply,
        sender: "Bot",
        time: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("❌ Error fetching Gemini response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Error fetching chatbot response.",
          sender: "Bot",
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAudioInput = () => {
    const recognition =
      new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage({ preventDefault: () => {} });
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        alert("No speech was detected. Please try again.");
      }
    };
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const imageUrl = reader.result;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "📷 Image Uploaded",
          sender: "You",
          imageUrl,
          time: new Date().toLocaleTimeString(),
        },
      ]);

      try {
        const formData = new FormData();
        formData.append("image", file);
        const response = await axios.post("/api/image-location", formData);

        const location = response.data.location;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: `🗺️ Location: ${location}`,
            sender: "Bot",
            time: new Date().toLocaleTimeString(),
          },
        ]);
      } catch (error) {
        console.error("❌ Error analyzing image:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: "❌ Error analyzing image.",
            sender: "Bot",
            time: new Date().toLocaleTimeString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-indigo-700 to-yellow-500">
      <motion.div className="flex-1 flex flex-col items-center bg-white w-full max-w-full mx-auto p-6">
        <div className="bg-yellow-600 text-white p-4 w-full text-center font-bold text-xl rounded-t-2xl">
          PlaceVista Chat
        </div>

        <div className="flex-1 w-full p-4 overflow-y-auto space-y-4 scrollbar-hide">
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              className={`flex ${
                msg.sender === "You" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender !== "You" && (
                <Avatar name={msg.sender} size="40" round className="mr-2" />
              )}
              <div
                className={`p-3 max-w-xs text-white rounded-lg shadow-lg ${
                  msg.sender === "You" ? "bg-indigo-600 ml-2" : "bg-yellow-500 mr-2"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs text-gray-200 mt-1 text-right">{msg.time}</p>
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Uploaded"
                    className="mt-2 rounded-lg"
                    style={{ maxWidth: "100px" }}
                  />
                )}
              </div>
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {loading && <p>Loading...</p>}

        <form
          onSubmit={sendMessage}
          className="p-4 w-full bg-gray-100 flex items-center rounded-b-2xl shadow-inner space-y-4"
        >
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleAudioInput}
              className="w-10 h-10 flex items-center justify-center bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="w-10 h-10 flex items-center justify-center bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 cursor-pointer"
            >
              <CameraIcon className="w-5 h-5" />
            </label>
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded-lg ml-4"
            placeholder="Type your message..."
          />

          <button
            type="submit"
            className="w-10 h-10 flex items-center justify-center bg-yellow-600 text-white rounded-lg ml-2 hover:bg-yellow-700"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Chat;