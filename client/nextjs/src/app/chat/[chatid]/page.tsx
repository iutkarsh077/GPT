"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import api from "@/helpers/api";
import MainHomePage from "@/components/custom/Main";
import { useAuth } from "@/context/ChatContext";

export default function ChatByIdPage() {
  const params = useParams<{ chatid: string }>();
  const router = useRouter();
  const routeChatId = params.chatid;
  const { user, loading, setChatId, setMessages, chatId } = useAuth();
  const loadedChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user || !routeChatId) return;
    if (loadedChatIdRef.current === routeChatId) return;

    const loadChat = async () => {
      // Already hydrated (e.g. just created on /chat) — keep local state.
      if (chatId?.chatId === routeChatId) {
        loadedChatIdRef.current = routeChatId;
        return;
      }

      try {
        const result = await api.get(
          `/api/get-chat-by-chatid?chatId=${encodeURIComponent(routeChatId)}`,
        );
        const data = result.data?.data;

        if (!data?.chatId) {
          toast.error("Chat not found");
          router.replace("/chat");
          return;
        }

        loadedChatIdRef.current = routeChatId;
        setChatId({
          chatId: data.chatId,
          title: data.title || "New Chat",
          ownerId: data.user ? String(data.user) : undefined,
        });
        setMessages(data.chats || []);
      } catch (error) {
        const status =
          error instanceof AxiosError ? error.response?.status : undefined;
        const message =
          error instanceof AxiosError
            ? error.response?.data?.message || error.message
            : "Failed to load chat";

        if (status === 403) {
          toast.error(message || "You don't have access to this chat");
        } else if (status === 404) {
          toast.error(message || "Chat not found");
        } else {
          toast.error(message);
        }
        router.replace("/chat");
      }
    };

    loadChat();
  }, [
    loading,
    user,
    routeChatId,
    chatId?.chatId,
    router,
    setChatId,
    setMessages,
  ]);

  return <MainHomePage />;
}
