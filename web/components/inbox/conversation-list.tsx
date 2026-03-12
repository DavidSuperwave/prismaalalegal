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
      ? "bg-emerald-500"
      : sentiment === "negative"
        ? "bg-red-500"
        : "bg-stone-300";

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
    <aside className="flex h-full w-80 flex-col border-r border-stone-200 bg-white">
      <div className="border-b border-stone-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Bandeja de entrada</h2>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar contactos"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-stone-500">No hay conversaciones.</div>
        ) : null}

        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={cn(
              "flex w-full items-start gap-3 border-b border-stone-100 px-4 py-4 text-left transition hover:bg-stone-50",
              selectedConversationId === conversation.id && "bg-blue-50"
            )}
          >
            <div className="mt-1 rounded-full bg-stone-100 p-2">
              {conversation.source === "telegram" ? (
                <Smartphone className="h-4 w-4 text-stone-600" />
              ) : (
                <MessageCircle className="h-4 w-4 text-stone-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-stone-900">{conversation.contactName}</p>
                  <SentimentDot sentiment={conversation.sentiment} />
                </div>
                <span className="shrink-0 text-xs text-stone-400">{formatTimeAgo(conversation.lastMessageAt)}</span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-stone-400" />
                <p className="line-clamp-1 text-sm text-stone-500">{conversation.lastMessage}</p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-stone-400">{conversation.source}</span>
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
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
