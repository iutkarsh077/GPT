import crypto from "crypto";
import ChatSession from "../models/Chat_Session.js";

export const MAX_CHAT_SESSIONS_PER_USER = 2;

export const createChatSessionForUser = async (userId) => {
  const totalSessions = await ChatSession.countDocuments({ user: userId });

  // if (totalSessions >= MAX_CHAT_SESSIONS_PER_USER) {
  //   const limitError = new Error(
  //     `You can create only ${MAX_CHAT_SESSIONS_PER_USER} chat sessions due to token limits.`,
  //   );
  //   limitError.name = "ChatSessionLimitError";
  //   throw limitError;
  // }

  return ChatSession.create({
    chatId: crypto.randomUUID(),
    user: userId,
    title: "New Chat",
    chats: [],
  });
};

const CreateChatSession = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }
    const result = await createChatSessionForUser(req.user._id);
    // console.log("Session Created");
    return res.status(201).json({
      status: true,
      message: "Chat session created",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ChatSessionLimitError") {
      return res.status(403).json({
        status: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      status: false,
      message: "Failed to create chat session",
    });
  }
};


export const UpdateChatSessionTitle = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }
    const { chatId, title } = req.body;

    console.log("chatId", chatId);
    console.log("title", title);
    const chatSession = await ChatSession.findOneAndUpdate({ chatId: chatId }, { title }, { new: true });

    if (!chatSession) {
      return res.status(404).json({
        status: false,
        message: "Chat session not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Chat session title updated",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to update chat session title",
    });
  }
} 


export const DeleteChatSession = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const chatId = req.params.chatId;
    const chatSession = await ChatSession.findOneAndDelete({ chatId: chatId });
    if (!chatSession) {
      return res.status(404).json({
        status: false,
        message: "Chat session not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Chat session deleted",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to delete chat session",
    });
  }
} 

export const PinUnpinChatSession = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }
    const { chatId } = req.body;

    const findChatSession = await ChatSession.findOne({ chatId: chatId });
    if (!findChatSession) {
      return res.status(404).json({
        status: false,
        message: "Chat session not found",
      });
    }
    const chatSession = await ChatSession.findOneAndUpdate({ chatId: chatId }, { pinChat: !findChatSession.pinChat }, { new: true });

    
    return res.status(200).json({
      status: true,
      message: `Chat session ${chatSession.pinChat ? "pinned" : "unpinned"}`,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to pin chat session",
    });
  }
} 


export default CreateChatSession;
