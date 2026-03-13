"use client";

import { MessageSquarePlus, Trash2 } from "lucide-react";

import type { ChatSession } from "@/lib/hooks/use-streaming-chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionClick: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSessionClick,
  onNewChat,
  onDeleteSession,
}: SessionSidebarProps) {
  return (
    <div className="flex h-full w-72 flex-col border-r border-[var(--color-divider)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">Chats</h3>
        <Button variant="ghost" size="sm" onClick={onNewChat}>
          <MessageSquarePlus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
            No conversations yet. Start a new chat to create your first session.
          </div>
        ) : null}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group flex items-start gap-3 rounded-xl border px-3 py-3 transition",
              activeSessionId === session.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary-glow)]"
                : "border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-offset)]"
            )}
          >
            <button onClick={() => onSessionClick(session.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">{session.title}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {session.messageCount} messages • {new Date(session.updatedAt).toLocaleString()}
              </p>
            </button>
            <button
              onClick={() => onDeleteSession(session.id)}
              className="opacity-0 transition group-hover:opacity-100"
              title="Delete chat"
            >
              <Trash2 className="h-4 w-4 text-[var(--color-text-faint)] hover:text-[var(--color-error)]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
