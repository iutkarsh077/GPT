import mongoose, { Schema } from "mongoose";

const ChatSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chatSession: {
      type: Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const ChatSessionSchema = new Schema(
  {
    chatId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true,
    },
    chats: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Chat",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Chat = mongoose.model("Chat", ChatSchema);
const ChatSession = mongoose.model("ChatSession", ChatSessionSchema);

export { Chat };
export default ChatSession;
