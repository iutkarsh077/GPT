 "use client";

import ChatPage from "./ChatPage";
import CustomSidebar from "./Sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/context/ChatContext";

const MainHomePage = () => {
  const { loading, user } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  return (
    <SidebarProvider>
      <CustomSidebar />
      <SidebarInset>
        <ChatPage />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default MainHomePage;
