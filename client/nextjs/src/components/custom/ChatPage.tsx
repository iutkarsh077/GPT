"use client";
import {
  Children,
  FormEvent,
  memo,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Switch } from "@/components/ui/switch"
import { ArrowUp, Loader2, Paperclip, Share2, UserRound, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/ChatContext";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import api from "@/helpers/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaInfinity } from "react-icons/fa";
import AssistantMessageSkeleton from "./AssistantMessageSkeleton";
import { TextGenerateEffect } from "../ui/text-generate-effect";
import { cn } from "@/lib/utils";
import CollaboratePeopleChat from "./CollaboratePeopleChat";

const markdownRemarkPlugins = [remarkGfm];

const renderGeneratedText = (
  children: ReactNode,
  shouldAnimate: boolean,
  wordClassName?: string,
) => {
  if (!shouldAnimate) {
    return children;
  }

  return Children.map(children, (child, index) => {
    if (typeof child === "string") {
      return (
        <TextGenerateEffect
          key={`${child}-${index}`}
          words={child}
          className="inline"
          wordClassName={wordClassName}
          filter={false}
          duration={0.18}
          staggerDelay={0.025}
        />
      );
    }

    return child;
  });
};

type MessageItemProps = {
  message: {
    _id?: string;
    user?:
      | string
      | {
          _id?: string;
          avatar?: string | null;
          displayName?: string | null;
          username?: string | null;
        };
    query: string;
    content: string;
    senderAvatar?: string | null;
    senderName?: string | null;
  };
  isAnimated: boolean;
  currentUserId?: string | null;
  currentUserAvatar?: string | null;
  currentUserName: string;
};

const getMessageSenderId = (
  user?: MessageItemProps["message"]["user"],
): string | null => {
  if (!user) return null;
  if (typeof user === "string") return user;
  return user._id ? String(user._id) : null;
};

const MessageItem = memo(
  ({
    message,
    isAnimated,
    currentUserId,
    currentUserAvatar,
    currentUserName,
  }: MessageItemProps) => {
    const senderId = getMessageSenderId(message.user);
    const isOwnMessage =
      !senderId || !currentUserId || String(senderId) === String(currentUserId);

    const populatedSender =
      message.user && typeof message.user === "object" ? message.user : null;

    const senderAvatar = isOwnMessage
      ? currentUserAvatar
      : message.senderAvatar || populatedSender?.avatar || null;

    const senderName = isOwnMessage
      ? currentUserName
      : message.senderName ||
        populatedSender?.displayName ||
        populatedSender?.username ||
        "Collaborator";

    return (
    <div className="flex flex-col gap-7">
      <div className="flex justify-end gap-3">
        <div className="max-w-[min(90%,42rem)] rounded-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
          {!isOwnMessage && (
            <p className="mb-1 text-[10px] uppercase tracking-wide opacity-70">
              {senderName}
            </p>
          )}
          {message.query}
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName}
              className="size-full object-cover rounded-md"
            />
          ) : (
            <UserRound className="size-4" />
          )}
        </div>
      </div>

      {message.content?.trim() ? (
        <div className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
            <FaInfinity className="size-4" />
          </div>
          <div className="max-w-[min(90%,42rem)] rounded-lg bg-muted px-4 py-3 text-sm leading-6 text-foreground">
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0">
                    {renderGeneratedText(children, isAnimated)}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {renderGeneratedText(
                      children,
                      isAnimated,
                      "font-semibold text-foreground",
                    )}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                code: ({ children }) => (
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[0.9em]">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="mb-3 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs last:mb-0">
                    {children}
                  </pre>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sky-700 underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}
    </div>
    );
  },
);

MessageItem.displayName = "MessageItem";

const ChatPage = () => {
  const {
    user,
    chatId,
    messages,
    setMessages,
    setChatId,
    setAllChatId,
    remotePendingQuery,
    remotePendingUser,
    remotePendingAvatar,
  } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(
    null,
  );
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const userName = user?.displayName || user?.username || "Guest";
  const userInitial = userName.charAt(0).toUpperCase();
  const refForChat = useRef<HTMLDivElement | null>(null);
  const [fileUploaded, setFileUploaded] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const allowedFileTypes = ["application/pdf"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const [isCollaboratePeopleChatOpen, setIsCollaboratePeopleChatOpen] = useState(false);
  const [isGithubAgentOn, setIsGithubAgentOn] = useState(false);
  
  useEffect(() => {
    refForChat.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [messages]);

  const handleShareChat = async () => {
    if (!chatId?.chatId) {
      toast.error("Create at least one message before sharing this chat.");
      return;
    }

    const shareUrl = `${window.location.origin}/share/${encodeURIComponent(chatId.chatId)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard.");
    } catch {
      window.prompt("Copy this share link:", shareUrl);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = prompt.trim();

    if (!text || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setPendingQuery(text);
    setPrompt("");

    try {
      const result = await api.post("/api/query-resolver", {
        query: text,
        chatId: chatId,
        isGithubAgentOn: isGithubAgentOn,
      });
      // console.log(result.data);
      const newMessageId = result.data.messageId || Date.now().toString();
      setMessages((current) => {
        if (
          current.some((m) => m._id && String(m._id) === String(newMessageId))
        ) {
          return current;
        }
        return [
          ...current,
          {
            _id: newMessageId,
            user: user?._id,
            query: text,
            content: result.data.data,
            createdAt: new Date(),
            senderAvatar: user?.avatar,
            senderName: userName,
          },
        ];
      });
      setAnimatedMessageId(newMessageId);

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      const wordCount = String(result.data.data).split(/\s+/).length;
      animationTimeoutRef.current = setTimeout(
        () => setAnimatedMessageId(null),
        Math.min(4500, 400 + wordCount * 25),
      );

      if (result.data.chatSession) {
        const chatSession = {
          title: result.data.chatSession.title || "New Chat",
          chatId: result.data.chatSession.chatId,
          ownerId: result.data.chatSession.ownerId
            ? String(result.data.chatSession.ownerId)
            : chatId?.ownerId || String(user?._id || ""),
        };
        setChatId(chatSession);
        setAllChatId((prev) => [
          chatSession,
          ...prev.filter((chat) => chat.chatId !== chatSession.chatId),
        ]);
        if (chatId?.chatId !== chatSession.chatId) {
          router.replace(`/chat/${chatSession.chatId}`);
        }
      }
    } catch (error) {
      // console.log(error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : "Internal Server error";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setPendingQuery("");
    }
  };

  console.log("user is: ", user);
  console.log("chatId is: ", chatId);


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if(file.size > maxFileSize) {
        toast.error("File size is too large");
        return;
      }
      if(!allowedFileTypes.includes(file.type)) {
        toast.error("PDF file only is allowed");
        return;
      }
      setIsFileUploading(true);
      console.log(file);
      setFileUploaded(file);
      const response = await api.post("/api/get-upload-url", {
        fileName: file.name,
        contentType: file.type,
      });
      console.log("upload url: ", response.data);


      const uploadResponse = await fetch(response.data.uploadUrl, {
        method: "PUT",
        body: file,
      })

      if (!uploadResponse.ok) {
        toast.error("Failed to upload file");
        return;
      }

      const embedResponse = await api.post("/api/embed-pdf", {
        key: response.data.key,
        chatId,
      });

      if (!embedResponse.data?.status) {
        toast.error(embedResponse.data?.message || "Failed to embed file");
        return;
      }

      if (embedResponse.data.chatSession) {
        const chatSession = {
          chatId: embedResponse.data.chatSession.chatId,
          title: embedResponse.data.chatSession.title || "New Chat",
          ownerId: embedResponse.data.chatSession.ownerId
            ? String(embedResponse.data.chatSession.ownerId)
            : chatId?.ownerId || String(user?._id || ""),
        };
        setChatId(chatSession);
        setAllChatId((prev) => [
          chatSession,
          ...prev.filter((chat) => chat.chatId !== chatSession.chatId),
        ]);
        if (chatId?.chatId !== chatSession.chatId) {
          router.replace(`/chat/${chatSession.chatId}`);
        }
      }

      toast.success("File uploaded and embedded successfully");
    } catch (error) {
      console.log(error);
      setFileUploaded(null);
      toast.error("Failed to upload file");
    } finally {
      setIsFileUploading(false);
    }
  }

  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <div>
            <h1 className="text-sm font-semibold">
              {chatId?.title ? chatId.title : "New chat"}
            </h1>
            <p className="text-xs text-muted-foreground">GPT</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sky-600 text-xs font-semibold text-white">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={userName}
                  className="size-full object-cover"
                />
              ) : (
                userInitial
              )}
            </div>
            <span className="hidden  max-w-36 truncate font-medium sm:block">
              {userName}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleShareChat}
            disabled={!chatId?.chatId}
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
          <div className="flex flex-1 flex-col gap-7">
            {messages.length === 0 && !isSubmitting && !remotePendingQuery && (
              <div className="flex flex-1 items-center justify-center text-center">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    What can I help you with?
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    You can create up to 2 chat sessions, with up to 4
                    conversations per session (token limit).
                  </p>
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <MessageItem
                key={message._id ?? index}
                message={message}
                isAnimated={message._id === animatedMessageId}
                currentUserId={user?._id}
                currentUserAvatar={user?.avatar}
                currentUserName={userName}
              />
            ))}
            {isSubmitting && pendingQuery && (
              <div className="flex flex-col gap-7">
                <div className="flex justify-end gap-3">
                  <div className="max-w-[min(90%,42rem)] rounded-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                    {pendingQuery}
                  </div>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={userName}
                        className="size-full rounded-md object-cover"
                      />
                    ) : (
                      <UserRound className="size-4" />
                    )}
                  </div>
                </div>

                {isGithubAgentOn ? <AssistantMessageSkeleton /> : null}
              </div>
            )}
            {!isSubmitting && remotePendingQuery && (
              <div className="flex flex-col gap-7">
                <div className="flex justify-end gap-3">
                  <div className="max-w-[min(90%,42rem)] rounded-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                    <p className="mb-1 text-[10px] uppercase tracking-wide opacity-70">
                      {remotePendingUser || "Collaborator"}
                    </p>
                    {remotePendingQuery}
                  </div>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
                    {remotePendingAvatar ? (
                      <img
                        src={remotePendingAvatar}
                        alt={remotePendingUser || "Collaborator"}
                        className="size-full rounded-md object-cover"
                      />
                    ) : (
                      <Users className="size-4" />
                    )}
                  </div>
                </div>
                <AssistantMessageSkeleton />
              </div>
            )}
            <div ref={refForChat} />
          </div>
        </div>
      </main>

      <div className="shrink-0 border-t bg-background px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="mx-auto  max-w-3xl rounded-lg border bg-background p-2 shadow-sm"
        >
          {fileUploaded && (
            <div className="flex items-center gap-2 bg-gray-100 max-w-fit px-2 py-1 rounded-md border border-gray-300">
               {isFileUploading && (
                <Loader2 className="size-4 animate-spin text-black" />
               )}
              <span className="text-sm text-black font-medium">
                {fileUploaded.name}
              </span>
              <X className="size-2 hover:cursor-pointer" onClick={() => setFileUploaded(null)} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-full relative">
              <textarea
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Message GPT (max 2 sessions, 4 conversations per session)"
                rows={1}
                disabled={isSubmitting}
                className="max-h-40 min-h-10 flex-1 w-full resize-none bg-transparent pl-9 px-2 py-2 text-sm outline-none flex items-center placeholder:text-muted-foreground no-scrollbar"
              />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 hover:bg-gray-200 hover:cursor-pointer rounded-md p-1">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf"
                  className="hidden"
                  disabled={fileUploaded !== null}
                  onChange={handleFileUpload}
                />

                <label
                  htmlFor="file-upload"
                  className={cn("hover:cursor-pointer", fileUploaded !== null ? "text-gray-500" : "hover:bg-gray-200")}
                >
                  <Paperclip className={cn("size-4 hover:cursor-pointer", fileUploaded === null && "text-gray-500 hover:bg-gray-200")} />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 max-w-fit ">
              <span className="text-sm text-black font-medium whitespace-nowrap">Github Agent</span>
              <Switch checked={isGithubAgentOn} onCheckedChange={setIsGithubAgentOn} />
            </div>
            {String(chatId?.ownerId) === String(user?._id) && (
              <Button variant="outline" className="gap-1.5" onClick={()=>setIsCollaboratePeopleChatOpen(true)}>
                <Users className="size-4" />
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={isSubmitting}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </form>
      </div>

      {isCollaboratePeopleChatOpen && (
        <CollaboratePeopleChat onClose={()=>setIsCollaboratePeopleChatOpen(false)} isOpen={isCollaboratePeopleChatOpen} chatId={chatId?.chatId || ""} />
      )}
    </div>
  );
};

export default ChatPage;
