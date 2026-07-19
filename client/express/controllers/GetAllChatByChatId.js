import ChatSession from "../models/Chat_Session.js";
import {
  canAccessChatSession,
  isCollaborator,
  normalizePeopleCollaborateIfNeeded,
} from "../helpers/chatAccess.js";

const GetAllChatByChatId = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).json({
        status: false,
        message: "Chat id is required",
      });
    }

    const result = await ChatSession.findOne({ chatId }).populate({
      path: "chats",
      populate: {
        path: "user",
        select: "avatar displayName username",
      },
    });

    if (!result) {
      return res.status(404).json({
        status: false,
        message: "Chat not found",
      });
    }

    if (normalizePeopleCollaborateIfNeeded(result)) {
      await result.save();
    }

    if (!canAccessChatSession(result, req.user)) {
      if (!req.user.email && result.peopleCollaborate?.length > 0) {
        return res.status(403).json({
          status: false,
          message:
            "Your account has no email; collaboration requires a verified GitHub email.",
        });
      }

      return res.status(403).json({
        status: false,
        message: "You don't have access to this chat",
      });
    }

    return res.status(200).json({
      message: "Successfully retrieved all chat data",
      status: true,
      data: result,
      isCollaborator: isCollaborator(result, req.user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Failed to get all chats",
    });
  }
};

export default GetAllChatByChatId;
