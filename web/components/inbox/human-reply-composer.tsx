"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface HumanReplyComposerProps {
  conversationId: string;
  contactName: string;
  onReplySent?: () => void;
}

export function HumanReplyComposer({
  conversationId,
  contactName,
  onReplySent,
}: HumanReplyComposerProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: trimmed,
        }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send reply");
      }

      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      onReplySent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-[#2A2A32] bg-[#0E0E12] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[#8888A0]">
          Responder a {contactName}
        </span>
        {sent && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Enviado
          </span>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Escribe tu respuesta para ${contactName}...`}
          disabled={isSending}
          className="min-h-[80px] resize-none border-[#2A2A32] bg-[#141418] text-[#E8E8ED] placeholder:text-[#55556A] focus:border-[#818CF8] focus:ring-[#818CF8]/20"
        />

        {error && (
          <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#55556A]">
            Ctrl+Enter para enviar
          </span>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="gap-2 bg-[#818CF8] text-[#08080A] hover:bg-[#6366F1] disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
