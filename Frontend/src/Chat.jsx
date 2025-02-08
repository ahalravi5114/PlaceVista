import { useState, useEffect, useRef } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/solid";
import Avatar from "react-avatar";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import ImageUpload from "./ImageUpload";

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

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    console.log("📤 Sending message:", input);

    let botReply = null;
    const lowerInput = input.toLowerCase();

    if (["hi", "hello", "hey"].includes(lowerInput)) {
      botReply = "Hello! How can I assist you today? 😊";
    } else if (lowerInput.includes("where am i")) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
              .then((res) => res.json())
              .then((data) => {
                const locationMessage = {
                  id: Date.now(),
                  text: `📍 You are at ${data.display_name}`,
                  sender: "Bot",
                  time: new Date().toLocaleTimeString(),
                };
                setMessages((prev) => [...prev, locationMessage]);
                socket.emit("message", locationMessage);
              })
              .catch(() => sendBotMessage("I found your coordinates but couldn't fetch your exact address."));
          },
          () => sendBotMessage("Sorry, I couldn't fetch your location. Please check your GPS settings.")
        );
      } else {
        sendBotMessage("Your browser does not support geolocation.");
      }
    } else if (lowerInput.includes("search image")) {
      botReply = "🔍 Please upload an image, and I'll try to find relevant results.";
    }

    const newMessage = {
      id: Date.now(),
      text: input,
      sender: "You",
      time: new Date().toLocaleTimeString(),
    };

    socket.emit("message", newMessage);
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    if (botReply) {
      sendBotMessage(botReply);
    }
  };

  const sendBotMessage = (message) => {
    const botResponse = {
      id: Date.now(),
      text: message,
      sender: "Bot",
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, botResponse]);
    socket.emit("message", botResponse);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-indigo-700 to-yellow-500">
      <div className="w-64 bg-gradient-to-br from-indigo-700 to-yellow-500 text-white p-4 hidden md:flex flex-col">
        <h2 className="text-xl font-bold">PlaceVista</h2>
        <p className="mt-4 text-gray-400">Chat History</p>
        <ul className="mt-2 space-y-2">
          <li className="p-2 bg-indigo-700 rounded-lg cursor-pointer">Recent Chat</li>
        </ul>
      </div>

      <motion.div className="flex-1 flex flex-col items-center bg-white max-w-full mx-auto p-6">
        <div className="bg-yellow-600 text-white p-4 w-full text-center font-bold text-xl rounded-t-2xl">
          PlaceVista Chat
        </div>

        <div className="flex-1 w-full p-4 overflow-y-auto space-y-4 scrollbar-hide">
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender !== "You" && <Avatar name={msg.sender} size="40" round className="mr-2" />}
              <div className={`p-3 max-w-xs text-white rounded-lg shadow-lg ${msg.sender === "You" ? "bg-indigo-600 ml-2" : "bg-yellow-500 mr-2"}`}>
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs text-gray-200 mt-1 text-right">{msg.time}</p>
              </div>
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <ImageUpload onUpload={(imageUrl, location) => {
          const imageMessage = {
            id: Date.now(),
            text: `📷 Image Uploaded (${location || "Unknown Location"})`,
            sender: "You",
            imageUrl,
            location,
            time: new Date().toLocaleTimeString(),
          };
          socket.emit("message", imageMessage);
          setMessages((prev) => [...prev, imageMessage]);
        }} />

        <form onSubmit={sendMessage} className="p-4 w-full bg-gray-100 flex items-center rounded-b-2xl shadow-inner">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-yellow-600 text-gray-700"
            placeholder="Type your message..."
          />
          <button type="submit" className="ml-2 bg-yellow-600 text-white p-2 rounded-lg hover:bg-yellow-700">
            <PaperAirplaneIcon className="w-6 h-6" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Chat;
