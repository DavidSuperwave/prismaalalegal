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
          content: "I couldn't process that inbox request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t border-[var(--color-divider)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-divider)] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
          <Bot className="h-4 w-4 text-[var(--color-primary)]" />
          Conversation Copilot
        </div>
      </div>

      <div className="max-h-48 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Ask the agent to summarize the thread, draft a reply, or identify next steps.
          </p>
        ) : null}

        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                message.role === "user"
                  ? "inline-block rounded-2xl bg-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-text-inverse)]"
                  : "inline-block rounded-2xl border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)]"
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
          placeholder="Ask about this conversation..."
          disabled={!conversationId || isLoading}
        />
        <Button onClick={() => void sendMessage()} disabled={!conversationId || isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
