import { useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      navigate("/dashboard");
    }
  }, [navigate]);
  const handleLoginClick = () => {
        navigate("/login");
       };

       return (
        <div className="home-container">
          {/* Hero Section */}
          <header className="hero-section">
            <h1 className="hero-title">Welcome to ZataExplorer</h1>
            <p className="hero-description">
              Your ultimate cloud storage solution – store, organize, and access your files effortlessly.
            </p>
            <button onClick={handleLoginClick} className="cta-button">Get Started</button>
          </header>
    
          {/* Features Section */}
          <section className="features-section">
            <h2 className="section-title">Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <h3>Effortless Upload</h3>
                <p>Upload your files seamlessly and manage them with a user-friendly interface.</p>
              </div>
              <div className="feature-card">
                <h3>Secure and Reliable</h3>
                <p>Your data is encrypted and safely stored in the cloud, ensuring maximum security.</p>
              </div>
              <div className="feature-card">
                <h3>Access Anywhere</h3>
                <p>Access your files from any device, at any time, from anywhere in the world.</p>
              </div>
            </div>
          </section>
    
          
          <section className="how-it-works-section">
            <h2 className="section-title">How It Works</h2>
            <div className="steps-container">
              <div className="step">
                <h3>Step 1: Upload Files</h3>
                <p>Drag and drop your files directly into ZataExplorer and have them uploaded instantly.</p>
              </div>
              <div className="step">
                <h3>Step 2: Organize</h3>
                <p>Place files into folders, tag them, and make searching a breeze.</p>
              </div>
              <div className="step">
                <h3>Step 3: Access Anytime</h3>
                <p>Retrieve your files on any device, whenever you need them, securely and quickly.</p>
              </div>
            </div>
          </section>
    
          {/* Footer */}
          <footer className="footer">
            <p>&copy; {new Date().getFullYear()} ZataExplorer. All rights reserved.</p>
          </footer>
        </div>
      );
    };

export default HomePage;

