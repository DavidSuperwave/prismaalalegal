"use client";

import { Archive, Mail, MessageCircle, Search, Smartphone } from "lucide-react";

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

export type StatusFilter = "active" | "archived" | "all";

interface ConversationListProps {
  search: string;
  onSearchChange: (value: string) => void;
  conversations: ConversationThread[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
}

function SentimentDot({ sentiment = "neutral" }: { sentiment?: ConversationThread["sentiment"] }) {
  const className =
    sentiment === "positive"
      ? "bg-[#34D399]"
      : sentiment === "negative"
        ? "bg-[#F87171]"
        : "bg-[var(--color-text-faint)]";

  return <span className={cn("h-2.5 w-2.5 rounded-full", className)} />;
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Activos" },
  { value: "archived", label: "Archivados" },
  { value: "all", label: "Todos" },
];

export function ConversationList({
  search,
  onSearchChange,
  conversations,
  selectedConversationId,
  onSelectConversation,
  statusFilter,
  onStatusFilterChange,
}: ConversationListProps) {
  return (
    <aside className="flex h-full w-80 flex-col border-r border-[var(--color-divider)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-divider)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Inbox</h2>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-faint)]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search contacts"
            className="pl-9"
          />
        </div>
        <div className="mt-3 flex items-center gap-1 rounded-lg bg-[var(--color-surface-2)] p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusFilterChange(tab.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                statusFilter === tab.value
                  ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              )}
            >
              {tab.value === "archived" && <Archive className="h-3 w-3" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-[var(--color-text-muted)]">No conversations found.</div>
        ) : null}

        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={cn(
              "flex w-full items-start gap-3 border-b border-[var(--color-divider)] px-4 py-4 text-left transition hover:bg-[var(--color-surface-offset)]",
              selectedConversationId === conversation.id && "bg-[var(--color-primary-glow)]"
            )}
          >
            <div className="mt-1 rounded-full bg-[var(--color-surface-2)] p-2">
              {conversation.source === "telegram" ? (
                <Smartphone className="h-4 w-4 text-[var(--color-text-muted)]" />
              ) : (
                <MessageCircle className="h-4 w-4 text-[var(--color-text-muted)]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[var(--color-text)]">{conversation.contactName}</p>
                  <SentimentDot sentiment={conversation.sentiment} />
                </div>
                <span className="shrink-0 text-xs text-[var(--color-text-faint)]">{formatTimeAgo(conversation.lastMessageAt)}</span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                <p className="line-clamp-1 text-sm text-[var(--color-text-muted)]">{conversation.lastMessage}</p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">{conversation.source}</span>
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-inverse)]">
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
