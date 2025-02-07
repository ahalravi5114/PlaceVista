import { useState, useEffect, useRef } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/solid";
import Avatar from "react-avatar";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import ImageUpload from "./ImageUpload";

const socket = io("https://placevista.onrender.com");

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("https://placevista.onrender.com/messages");
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    socket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    return () => {
      socket.off("message");
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: input,
      sender: "You",
      time: new Date().toLocaleTimeString(),
    };

    socket.emit("message", newMessage);
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
  };

  const handleImageUpload = (imageUrl, location) => {
    const imageMessage = {
      id: Date.now(),
      text: "📷 Image Uploaded",
      sender: "You",
      imageUrl,
      location,
      time: new Date().toLocaleTimeString(),
    };

    socket.emit("message", imageMessage);
    setMessages((prev) => [...prev, imageMessage]);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-indigo-700 to-yellow-500">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center bg-white max-w-full mx-auto p-6"
      >
        <div className="bg-yellow-600 text-white p-4 w-full text-center font-bold text-xl rounded-t-2xl">
          PlaceVista Chat
        </div>
        <div className="flex-1 w-full p-4 overflow-y-auto space-y-4 scrollbar-hide">
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: msg.sender === "You" ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center ${msg.sender === "You" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender !== "You" && <Avatar name={msg.sender} size="40" round className="mr-2" />}
              <div
                className={`p-3 max-w-xs text-white rounded-lg shadow-lg ${
                  msg.sender === "You" ? "bg-indigo-600 ml-2" : "bg-yellow-500 mr-2"
                }`}
              >
                {msg.imageUrl ? (
                  <>
                    <img src={msg.imageUrl} alt="Uploaded" className="rounded-lg max-w-full" />
                    {msg.location && (
                      <a
                        href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-200 underline"
                      >
                        📍 View on Google Maps
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-sm">{msg.text}</p>
                )}
                <p className="text-xs text-gray-200 mt-1 text-right">{msg.time}</p>
              </div>
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <ImageUpload onUpload={handleImageUpload} />
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
