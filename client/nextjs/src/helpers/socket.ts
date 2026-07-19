import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (typeof window === "undefined") return null;

  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (!url) {
      console.error("NEXT_PUBLIC_API_URL is not set");
      return null;
    }

    socket = io(url, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (s && !s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const joinChatRoom = (chatId: string) => {
  const s = connectSocket();
  if (!s || !chatId) return;

  const join = () => {
    s.emit("join-chat", { chatId }, (ack?: { status?: boolean; message?: string }) => {
      if (ack && ack.status === false) {
        console.warn("Failed to join chat room:", ack.message);
      }
    });
  };

  if (s.connected) {
    join();
  } else {
    s.once("connect", join);
  }
};

export const leaveChatRoom = (chatId: string) => {
  const s = getSocket();
  if (!s || !chatId) return;
  s.emit("leave-chat", { chatId });
};
