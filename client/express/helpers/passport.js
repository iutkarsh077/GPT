import "dotenv/config";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await User.findOneAndUpdate(
          { googleId: profile.id },
          {
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );

        done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ),
);
