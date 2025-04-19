const express = require("express");
const passport = require("passport");
const { signup, login, googleCallback } = require("../controllers/auth.controller");
require("../config/passport");

const router = express.Router();

// Auth routes
router.post("/signup", signup);
router.post("/login", login);

// Google OAuth routes
router.get("/google", passport.authenticate("google", { 
  scope: ["profile", "email"] 
}));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleCallback
);

module.exports = router;