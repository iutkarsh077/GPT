import passport from "passport";

const AuthUser = passport.authenticate("github", {
  scope: ["read:user", "user:email", "repo"],
  allow_signup: true,
});

export default AuthUser;
