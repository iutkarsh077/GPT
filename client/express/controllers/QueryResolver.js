import "dotenv/config";
import axios from "axios";
import ChatSession, { Chat } from "../models/Chat_Session.js";
import {
  createChatSessionForUser,
  MAX_CHAT_SESSIONS_PER_USER,
} from "./CreateChatSession.js";

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
    let { query, chatId } = req.body;

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
      user: req.user._id,
    });

    if (!chatSession) {
      return res.status(404).json({
        message: "Chat session not found",
        status: false,
      });
    }

    if (chatSession.chats.length >= MAX_CHATS_PER_SESSION) {
      return res.status(403).json({
        message: `Each chat session supports only ${MAX_CHATS_PER_SESSION} conversations due to token limits. Please create a new session.`,
        status: false,
      });
    }

    const latestChats = await Chat.find(
      {
        chatSession: chatSession._id,
        user: req.user._id,
      },
      { query: 1, content: 1, _id: 0 },
    )
      .sort({ createdAt: -1 })
      .limit(MAX_CHATS_PER_SESSION);

    const result = await axios.post(`${python_uri}/query`, {
      query,
      chat_id: chatId.chatId,
      user_id: String(req.user._id),
      chat_title: chatId.title,
      latestChats: latestChats.reverse(),
    });

    if (chatId.title === "New Chat") {
      chatSession.title = result.data.chat_title;
    }

    const saveChat = await Chat.create({
      user: req.user._id,
      chatSession: chatSession._id,
      content: result.data.data,
      query: query,
    });

    chatSession.chats.push(saveChat._id);
    await chatSession.save();

    console.log("result is: ", result);

    return res.status(200).json({
      message: "Query Resolved Successfully",
      status: true,
      data: result.data.data,
      chatSession: {
        chatId: chatSession.chatId,
        title: chatSession.title,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ChatSessionLimitError") {
      return res.status(403).json({
        message: `You can create only ${MAX_CHAT_SESSIONS_PER_USER} chat sessions due to token limits.`,
        status: false,
      });
    }

    console.log(error.response?.data || error.message);
    return res.status(500).json({
      message: "Internal Server error, Please try again after some time",
      status: false,
    });
  }
};

export default QueryResolver;
