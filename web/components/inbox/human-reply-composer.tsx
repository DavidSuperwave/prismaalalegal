"use client";

import { useState } from "react";
import { Bot, CheckCircle2, Loader2, Pencil, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface HumanReplyComposerProps {
  conversationId: string;
  contactName: string;
  onReplySent?: () => void;
}

type ComposerMode = "manual" | "agent";

export function HumanReplyComposer({ conversationId, contactName, onReplySent }: HumanReplyComposerProps) {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<ComposerMode>("manual");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftContext, setDraftContext] = useState("");

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
      setDraftContext("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      onReplySent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/inbox/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          context: draftContext.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { success?: boolean; draft?: string; error?: string };
      if (!response.ok || !data.success || !data.draft) {
        throw new Error(data.error || "Failed to generate draft");
      }

      setMessage(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="border-t border-[#2A2A32] bg-[#0E0E12] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-[#141418] p-1">
          <button
            onClick={() => {
              setMode("manual");
              setError(null);
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "manual"
                ? "bg-[#0E0E12] text-[#E8E8ED] shadow-sm"
                : "text-[#8888A0] hover:text-[#E8E8ED]"
            }`}
          >
            <Pencil className="h-3 w-3" />
            Manual
          </button>
          <button
            onClick={() => {
              setMode("agent");
              setError(null);
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "agent"
                ? "bg-[#0E0E12] text-[#818CF8] shadow-sm"
                : "text-[#8888A0] hover:text-[#E8E8ED]"
            }`}
          >
            <Bot className="h-3 w-3" />
            Agente
          </button>
        </div>
        {sent && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Enviado
          </span>
        )}
      </div>

      {mode === "agent" && (
        <div className="mb-2 space-y-2">
          <input
            type="text"
            value={draftContext}
            onChange={(e) => setDraftContext(e.target.value)}
            placeholder="Instrucción opcional: 'pregunta por la póliza', 'ofrece consulta gratis'..."
            className="w-full rounded-md border border-[#2A2A32] bg-[#141418] px-3 py-2 text-xs text-[#E8E8ED] placeholder:text-[#55556A] focus:border-[#818CF8] focus:outline-none"
          />
          <Button
            onClick={handleGenerateDraft}
            disabled={isGenerating}
            variant="outline"
            className="w-full gap-2 border-[#818CF8]/30 text-[#818CF8] hover:bg-[#818CF8]/10"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando borrador...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar Borrador con IA
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "agent"
              ? "Borrador generado aparecerá aquí — edítalo antes de enviar..."
              : `Escribe tu respuesta para ${contactName}...`
          }
          disabled={isSending}
          className="min-h-[80px] resize-none border-[#2A2A32] bg-[#141418] text-[#E8E8ED] placeholder:text-[#55556A] focus:border-[#818CF8] focus:ring-[#818CF8]/20"
        />

        {error && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#55556A]">
            {mode === "agent" && message ? "✏️ Edita el borrador y presiona Enviar" : "Ctrl+Enter para enviar"}
          </span>
          <Button
            onClick={() => void handleSend()}
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
