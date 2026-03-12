"use client";

import { useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InboxChatProps {
  conversationId?: string;
}

interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function InboxChat({ conversationId }: InboxChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !conversationId || isLoading) return;

    const nextUserMessage: AgentMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((previous) => [...previous, nextUserMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/inbox/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: trimmed,
        }),
      });

      const data = (await response.json()) as { content: string };
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "assistant", content: data.content },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "No pude procesar esa solicitud de bandeja. Inténtalo de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
          <Bot className="h-4 w-4 text-blue-600" />
          Copiloto de conversación
        </div>
      </div>

      <div className="max-h-48 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-stone-500">
            Pide al agente que resuma el hilo, redacte una respuesta o sugiera próximos pasos.
          </p>
        ) : null}

        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                message.role === "user"
                  ? "inline-block rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white"
                  : "inline-block rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700"
              }
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 p-4">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Pregunta sobre esta conversación..."
          disabled={!conversationId || isLoading}
        />
        <Button onClick={() => void sendMessage()} disabled={!conversationId || isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
