"use client";

import api from "@/helpers/api";
import {
  connectSocket,
  disconnectSocket,
  joinChatRoom,
  leaveChatRoom,
} from "@/helpers/socket";
import { AxiosError } from "axios";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

type User = {
  _id: string;
  email?: string | null;
  avatar?: string | null;
  displayName?: string | null;
  username?: string | null;
  profileUrl?: string | null;
};

interface Message {
  _id?: string;
  user?:
    | string
    | {
        _id?: string;
        avatar?: string | null;
        displayName?: string | null;
        username?: string | null;
      };
  chatSession?: string;
  query: string;
  content: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  senderAvatar?: string | null;
  senderName?: string | null;
}

export interface ChatId {
  chatId: string;
  title: string;
  ownerId?: string;
}

type AuthContextType = {
  user: User | null;
  loading: boolean;
  chatId: ChatId | null;
  setChatId: Dispatch<SetStateAction<ChatId | null>>;
  handleCreateNewChat: () => void;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  prompt: string;
  setPrompt: (value: string) => void;
  allChatId: ChatId[];
  setAllChatId: Dispatch<SetStateAction<ChatId[]>>;
  remotePendingQuery: string | null;
  remotePendingUser: string | null;
  remotePendingAvatar: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [chatId, setChatId] = useState<ChatId | null>(null);
  const [allChatId, setAllChatId] = useState<ChatId[]>([]);
  const [loading, setLoading] = useState(true);
  const [remotePendingQuery, setRemotePendingQuery] = useState<string | null>(
    null,
  );
  const [remotePendingUser, setRemotePendingUser] = useState<string | null>(
    null,
  );
  const [remotePendingAvatar, setRemotePendingAvatar] = useState<string | null>(
    null,
  );
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    if (pathname.startsWith("/share/") || pathname === "/auth") {
      setLoading(false);
      return;
    }

    const getUserInfo = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/get-user");
        setUser(res.data.data);
        localStorage.setItem("user", JSON.stringify(res.data.data));
      } catch (error) {
        const status =
          error instanceof AxiosError ? error.response?.status : null;
        setUser(null);
        setMessages([]);
        setChatId(null);
        setAllChatId([]);
        localStorage.removeItem("user");
        disconnectSocket();

        if (status === 401) {
          try {
            await api.get("/api/logout");
          } catch {
            // Session is already invalid; still send the user to login.
          }
          router.replace("/auth");
          return;
        }

        toast.error("Failed to get user info");
      } finally {
        setLoading(false);
      }
    };
    getUserInfo();
  }, [pathname, router]);

  useEffect(() => {
    if (pathname.startsWith("/share/") || pathname === "/auth" || !user?._id) {
      return;
    }

    const getAllChatSessions = async () => {
      try {
        const result = await api.get("/api/all-chat-session");
        setAllChatId(result.data.data);
      } catch (error) {
        const message =
          error instanceof AxiosError
            ? error.response?.data?.message || error.message
            : "Failed to get all chats";
        toast(message);
      }
    };
    getAllChatSessions();
  }, [pathname, user?._id]);

  useEffect(() => {
    if (!user?._id || pathname.startsWith("/share/") || pathname === "/auth") {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();
    if (!socket) return;

    const onQueryStarted = (payload: {
      chatId: string;
      query: string;
      userId: string;
      displayName?: string;
      avatar?: string | null;
    }) => {
      if (payload.chatId !== chatId?.chatId) return;
      if (String(payload.userId) === String(user._id)) return;
      setRemotePendingQuery(payload.query);
      setRemotePendingUser(payload.displayName || "Collaborator");
      setRemotePendingAvatar(payload.avatar || null);
    };

    const onMessage = (payload: {
      chatId: string;
      message: Message;
      chatSession?: ChatId;
    }) => {
      if (payload.chatId !== chatId?.chatId) return;

      setRemotePendingQuery(null);
      setRemotePendingUser(null);
      setRemotePendingAvatar(null);

      setMessages((current) => {
        const incomingId = payload.message._id
          ? String(payload.message._id)
          : null;
        if (
          incomingId &&
          current.some((m) => m._id && String(m._id) === incomingId)
        ) {
          return current;
        }
        return [...current, payload.message];
      });

      if (payload.chatSession) {
        setChatId((prev) => ({
          chatId: payload.chatSession!.chatId,
          title: payload.chatSession!.title || prev?.title || "New Chat",
          ownerId: payload.chatSession!.ownerId || prev?.ownerId,
        }));
        setAllChatId((prev) => {
          const next = {
            chatId: payload.chatSession!.chatId,
            title: payload.chatSession!.title || "New Chat",
            ownerId: payload.chatSession!.ownerId,
          };
          return [next, ...prev.filter((c) => c.chatId !== next.chatId)];
        });
      }
    };

    const onQueryFailed = (payload: { chatId: string; userId: string }) => {
      if (payload.chatId !== chatId?.chatId) return;
      if (String(payload.userId) === String(user._id)) return;
      setRemotePendingQuery(null);
      setRemotePendingUser(null);
      setRemotePendingAvatar(null);
    };

    socket.on("chat:query-started", onQueryStarted);
    socket.on("chat:message", onMessage);
    socket.on("chat:query-failed", onQueryFailed);

    return () => {
      socket.off("chat:query-started", onQueryStarted);
      socket.off("chat:message", onMessage);
      socket.off("chat:query-failed", onQueryFailed);
    };
  }, [user?._id, chatId?.chatId, pathname]);

  useEffect(() => {
    if (!user?._id || !chatId?.chatId) return;
    if (pathname.startsWith("/share/") || pathname === "/auth") return;

    joinChatRoom(chatId.chatId);

    return () => {
      leaveChatRoom(chatId.chatId);
    };
  }, [user?._id, chatId?.chatId, pathname]);

  const handleCreateNewChat = () => {
    if (chatId?.chatId) {
      leaveChatRoom(chatId.chatId);
    }
    setMessages([]);
    setChatId(null);
    setRemotePendingQuery(null);
    setRemotePendingUser(null);
    setRemotePendingAvatar(null);
    router.push("/chat");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        chatId,
        setChatId,
        handleCreateNewChat,
        messages,
        prompt,
        setPrompt,
        setMessages,
        allChatId,
        setAllChatId,
        remotePendingQuery,
        remotePendingUser,
        remotePendingAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
