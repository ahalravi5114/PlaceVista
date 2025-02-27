import { useState, useEffect, useRef } from "react";
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  CameraIcon,
  PaperClipIcon,
} from "@heroicons/react/solid";
import Avatar from "react-avatar";
import { io } from "socket.io-client";
import { motion } from "framer-motion";

const socket = io("https://placevista.onrender.com", {
  transports: ["websocket", "polling"],
});

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    console.log("🔌 Connecting to Socket.io...");

    const fetchMessages = async () => {
      try {
        const response = await fetch("https://placevista.onrender.com/messages");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error("❌ Error fetching messages:", error);
      }
    };

    fetchMessages();

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

    console.log("📤 Sending message:", input);

    const newMessage = {
      id: Date.now(),
      text: input,
      sender: "You",
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      let apiUrl = `https://api.monkedev.com/fun/chat?msg=${encodeURIComponent(input)}`;

      if (input.toLowerCase().includes("where am i")) {
        apiUrl = "https://ipapi.co/json/";
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      let botMessage = {
        id: Date.now() + 1,
        text: input.toLowerCase().includes("where am i")
          ? `📍 You are at: ${data.city}, ${data.region}, ${data.country_name}`
          : data.response,
        sender: "Bot",
        time: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("❌ Error fetching chatbot response:", error);
    }
  };

  const handleAudioInput = () => {
    const recognition =
      new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      setInput(event.results[0][0].transcript);
    };

    recognition.onerror = () => {
      console.error("Speech recognition error.");
    };
  };

  const handleCameraCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const imageUrl = reader.result;
        const imageMessage = {
          id: Date.now(),
          text: "📷 Image Uploaded",
          sender: "You",
          imageUrl,
          time: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, imageMessage]);

        try {
          const formData = new FormData();
          formData.append("image", file);

          const response = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            headers: {
              apikey: "YOUR_OCR_API_KEY",
            },
            body: formData,
          });

          if (!response.ok) throw new Error("Image processing failed");

          const result = await response.json();
          const detectedText = result.ParsedResults[0]?.ParsedText || "Unknown";

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              text: `🗺️ Location detected: ${detectedText}`,
              sender: "Bot",
              time: new Date().toLocaleTimeString(),
            },
          ]);
        } catch (error) {
          console.error("❌ Error detecting location from image:", error);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
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
            <button
              type="button"
              onClick={handleCameraCapture}
              className="w-10 h-10 flex items-center justify-center bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <CameraIcon className="w-5 h-5" />
            </button>
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
