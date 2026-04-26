"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaInfinity } from "react-icons/fa";
import { UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "@/helpers/api";

type SharedMessage = {
  _id: string;
  query: string;
  content: string;
};

type SharedChat = {
  chatId: string;
  title: string;
  chats: SharedMessage[];
};

const SharedChatPage = () => {
  const params = useParams<{ chatId: string }>();
  const [sharedChat, setSharedChat] = useState<SharedChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const getSharedChat = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const result = await api.get(
          `/api/share/${encodeURIComponent(params.chatId)}`,
        );
        setSharedChat(result.data.data);
      } catch (error) {
        // console.log(error);
        setErrorMessage("This shared chat is unavailable.");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.chatId) {
      getSharedChat();
    }
  }, [params.chatId]);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center border-b px-4">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">
            {sharedChat?.title || "Shared chat"}
          </h1>
          <p className="text-xs text-muted-foreground">Read-only conversation</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
          {isLoading && (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Loading shared chat...
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="flex flex-1 items-center justify-center text-center">
              <h2 className="text-xl font-semibold">{errorMessage}</h2>
            </div>
          )}

          {!isLoading && sharedChat && (
            <div className="flex flex-col gap-7">
              {sharedChat.chats.map((message) => (
                <div key={message._id} className="flex flex-col gap-7">
                  <div className="flex justify-end gap-3">
                    <div className="max-w-[min(90%,42rem)] rounded-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                      {message.query}
                    </div>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
                      <UserRound className="size-4" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                      <FaInfinity className="size-4" />
                    </div>
                    <div className="max-w-[min(90%,42rem)] rounded-lg bg-muted px-4 py-3 text-sm leading-6 text-foreground">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-3 last:mb-0">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
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
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SharedChatPage;
