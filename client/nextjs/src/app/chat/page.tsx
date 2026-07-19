"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import api from "@/helpers/api";
import { useAuth } from "@/context/ChatContext";

export default function NewChatPage() {
  const router = useRouter();
  const { user, loading, setChatId, setMessages, setAllChatId } = useAuth();
  const creatingRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/auth");
      return;
    }

    if (creatingRef.current) return;
    creatingRef.current = true;

    const createChat = async () => {
      try {
        const res = await api.get("/api/create-new-session");
        const newChat = {
          chatId: res.data.data.chatId,
          title: res.data?.data?.title || "New Chat",
          ownerId: res.data.data.user
            ? String(res.data.data.user)
            : String(user._id),
        };

        setChatId(newChat);
        setMessages([]);
        setAllChatId((current) => [
          newChat,
          ...current.filter((chat) => chat.chatId !== newChat.chatId),
        ]);
        router.replace(`/chat/${newChat.chatId}`);
      } catch (error) {
        creatingRef.current = false;
        const message =
          error instanceof AxiosError
            ? error.response?.data?.message || error.message
            : "Failed to create chat";
        toast.error(message);
      }
    };

    createChat();
  }, [loading, user, router, setChatId, setMessages, setAllChatId]);

  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      Starting a new chat...
    </div>
  );
}
