const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require('../config/db');

// Handle user signup
const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [username, email, hashedPassword]
    );

    res.status(201).json({ 
      message: "User registered", 
      user: {
        username: newUser.rows[0].username,
        email: newUser.rows[0].email
      }
    });
  } catch (err) {
    console.error("❌ Signup failed:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Handle user login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { 
        id: user.rows[0].id,
        username: user.rows[0].username,
        email: user.rows[0].email
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1d" }
    );

    res.json({ 
      message: "Login successful", 
      token,
      user: {
        username: user.rows[0].username,
        email: user.rows[0].email
      }
    });
  } catch (err) {
    console.error("❌ Login failed:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Handle Google OAuth callback
const googleCallback = async (req, res) => {
  try {
    const token = jwt.sign(
      { 
        id: req.user.id,
        username: req.user.username || req.user.name,
        email: req.user.email
      }, 
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.redirect(`http://localhost:5173/?token=${token}`);
  } catch (err) {
    console.error("❌ Google auth failed:", err);
    res.redirect(`http://localhost:5173/login?error=auth_failed`);
  }
};

module.exports = {
  signup,
  login,
  googleCallback
};