import { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import Login from './Login';

const LandingPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [navbarBg, setNavbarBg] = useState("bg-transparent");
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setNavbarBg("bg-white shadow-lg");
      } else {
        setNavbarBg("bg-transparent");
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle navigation based on signup status
  const handleLoginClick = () => {
    const isSignedUp = localStorage.getItem("isSignedUp");
    if (isSignedUp) {
      navigate("/login");
    } else {
      alert("Please sign up first!");
      navigate("/signup");
    }
  };

  const handleSignupClick = () => {
    localStorage.setItem("isSignedUp", "true"); // Mark user as signed up
    navigate("/signup"); // Navigate to Signup Page
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-r from-indigo-600 to-yellow-500 text-gray-900">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full flex justify-between items-center p-6 transition-all duration-300 ${navbarBg}`}>
        <h1 className="text-3xl font-extrabold text-yellow-600">PlaceVista</h1>
        <div className="md:flex space-x-6 hidden">
          <Link to="/" className="text-gray-700 hover:text-yellow-600 transition font-medium">Home</Link>
          <Link to="/features" className="text-gray-700 hover:text-yellow-600 transition font-medium">Features</Link>
          <Link to="/about" className="text-gray-700 hover:text-yellow-600 transition font-medium">About</Link>
          <button onClick={handleLoginClick} className="px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-md hover:bg-yellow-700 transition font-semibold">Login</button>
        </div>
        <button className="md:hidden text-gray-700" onClick={() => setIsOpen(!isOpen)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`md:hidden bg-white shadow-lg rounded-lg p-4 ${isOpen ? 'block' : 'hidden'}`}>
        <Link to="/" className="block text-gray-700 hover:text-yellow-600 py-2">Home</Link>
        <Link to="/features" className="block text-gray-700 hover:text-yellow-600 py-2">Features</Link>
        <Link to="/about" className="block text-gray-700 hover:text-yellow-600 py-2">About</Link>
        <button onClick={handleLoginClick} className="block text-center py-2 px-4 bg-yellow-600 text-white rounded-lg shadow-md hover:bg-yellow-700 w-full">Login</button>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 bg-gradient-to-r from-blue-500 to-green-400 text-white">
        <h2 className="text-5xl md:text-6xl font-extrabold mb-6">Discover Places with AI</h2>
        <p className="text-lg md:text-xl max-w-2xl mb-6">Upload an image or search for a place to get instant AI-powered insights.</p>
        <button onClick={handleSignupClick} className="px-8 py-3 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 transition">
          Start Exploring
        </button>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white text-gray-900 text-center px-6">
        <h3 className="text-4xl font-semibold text-blue-600 mb-8">Why Choose PlaceVista?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-screen-lg mx-auto">
          {['Instant Search', 'Smart Image Recognition', 'Tailored Recommendations'].map((feature) => (
            <div key={feature} className="p-8 shadow-lg rounded-lg bg-gray-100 hover:shadow-xl transition">
              <h4 className="text-xl font-bold text-yellow-600">{feature}</h4>
              <p className="text-gray-700">Description for {feature} goes here.</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="py-16 bg-gradient-to-r from-yellow-400 to-pink-500 text-white text-center px-6">
        <h3 className="text-2xl font-bold mb-4">Ready to Explore?</h3>
        <p className="text-lg mb-6">Join us today and start your journey with PlaceVista!</p>
        <button onClick={handleSignupClick} className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-yellow-200 transition">
          Sign Up Now
        </button>
      </div>

      {/* Footer */}
      <footer className="p-8 bg-gradient-to-r from-gray-900 to-gray-700 text-white text-center mt-auto">
        <div className="flex justify-center space-x-6 mb-4">
          <Link to="/privacy" className="hover:text-yellow-400">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-yellow-400">Terms of Service</Link>
          <Link to="/contact" className="hover:text-yellow-400">Contact Us</Link>
        </div>
        <p className="text-gray-400">&copy; 2025 PlaceVista. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
