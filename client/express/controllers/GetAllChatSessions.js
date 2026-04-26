import ChatSession from "../models/Chat_Session.js";

const GetAllChatSessions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const userId = req.user._id;

    const result = await ChatSession.find(
      {
        user: userId,
      },
      {
        chatId: 1,
        title: 1,
      },
    ).sort({ createdAt: -1 });

    // console.log("Got all chat sessions", result);

    return res.status(200).json({
      message: "Successfully Got all the sessions",
      status: true,
      data: result,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);
    return res.status(500).json({
      message: "Internal Server error, Please try again after some time",
      status: false,
    });
  }
};

export default GetAllChatSessions;
