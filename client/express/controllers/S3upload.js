import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../helpers/s3_config.js";
import axios from "axios";
import { createChatSessionForUser } from "./CreateChatSession.js";
import ChatSession from "../models/Chat_Session.js";
import {
  canAccessChatSession,
  normalizePeopleCollaborateIfNeeded,
} from "../helpers/chatAccess.js";

export const getUploadUrl = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const { fileName, contentType } = req.body;

    const key = `uploads/${req.user._id}-${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 60,
    });

    res.json({
      uploadUrl,
      key,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const embedFile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const { key } = req.body;
    let { chatId } = req.body;

    if (!key) {
      return res.status(400).json({
        status: false,
        message: "key is required",
      });
    }

    let ownerUserId = String(req.user._id);

    if (!chatId?.chatId) {
      const newChatSession = await createChatSessionForUser(req.user._id);
      chatId = {
        chatId: newChatSession.chatId,
        title: newChatSession.title,
      };
    } else {
      const chatSession = await ChatSession.findOne({ chatId: chatId.chatId });

      if (!chatSession) {
        return res.status(404).json({
          status: false,
          message: "Chat session not found",
        });
      }

      if (normalizePeopleCollaborateIfNeeded(chatSession)) {
        await chatSession.save();
      }

      if (!canAccessChatSession(chatSession, req.user)) {
        if (!req.user.email && chatSession.peopleCollaborate?.length > 0) {
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

      // Embed into owner's RAG namespace for shared sessions
      ownerUserId = String(chatSession.user);
    }

    const response = await axios.post(
      `${process.env.PYTHON_BACKEND_URI}/embed-file`,
      {
        key,
        user_id: ownerUserId,
        chat_id: chatId.chatId,
      },
      { timeout: 120000 },
    );

    return res.json({
      ...response.data,
      chatSession: {
        ...chatId,
        ownerId: ownerUserId,
      },
    });
  } catch (error) {
    console.log(error.response?.data || error.message);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
