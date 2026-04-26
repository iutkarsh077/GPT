import "dotenv/config";
import { Router } from "express";
import AuthUser from "../controllers/AuthUser.js";
import passport from "passport";
import Logout from "../controllers/LogoutUser.js";
import GetUser from "../controllers/GetUser.js";
import QueryResolver from "../controllers/QueryResolver.js";
import CreateChatSession from "../controllers/CreateChatSession.js";
import GetAllChatSessions from "../controllers/GetAllChatSessions.js";
import GetAllChatByChatId from "../controllers/GetAllChatByChatId.js";
import GetSharedChat from "../controllers/GetSharedChat.js";

const route = Router();

route.get("/auth/google", AuthUser);
route.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect:process.env.FRONT_END_URI,
    failureRedirect: `${process.env.FRONT_END_URI}/auth`,
  }),
);
route.get("/logout", Logout);
route.get("/get-user", GetUser);
route.post("/query-resolver", QueryResolver);
route.get("/create-new-session", CreateChatSession);
route.get("/all-chat-session", GetAllChatSessions);
route.get("/get-chat-by-chatid", GetAllChatByChatId);
route.get("/share/:chatId", GetSharedChat);

export default route;
