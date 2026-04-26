import passport from "passport";

const AuthUser = passport.authenticate("google", {
  scope: ["profile", "email"],
});

export default AuthUser;
