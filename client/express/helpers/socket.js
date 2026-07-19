import { Server } from "socket.io";
import passport from "passport";
import ChatSession from "../models/Chat_Session.js";
import { canAccessChatSession } from "./chatAccess.js";

let io = null;

const wrap =
  (middleware) =>
  (socket, next) => {
    middleware(socket.request, {}, next);
  };

export const initSocket = (httpServer, sessionMiddleware) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONT_END_URI,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.use(wrap(sessionMiddleware));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));

  io.use((socket, next) => {
    if (socket.request.user) {
      return next();
    }
    return next(new Error("Unauthorized"));
  });

  io.on("connection", (socket) => {
    socket.on("join-chat", async ({ chatId }, ack) => {
      try {
        if (!chatId || typeof chatId !== "string") {
          ack?.({ status: false, message: "chatId is required" });
          return;
        }

        const session = await ChatSession.findOne({ chatId });
        if (!session) {
          ack?.({ status: false, message: "Chat not found" });
          return;
        }

        if (!canAccessChatSession(session, socket.request.user)) {
          ack?.({ status: false, message: "You don't have access to this chat" });
          return;
        }

        const room = `chat:${chatId}`;
        await socket.join(room);
        ack?.({ status: true, chatId });
      } catch (error) {
        console.error("join-chat error:", error);
        ack?.({ status: false, message: "Failed to join chat" });
      }
    });

    socket.on("leave-chat", ({ chatId }) => {
      if (chatId) {
        socket.leave(`chat:${chatId}`);
      }
    });
  });

  return io;
};

export const getIO = () => io;

export const emitToChat = (chatId, event, payload) => {
  if (!io || !chatId) return;
  io.to(`chat:${chatId}`).emit(event, payload);
};
