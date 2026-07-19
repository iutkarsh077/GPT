"use client";

import { Bot, LogOut, MessageSquare, MoreHorizontal } from "lucide-react";
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

const CustomSidebar = () => {
  const { handleCreateNewChat, allChatId, setMessages, setChatId, setAllChatId } =
    useAuth();
  const router = useRouter();
  const params = useParams<{ chatid?: string }>();
  const activeChatId = params.chatid;

  const handleSelectChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

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

  return (
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

        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allChatId?.map((chat) => (
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
                    aria-label={`More for ${chat.title}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
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
  );
};

export default CustomSidebar;
