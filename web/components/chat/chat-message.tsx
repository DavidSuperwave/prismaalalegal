"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";

import type { ChatMessage as ChatMessageType } from "@/lib/hooks/use-streaming-chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar className={cn("h-8 w-8", isUser ? "bg-blue-600" : "bg-blue-50")}>
        <AvatarFallback className={cn(isUser ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700")}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
          isUser ? "bg-blue-600 text-white" : "border border-stone-200 bg-white text-stone-900"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        ) : (
          <div className="prose-chat text-sm leading-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {message.content || (message.isStreaming ? "Thinking..." : "")}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
