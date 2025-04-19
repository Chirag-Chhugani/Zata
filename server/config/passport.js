const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const passport = require('passport');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;

      let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

      if (user.rows.length === 0) {
        const newUser = await pool.query(
          "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *",
          [profile.displayName, email]
        );
        return done(null, newUser.rows[0]);
      } else {
        return done(null, user.rows[0]);
      }
    } catch (err) {
      return done(err, null);
    }
  }
));

module.exports = passport;
