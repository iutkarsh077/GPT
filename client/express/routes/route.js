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
import { embedFile, getUploadUrl } from "../controllers/S3upload.js";
import GetGithubRepos from "../controllers/GetGithubRepos.js";
import { GetPeopleCollaborate, RemoveCollaborator, SendEmailInvite } from "../controllers/CollaboratePeople.js";

const route = Router();

route.get("/auth/github", AuthUser);
route.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    successRedirect: process.env.FRONT_END_URI,
    failureRedirect: `${process.env.FRONT_END_URI}/auth`,
  }),
);
route.get("/logout", Logout);
route.get("/get-user", GetUser);
route.get("/github/repos", GetGithubRepos);
route.post("/query-resolver", QueryResolver);
route.get("/create-new-session", CreateChatSession);
route.get("/all-chat-session", GetAllChatSessions);
route.get("/get-chat-by-chatid", GetAllChatByChatId);
route.get("/share/:chatId", GetSharedChat);
route.post("/get-upload-url", getUploadUrl);
route.post("/embed-pdf", embedFile);
route.post("/send-email-invite", SendEmailInvite);
route.get("/get-people-collaborate/:chatId", GetPeopleCollaborate);
route.post("/remove-collaborator", RemoveCollaborator);

export default route;
