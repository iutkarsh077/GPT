"use client";

import { Bot, LogOut, MessageSquare, MoreHorizontal, Pin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/ChatContext";
import { AxiosError } from "axios";
import { toast } from "sonner";
import api from "@/helpers/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMemo, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

type SidebarChat = {
  chatId: string;
  title: string;
  pinChat?: boolean;
};

const CustomSidebar = () => {
  const { handleCreateNewChat, allChatId, setMessages, setChatId, setAllChatId } =
    useAuth();
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDropDialog, setOpenDropDialog] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedChat, setSelectedChat] = useState<SidebarChat | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const router = useRouter();
  const params = useParams<{ chatid?: string }>();
  const activeChatId = params.chatid;
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleChatMenu = (
    event: React.MouseEvent,
    chatId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDropDialog((prev) => (prev === chatId ? null : chatId));
  };

  const handleOpenEdit = (event: React.MouseEvent, chat: SidebarChat) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedChat(chat);
    setEditTitle(chat.title);
    setOpenDropDialog(null);
    setOpenEditDialog(true);
  };

  const handleOpenDelete = (event: React.MouseEvent, chat: SidebarChat) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedChat(chat);
    setOpenDropDialog(null);
    setOpenDeleteDialog(true);
  };

  const handleSelectChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const { pinnedChats, recentChats } = useMemo(() => {
    const pinned: SidebarChat[] = [];
    const recent: SidebarChat[] = [];

    for (const chat of allChatId ?? []) {
      if (chat.pinChat) pinned.push(chat);
      else recent.push(chat);
    }

    return { pinnedChats: pinned, recentChats: recent };
  }, [allChatId]);

  const handleLogout = async () => {
    try {
      await api.get("/api/logout");
      setMessages([]);
      setChatId(null);
      setAllChatId([]);
      localStorage.removeItem("user");
      toast.success("Logged out successfully");
      router.push("/auth");
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : "Failed to logout";
      toast.error(message);
    }
  };


  const handleSaveEditTitle = async () => {
    try {
      setIsLoading(true);
      setAllChatId((prev) => prev.map((chat) => chat.chatId === selectedChat?.chatId ? { ...chat, title: editTitle } : chat));
      setOpenEditDialog(false);
      const response = await api.patch("/update-chat-session-title", {
        chatId: selectedChat?.chatId,
        title: editTitle,
      })
      if (!response.status) {
        throw new Error(response.data.message);
      }

    } catch (error) {
      const message = error instanceof AxiosError ? error.response?.data?.message || error.message : "Failed to save edit title";
      toast.error(message);
    } finally {
      setOpenEditDialog(false);
      setIsLoading(false);
    }
  }

  const handleDeleteChat = async () => {
    try {
      setOpenDeleteDialog(false);
      setIsLoading(true);
      setAllChatId((prev) => prev.filter((chat) => chat.chatId !== selectedChat?.chatId));
      const response = await api.delete(`/delete-chat-session/${selectedChat?.chatId}`);
      handleCreateNewChat();
      if (!response.status) {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const message = error instanceof AxiosError ? error.response?.data?.message || error.message : "Failed to delete chat";
      toast.error(message);
    }
  }

  const handlePinChat = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setIsLoading(true);
      const response = await api.post("/pin-unpin-chat-session", {
        chatId: chatId,
      });
      if (!response.status) {
        throw new Error(response.data.message);
      }
      setAllChatId((prev) =>
        prev.map((chat) =>
          chat.chatId === chatId ? { ...chat, pinChat: !chat.pinChat } : chat,
        ),
      );
      setIsLoading(false);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : "Failed to pin chat";
      toast.error(message);
    }
  };

  const renderChatItem = (chat: SidebarChat) => (
    <SidebarMenuItem key={chat.chatId}>
      <SidebarMenuButton
        onClick={() => handleSelectChat(chat.chatId)}
        className="hover:cursor-pointer hover:bg-gray-200 ease-in-out duration-300 transition-all"
        isActive={activeChatId === chat.chatId}
        tooltip={chat.title}
      >
        <MessageSquare className="size-4" />
        <span>{chat.title}</span>
      </SidebarMenuButton>

      <SidebarMenuAction
        showOnHover
        aria-label={`Pin ${chat.title}`}
        className="right-7"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <Pin
          fill={chat.pinChat ? "currentColor" : "none"}
          onClick={(e) => handlePinChat(e, chat.chatId)}
          className="size-4 rotate-45"
        />
      </SidebarMenuAction>

      <SidebarMenuAction
        showOnHover
        aria-label={`More for ${chat.title}`}
        aria-expanded={openDropDialog === chat.chatId}
        onClick={(event) => handleToggleChatMenu(event, chat.chatId)}
      >
        <MoreHorizontal className="size-4" />
      </SidebarMenuAction>

      {openDropDialog === chat.chatId && (
        <div
          className="absolute top-7 right-1 z-20 flex w-40 flex-col gap-0 overflow-hidden rounded-md border border-gray-200 bg-white shadow-md"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="px-3 py-2 text-left text-sm hover:bg-gray-100"
            onClick={(event) =>
              handleOpenEdit(event, {
                chatId: chat.chatId,
                title: chat.title,
              })
            }
          >
            Edit Title
          </button>
          <button
            type="button"
            className="px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-100"
            onClick={(event) =>
              handleOpenDelete(event, {
                chatId: chat.chatId,
                title: chat.title,
              })
            }
          >
            Delete Chat
          </button>
        </div>
      )}
    </SidebarMenuItem>
  );

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="gap-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="New chat">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Bot className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">GPT</p>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="hover:cursor-pointer hover:bg-gray-200 ease-in-out duration-300 transition-all"
                    onClick={handleCreateNewChat}
                    tooltip="Chats"
                  >
                    <MessageSquare className="size-4" />
                    <span>New Chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {pinnedChats.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Pinned</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{pinnedChats.map(renderChatItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          <SidebarGroup>
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{recentChats.map(renderChatItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
                <LogOut className="size-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>


      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Title</DialogTitle>
            <DialogDescription>
              Update the title for this chat.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            placeholder="Enter new title"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button type="submit" onClick={handleSaveEditTitle}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              {selectedChat
                ? `Are you sure you want to delete “${selectedChat.title}”? This cannot be undone.`
                : "Are you sure you want to delete this chat?"}
            </DialogDescription>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={handleDeleteChat}>Delete</Button>
            </DialogFooter>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomSidebar;
