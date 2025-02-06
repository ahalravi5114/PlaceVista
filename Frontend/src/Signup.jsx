import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Signup = () => {
  const [fullname, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Signing up with:",fullname,email,password);
    navigate("/chat");
  
    try {
      const response = await fetch("https://placevista.onrender.com/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, email, password }),
      });
  
      const data = await response.json();
      if (response.ok) {
        alert("Signup successful! Please log in.");
        navigate("/login");
      } else {
        alert(data.error || "Signup failed");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Signup failed");
    }
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-600 to-yellow-500">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-extrabold text-center text-yellow-600 mb-6">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={fullname}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
            required
          />
          <button type="submit" className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-md hover:bg-yellow-700 transition">
            Sign Up
          </button>
        </form>
        <p className="text-center text-gray-700 mt-4">
          Already have an account? <Link to="/login" className="text-yellow-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
