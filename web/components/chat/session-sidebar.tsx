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
    <div className="flex h-full w-72 flex-col border-r border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 p-4">
        <h3 className="text-sm font-medium text-stone-900">Chats</h3>
        <Button variant="ghost" size="sm" onClick={onNewChat}>
          <MessageSquarePlus className="mr-1 h-4 w-4" />
          Nuevo
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-200 p-4 text-sm text-stone-500">
            Aún no hay conversaciones. Inicia un chat nuevo para crear la primera sesión.
          </div>
        ) : null}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group flex items-start gap-3 rounded-xl border px-3 py-3 transition",
              activeSessionId === session.id
                ? "border-blue-200 bg-blue-50"
                : "border-transparent hover:border-stone-200 hover:bg-stone-50"
            )}
          >
            <button onClick={() => onSessionClick(session.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-stone-900">{session.title}</p>
              <p className="mt-1 text-xs text-stone-500">
                {session.messageCount} mensajes • {new Date(session.updatedAt).toLocaleString("es-MX")}
              </p>
            </button>
            <button
              onClick={() => onDeleteSession(session.id)}
              className="opacity-0 transition group-hover:opacity-100"
              title="Eliminar chat"
            >
              <Trash2 className="h-4 w-4 text-stone-400 hover:text-red-600" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
