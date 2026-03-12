"use client";

import { Mail, MessageCircle, Search, Smartphone } from "lucide-react";

import { cn, formatTimeAgo } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface ConversationThread {
  id: string;
  contactName: string;
  contactPhone?: string;
  source: "manychat" | "telegram";
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  sentiment?: "positive" | "neutral" | "negative";
  leadId?: string;
  status: "active" | "archived";
}

interface ConversationListProps {
  search: string;
  onSearchChange: (value: string) => void;
  conversations: ConversationThread[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

function SentimentDot({ sentiment = "neutral" }: { sentiment?: ConversationThread["sentiment"] }) {
  const className =
    sentiment === "positive"
      ? "bg-[#34D399]"
      : sentiment === "negative"
        ? "bg-[#F87171]"
        : "bg-[#55556A]";

  return <span className={cn("h-2.5 w-2.5 rounded-full", className)} />;
}

export function ConversationList({
  search,
  onSearchChange,
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <aside className="flex h-full w-80 flex-col border-r border-[#2A2A32] bg-[#0E0E12]">
      <div className="border-b border-[#2A2A32] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8888A0]">Inbox</h2>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55556A]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search contacts"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-[#8888A0]">No conversations found.</div>
        ) : null}

        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={cn(
              "flex w-full items-start gap-3 border-b border-[#2A2A32] px-4 py-4 text-left transition hover:bg-[#1A1A20]",
              selectedConversationId === conversation.id && "bg-[#818CF8]/10"
            )}
          >
            <div className="mt-1 rounded-full bg-[#141418] p-2">
              {conversation.source === "telegram" ? (
                <Smartphone className="h-4 w-4 text-[#8888A0]" />
              ) : (
                <MessageCircle className="h-4 w-4 text-[#8888A0]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[#E8E8ED]">{conversation.contactName}</p>
                  <SentimentDot sentiment={conversation.sentiment} />
                </div>
                <span className="shrink-0 text-xs text-[#55556A]">{formatTimeAgo(conversation.lastMessageAt)}</span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#55556A]" />
                <p className="line-clamp-1 text-sm text-[#8888A0]">{conversation.lastMessage}</p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-[#55556A]">{conversation.source}</span>
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-[#818CF8] px-2 py-0.5 text-xs font-medium text-[#08080A]">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
