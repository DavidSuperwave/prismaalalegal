"use client";

import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Loader2, PanelRight } from "lucide-react";

import { HumanReplyComposer } from "@/components/inbox/human-reply-composer";
import { LeadDetailsPanel } from "@/components/inbox/lead-details-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ConversationMessage {
  id: string;
  sender: "contact" | "agent" | "human";
  content: string;
  channel: "manychat" | "telegram" | "web";
  timestamp: string;
}

export interface ConversationDetail {
  id: string;
  contactName: string;
  contactPhone?: string;
  source: "manychat" | "telegram";
  sentiment?: "positive" | "neutral" | "negative";
  status?: "active" | "archived";
  messages: ConversationMessage[];
}

export function ConversationView({
  conversation,
  onReplySent,
  onStatusChanged,
}: {
  conversation: ConversationDetail | null;
  onReplySent?: () => void;
  onStatusChanged?: () => void;
}) {
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isArchived = conversation?.status === "archived";

  useEffect(() => {
    setDetailsOpen(false);
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[var(--color-bg)]">
        <div className="max-w-md text-center">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">Select a conversation</h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Choose a thread from the left to review the full history and ask the agent for help.
          </p>
        </div>
      </div>
    );
  }

  const handleToggleArchive = async () => {
    if (isTogglingStatus || !conversation) return;
    setIsTogglingStatus(true);
    try {
      const response = await fetch(`/api/inbox/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isArchived ? "active" : "archived" }),
      });
      if (response.ok) {
        onStatusChanged?.();
      }
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <section className="flex min-h-0 flex-1 bg-[var(--color-surface)]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-[var(--color-divider)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-[var(--color-text)]">{conversation.contactName}</h1>
              <Badge variant="outline">{conversation.source}</Badge>
              {isArchived && (
                <Badge variant="outline" className="border-[var(--color-text-faint)] text-[var(--color-text-muted)]">
                  Archivado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleToggleArchive()}
                disabled={isTogglingStatus}
                className="gap-1.5 border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                {isTogglingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isArchived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {isArchived ? "Desarchivar" : "Archivar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailsOpen((current) => !current)}
                className="gap-1.5 border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <PanelRight className="h-4 w-4" />
                {detailsOpen ? "Ocultar detalles" : "Detalles"}
              </Button>
            </div>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {conversation.contactPhone || "No phone number available"}
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {conversation.messages.map((message) => (
            <div key={message.id} className={message.sender === "contact" ? "text-left" : "text-right"}>
              <div
                className={
                  message.sender === "contact"
                    ? "inline-block max-w-2xl rounded-2xl border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-4 py-3 text-left"
                    : message.sender === "human"
                      ? "inline-block max-w-2xl rounded-2xl bg-emerald-600 px-4 py-3 text-left text-white"
                      : "inline-block max-w-2xl rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-left text-[var(--color-text-inverse)]"
                }
              >
                <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                  <span className="font-medium">
                    {message.sender === "human"
                      ? "👤 Tú"
                      : message.sender === "agent"
                        ? "🤖 Agente"
                        : conversation.contactName}
                  </span>
                  <span>{new Date(message.timestamp).toLocaleString()}</span>
                  <span className="uppercase">{message.channel}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
              </div>
            </div>
          ))}
        </div>

        {isArchived ? (
          <div className="border-t border-[var(--color-divider)] bg-[var(--color-surface)] px-6 py-4 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Esta conversación está archivada.{" "}
              <button
                onClick={() => void handleToggleArchive()}
                disabled={isTogglingStatus}
                className="text-[var(--color-primary)] underline hover:text-[var(--color-primary-hover)]"
              >
                Desarchivar para responder
              </button>
            </p>
          </div>
        ) : (
          <HumanReplyComposer
            conversationId={conversation.id}
            contactName={conversation.contactName}
            isArchived={isArchived}
            onReplySent={onReplySent}
          />
        )}
      </div>

      <LeadDetailsPanel
        conversationId={conversation.id}
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </section>
  );
}
