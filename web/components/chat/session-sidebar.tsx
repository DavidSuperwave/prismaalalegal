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
    <div className="flex h-full w-72 flex-col border-r border-[#2A2A32] bg-[#0E0E12]">
      <div className="flex items-center justify-between border-b border-[#2A2A32] p-4">
        <h3 className="text-sm font-medium text-[#E8E8ED]">Chats</h3>
        <Button variant="ghost" size="sm" onClick={onNewChat}>
          <MessageSquarePlus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#333340] p-4 text-sm text-[#8888A0]">
            No conversations yet. Start a new chat to create your first session.
          </div>
        ) : null}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group flex items-start gap-3 rounded-xl border px-3 py-3 transition",
              activeSessionId === session.id
                ? "border-[#818CF8]/20 bg-[#818CF8]/10"
                : "border-transparent hover:border-[#333340] hover:bg-[#1A1A20]"
            )}
          >
            <button onClick={() => onSessionClick(session.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-[#E8E8ED]">{session.title}</p>
              <p className="mt-1 text-xs text-[#8888A0]">
                {session.messageCount} messages • {new Date(session.updatedAt).toLocaleString()}
              </p>
            </button>
            <button
              onClick={() => onDeleteSession(session.id)}
              className="opacity-0 transition group-hover:opacity-100"
              title="Delete chat"
            >
              <Trash2 className="h-4 w-4 text-[#55556A] hover:text-[#F87171]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
