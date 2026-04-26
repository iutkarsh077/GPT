import ChatSession from "../models/Chat_Session.js";

const GetSharedChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({
        status: false,
        message: "Chat id is required",
      });
    }

    const result = await ChatSession.findOne({ chatId }).populate("chats");

    if (!result) {
      return res.status(404).json({
        status: false,
        message: "Shared chat not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Shared chat retrieved successfully",
      data: {
        chatId: result.chatId,
        title: result.title,
        chats: result.chats,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to get shared chat",
    });
  }
};

export default GetSharedChat;
