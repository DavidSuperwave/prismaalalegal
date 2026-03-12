"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

import { InboxChat } from "@/components/inbox/inbox-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  manychatSubscriberId?: string;
  source: "manychat" | "telegram";
  sentiment?: "positive" | "neutral" | "negative";
  messages: ConversationMessage[];
}

function senderLabel(sender: ConversationMessage["sender"]) {
  if (sender === "contact") return "Cliente";
  if (sender === "human") return "Equipo";
  return "Agente";
}

function InboxReply({
  conversationId,
  subscriberId,
  onMessageSent,
}: {
  conversationId: string;
  subscriberId?: string;
  onMessageSent?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendReply = async () => {
    const trimmed = message.trim();
    if (!trimmed || !subscriberId || sending) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          message: trimmed,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "No se pudo enviar la respuesta");
      }

      setMessage("");
      onMessageSent?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-stone-200 bg-white px-6 py-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Responder al lead</div>
      <div className="flex gap-3">
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendReply();
            }
          }}
          disabled={!subscriberId || sending}
          placeholder={
            subscriberId
              ? "Escribe una respuesta para enviar por ManyChat..."
              : "No hay subscriber_id de ManyChat para este contacto"
          }
        />
        <Button onClick={() => void sendReply()} disabled={!subscriberId || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function ConversationView({
  conversation,
  onMessageSent,
}: {
  conversation: ConversationDetail | null;
  onMessageSent?: () => void;
}) {
  if (!conversation) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-stone-50">
        <div className="max-w-md text-center">
          <h3 className="text-lg font-semibold text-stone-900">Selecciona una conversación</h3>
          <p className="mt-2 text-sm text-stone-500">
            Elige un hilo de la izquierda para revisar el historial completo y pedir ayuda al agente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="border-b border-stone-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-stone-900">{conversation.contactName}</h1>
          <Badge variant="outline">{conversation.source}</Badge>
        </div>
        <p className="mt-1 text-sm text-stone-500">{conversation.contactPhone || "Sin número de teléfono"}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {conversation.messages.map((message) => (
          <div key={message.id} className={message.sender === "contact" ? "text-left" : "text-right"}>
            <div
              className={
                message.sender === "contact"
                  ? "inline-block max-w-2xl rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-left"
                  : "inline-block max-w-2xl rounded-2xl bg-blue-600 px-4 py-3 text-left text-white"
              }
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                <span className="font-medium">{senderLabel(message.sender)}</span>
                <span>{new Date(message.timestamp).toLocaleString("es-MX")}</span>
                <span className="uppercase">{message.channel}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      <InboxReply
        conversationId={conversation.id}
        subscriberId={conversation.manychatSubscriberId}
        onMessageSent={onMessageSent}
      />
      <InboxChat conversationId={conversation.id} />
    </section>
  );
}
