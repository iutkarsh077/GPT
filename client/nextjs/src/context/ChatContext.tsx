"use client";

import api from "@/helpers/api";
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
  email: string;
  avatar: string;
  displayName: string;
};

interface Message {
  _id?: string;
  user?: string;
  chatSession?: string;
  query: string;
  content: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ChatId {
  chatId: string;
  title: string;
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
        // console.log(error);
        const status = error instanceof AxiosError ? error.response?.status : null;
        setUser(null);
        setMessages([]);
        setChatId(null);
        setAllChatId([]);
        localStorage.removeItem("user");

        if (status === 401) {
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
        // console.log(error);
        const message =
          error instanceof AxiosError
            ? error.response?.data?.message || error.message
            : "Failed to get all chats";
        toast(message);
      }
    };
    getAllChatSessions();
  }, [pathname, user?._id]);

  const handleCreateNewChat = async () => {
    try {
      const res = await api.get("/api/create-new-session");
      const newChat = {
        chatId: res.data.data.chatId,
        title: res.data?.data?.title || "New Chat"
      };
      const previousChatId = chatId?.chatId;
      setChatId(newChat);
      setMessages([]);
      setAllChatId((current) => [
        newChat,
        ...current.filter((chat) => chat.chatId !== previousChatId),
      ]);
    } catch (error) {
      // console.log(error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : "Internal Server error";
      toast.error(message);
    }
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
