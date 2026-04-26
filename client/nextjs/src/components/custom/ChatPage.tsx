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
import { ArrowUp, Share2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/ChatContext";
import { AxiosError } from "axios";
import { toast } from "sonner";
import api from "@/helpers/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaInfinity } from "react-icons/fa";
import AssistantMessageSkeleton from "./AssistantMessageSkeleton";
import { TextGenerateEffect } from "../ui/text-generate-effect";

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
    query: string;
    content: string;
  };
  isAnimated: boolean;
  userAvatar?: string;
  userName: string;
};

const MessageItem = memo(
  ({ message, isAnimated, userAvatar, userName }: MessageItemProps) => (
    <div className="flex flex-col gap-7">
      <div className="flex justify-end gap-3">
        <div className="max-w-[min(90%,42rem)] rounded-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
          {message.query}
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="size-full object-cover rounded-md"
            />
          ) : (
            <UserRound className="size-4" />
          )}
        </div>
      </div>

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
    </div>
  ),
);

MessageItem.displayName = "MessageItem";

const ChatPage = () => {
  const { user, chatId, messages, setMessages, setChatId, setAllChatId } =
    useAuth();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(
    null,
  );
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const userName = user?.displayName || "Guest";
  const userInitial = userName.charAt(0).toUpperCase();
  const refForChat = useRef<HTMLDivElement | null>(null);

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
      });
      // console.log(result.data);
      const newMessageId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        {
          _id: newMessageId,
          query: text,
          content: result.data.data,
          createdAt: new Date(),
        },
      ]);
      setAnimatedMessageId(newMessageId);

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      const wordCount = String(result.data.data).split(/\s+/).length;
      animationTimeoutRef.current = setTimeout(
        () => setAnimatedMessageId(null),
        Math.min(4500, 400 + wordCount * 25),
      );

      if (chatId === null && result.data.chatSession) {
        const chatSession = {
          title: result.data.chatSession.title || "New Chat",
          chatId: result.data.chatSession.chatId,
        };
        setChatId(chatSession);
        setAllChatId((prev) => [chatSession, ...prev]);
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
            {messages.length === 0 && !isSubmitting && (
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
                userAvatar={user?.avatar}
                userName={userName}
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
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-lg border bg-background p-2 shadow-sm"
        >
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
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none flex items-center placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={isSubmitting}
          >
            <ArrowUp className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
