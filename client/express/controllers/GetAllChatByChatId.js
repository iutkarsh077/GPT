import ChatSession from "../models/Chat_Session.js";

const GetAllChatByChatId = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const { chatId } = req.query;

    const result = await ChatSession.findOne({
      chatId,
      user: req.user._id,
    }).populate("chats");

    // console.log(result);

    return res.status(200).json({message: "Successfully retrieved all chat data", status: true, data: result});
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to get all chats",
    });
  }
};


export default GetAllChatByChatId;
