import "dotenv/config";
import axios from "axios";
import ChatSession, { Chat } from "../models/Chat_Session.js";
import User from "../models/User.js";
import {
  createChatSessionForUser,
  MAX_CHAT_SESSIONS_PER_USER,
} from "./CreateChatSession.js";
import {
  canAccessChatSession,
  isChatOwner,
  normalizePeopleCollaborateIfNeeded,
} from "../helpers/chatAccess.js";
import { emitToChat } from "../helpers/socket.js";

const python_uri = process.env.PYTHON_BACKEND_URI;
const MAX_CHATS_PER_SESSION = 4;

const QueryResolver = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }
    let { query, chatId, isGithubAgentOn } = req.body;
    const agentOn = isGithubAgentOn === true;

    if (!query) {
      return res.status(400).json({
        message: "Query is required",
        status: false,
      });
    }

    if (!chatId?.chatId) {
      const newChatSession = await createChatSessionForUser(req.user._id);
      chatId = {
        chatId: newChatSession.chatId,
        title: newChatSession.title,
      };
    }

    const chatSession = await ChatSession.findOne({
      chatId: chatId.chatId,
    });

    if (!chatSession) {
      return res.status(404).json({
        message: "Chat session not found",
        status: false,
      });
    }

    if (normalizePeopleCollaborateIfNeeded(chatSession)) {
      await chatSession.save();
    }

    if (!canAccessChatSession(chatSession, req.user)) {
      if (!req.user.email && chatSession.peopleCollaborate?.length > 0) {
        return res.status(403).json({
          message:
            "Your account has no email; collaboration requires a verified GitHub email.",
          status: false,
        });
      }

      return res.status(403).json({
        message: "You don't have access to this chat",
        status: false,
      });
    }

    // if (chatSession.chats.length >= MAX_CHATS_PER_SESSION) {
    //   return res.status(403).json({
    //     message: `Each chat session supports only ${MAX_CHATS_PER_SESSION} conversations due to token limits. Please create a new session.`,
    //     status: false,
    //   });
    // }

    let answer = "";
    let latestChats = [];
    let owner = null;

    if (agentOn) {
      latestChats = await Chat.find(
        {
          chatSession: chatSession._id,
        },
        { query: 1, content: 1, _id: 0 },
      )
        .limit(10)
        .sort({ createdAt: -1 });

      owner = await User.findById(chatSession.user).select(
        "+githubAccessToken username displayName",
      );

      if (!owner) {
        return res.status(500).json({
          status: false,
          message: "Chat owner account not found",
        });
      }

      const actingAsCollaborator = !isChatOwner(chatSession, req.user);
      if (actingAsCollaborator && !owner.githubAccessToken) {
        return res.status(403).json({
          status: false,
          message:
            "Chat owner has no GitHub access token. Ask the owner to sign in with GitHub again.",
        });
      }
    }

    emitToChat(chatSession.chatId, "chat:query-started", {
      chatId: chatSession.chatId,
      query,
      userId: String(req.user._id),
      displayName: req.user.displayName || req.user.username || "User",
      avatar: req.user.avatar || null,
    });

    if (agentOn) {
      const result = await axios.post(
        `${python_uri}/query`,
        {
          query,
          chat_id: chatId.chatId,
          user_info: {
            _id: req.user._id,
            username: req.user.username,
            displayName: req.user.displayName,
            email: req.user.email,
            avatar: req.user.avatar,
          },
          user_id: String(chatSession.user),
          chat_title: chatId.title,
          latestChats: latestChats.reverse(),
          github_access_token: owner.githubAccessToken || null,
          github_username: owner.username || null,
        },
        { timeout: 180000 },
      );

      answer = result.data.data;

      if (chatId.title === "New Chat") {
        chatSession.title = result.data.chat_title;
      }
    } else if (chatId.title === "New Chat") {
      chatSession.title = query.trim().slice(0, 40);
    }

    const saveChat = await Chat.create({
      user: req.user._id,
      chatSession: chatSession._id,
      content: answer,
      query: query,
    });

    chatSession.chats.push(saveChat._id);
    await chatSession.save();

    const messagePayload = {
      chatId: chatSession.chatId,
      message: {
        _id: String(saveChat._id),
        user: String(req.user._id),
        query: saveChat.query,
        content: saveChat.content,
        createdAt: saveChat.createdAt,
        senderAvatar: req.user.avatar || null,
        senderName:
          req.user.displayName || req.user.username || "User",
      },
      chatSession: {
        chatId: chatSession.chatId,
        title: chatSession.title,
        ownerId: String(chatSession.user),
      },
    };

    emitToChat(chatSession.chatId, "chat:message", messagePayload);

    return res.status(200).json({
      message: "Query Resolved Successfully",
      status: true,
      data: answer,
      chatSession: messagePayload.chatSession,
      messageId: String(saveChat._id),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ChatSessionLimitError") {
      return res.status(403).json({
        message: `You can create only ${MAX_CHAT_SESSIONS_PER_USER} chat sessions due to token limits.`,
        status: false,
      });
    }

    // Clear pending state for collaborators if the query failed after start
    try {
      const failedChatId = req.body?.chatId?.chatId;
      if (failedChatId && req.user) {
        emitToChat(failedChatId, "chat:query-failed", {
          chatId: failedChatId,
          userId: String(req.user._id),
        });
      }
    } catch {
      // ignore emit errors
    }

    console.log(error.response?.data || error.message);
    return res.status(500).json({
      message: "Internal Server error, Please try again after some time",
      status: false,
    });
  }
};

export default QueryResolver;
