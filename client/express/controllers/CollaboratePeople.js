import { sendMail } from "../helpers/SendEmail.js";
import ChatSession from "../models/Chat_Session.js";
import {
  isValidEmail,
  normalizeEmail,
  normalizePeopleCollaborateIfNeeded,
} from "../helpers/chatAccess.js";

const requireOwnerSession = async (chatId, userId) => {
  const session = await ChatSession.findOne({ chatId, user: userId });
  return session;
};

export const SendEmailInvite = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized", status: false });
    }

    const { email, chatId } = req.body;

    if (!email || !chatId) {
      return res
        .status(400)
        .json({ message: "Email and chatId are required", status: false });
    }

    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ message: "Invalid email address", status: false });
    }

    const normalizedInviteEmail = normalizeEmail(email);
    const ownerEmail = normalizeEmail(req.user.email);

    if (ownerEmail && ownerEmail === normalizedInviteEmail) {
      return res.status(400).json({
        message: "You already have access as the owner of this chat",
        status: false,
      });
    }

    const session = await requireOwnerSession(chatId, req.user._id);
    if (!session) {
      return res.status(404).json({
        message: "Chat session not found or you are not the owner",
        status: false,
      });
    }

    if (normalizePeopleCollaborateIfNeeded(session)) {
      await session.save();
    }

    const emailLink = `${process.env.FRONT_END_URI}/chat/${chatId}`;

    const sendEmail = await sendMail({
      to: normalizedInviteEmail,
      name: req.user.displayName,
      subject: "Invitation to collaborate",
      link: emailLink,
    });

    if (!sendEmail) {
      return res
        .status(500)
        .json({ message: "Failed to send email", status: false });
    }

    const addPeopleCollaborate = await ChatSession.findOneAndUpdate(
      { chatId, user: req.user._id },
      { $addToSet: { peopleCollaborate: normalizedInviteEmail } },
      { new: true },
    );

    if (!addPeopleCollaborate) {
      return res.status(500).json({
        message: "Failed to add people to collaborate",
        status: false,
      });
    }

    return res
      .status(200)
      .json({ message: "Email sent successfully", status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message, status: false });
  }
};

export const GetPeopleCollaborate = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized", status: false });
    }

    const { chatId } = req.params;

    const session = await requireOwnerSession(chatId, req.user._id);
    if (!session) {
      return res.status(404).json({
        message: "Chat session not found or you are not the owner",
        status: false,
      });
    }

    if (normalizePeopleCollaborateIfNeeded(session)) {
      await session.save();
    }

    return res.status(200).json({
      peopleCollaborate: session.peopleCollaborate,
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message, status: false });
  }
};

export const RemoveCollaborator = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized", status: false });
    }

    const { email, chatId } = req.body;

    if (!email || !chatId) {
      return res
        .status(400)
        .json({ message: "Email and chatId are required", status: false });
    }

    const normalizedEmail = normalizeEmail(email);

    const session = await requireOwnerSession(chatId, req.user._id);
    if (!session) {
      return res.status(404).json({
        message: "Chat session not found or you are not the owner",
        status: false,
      });
    }

    if (normalizePeopleCollaborateIfNeeded(session)) {
      await session.save();
    }

    const removeCollaborator = await ChatSession.findOneAndUpdate(
      { chatId, user: req.user._id },
      { $pull: { peopleCollaborate: normalizedEmail } },
      { new: true },
    );

    if (!removeCollaborator) {
      return res.status(500).json({
        message: "Failed to remove collaborator",
        status: false,
      });
    }

    return res.status(200).json({
      message: "Collaborator removed successfully",
      status: true,
      removeCollaborator: removeCollaborator.peopleCollaborate,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message, status: false });
  }
};
