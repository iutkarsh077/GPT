import "dotenv/config";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import axios from "axios";
import User from "../models/User.js";

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

async function resolveGithubEmail(accessToken) {
  try {
    const { data } = await axios.get("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "gpt-app",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const primary =
      data.find((email) => email.primary && email.verified) ||
      data.find((email) => email.verified) ||
      data.find((email) => email.primary) ||
      data[0];

    return primary?.email || null;
  } catch (error) {
    console.log(
      "GitHub email fetch failed:",
      error.response?.status,
      error.response?.data || error.message,
    );
    return null;
  }
}

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/auth/github/callback",
      // Do not put user:email here — passport-github2 hard-fails if its
      // built-in /user/emails call errors. Request that scope in AuthUser instead.
      scope: ["read:user", "repo"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const username = profile.username;
        const email =
          profile.emails?.[0]?.value || (await resolveGithubEmail(accessToken));
        const displayName = profile.displayName || username;
        const avatar = profile.photos?.[0]?.value || null;
        const profileUrl =
          profile.profileUrl || (username ? `https://github.com/${username}` : null);

        const user = await User.findOneAndUpdate(
          { githubId: profile.id },
          {
            githubId: profile.id,
            username,
            email,
            displayName,
            avatar,
            profileUrl,
            githubAccessToken: accessToken,
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
