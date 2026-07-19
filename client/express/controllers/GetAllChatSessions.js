import ChatSession from "../models/Chat_Session.js";
import { normalizeEmail } from "../helpers/chatAccess.js";

const GetAllChatSessions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const userId = req.user._id;
    const normalizedEmail = normalizeEmail(req.user.email);

    const filter = normalizedEmail
      ? {
          $or: [
            { user: userId },
            {
              $expr: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$peopleCollaborate", []] },
                        as: "e",
                        cond: {
                          $eq: [
                            {
                              $toLower: {
                                $trim: { input: { $toString: "$$e" } },
                              },
                            },
                            normalizedEmail,
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            },
          ],
        }
      : { user: userId };

    const sessions = await ChatSession.find(filter, {
      chatId: 1,
      title: 1,
      user: 1,
    }).sort({ createdAt: -1 });

    const result = sessions.map((session) => ({
      chatId: session.chatId,
      title: session.title,
      ownerId: String(session.user),
    }));

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
