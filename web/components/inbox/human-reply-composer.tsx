"use client";

import { useState } from "react";
import { Bot, CheckCircle2, Loader2, Pencil, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface HumanReplyComposerProps {
  conversationId: string;
  contactName: string;
  isArchived?: boolean;
  onReplySent?: () => void;
}

type ComposerMode = "manual" | "agent";

export function HumanReplyComposer({ conversationId, contactName, isArchived = false, onReplySent }: HumanReplyComposerProps) {
  const [message, setMessage] = useState("");
  const [originalDraft, setOriginalDraft] = useState<string | null>(null);
  const [mode, setMode] = useState<ComposerMode>("manual");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftContext, setDraftContext] = useState("");

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    if (isArchived) {
      setError("This conversation is archived. Unarchive to reply.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: trimmed,
          originalDraft: originalDraft || undefined,
        }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send reply");
      }

      setMessage("");
      setOriginalDraft(null);
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
    if (isArchived) {
      setError("This conversation is archived. Unarchive to generate a draft.");
      return;
    }
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
      setOriginalDraft(data.draft);
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
    <div className="border-t border-[var(--color-divider)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-2)] p-1">
          <button
            onClick={() => {
              setMode("manual");
              setError(null);
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "manual"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
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
                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
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
            className="w-full rounded-md border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          <Button
            onClick={handleGenerateDraft}
            disabled={isGenerating || isArchived}
            variant="outline"
            className="w-full gap-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-glow)]"
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
      {mode === "manual" && (
        <div className="mb-2">
          <Button
            onClick={handleGenerateDraft}
            disabled={isGenerating || isArchived}
            variant="outline"
            className="w-full gap-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-glow)]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando mensaje...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar mensaje con IA
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={message}
          onChange={(e) => {
            const nextValue = e.target.value;
            setMessage(nextValue);
            if (!nextValue.trim()) {
              setOriginalDraft(null);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "agent"
              ? "Borrador generado aparecerá aquí — edítalo antes de enviar..."
              : `Escribe tu respuesta para ${contactName}...`
          }
          disabled={isSending || isArchived}
          className="min-h-[80px] resize-none border-[var(--color-divider)] bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />

        {error && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-faint)]">
            {mode === "agent" && message ? "✏️ Edita el borrador y presiona Enviar" : "Ctrl+Enter para enviar"}
          </span>
          <Button
            onClick={() => void handleSend()}
            disabled={!message.trim() || isSending || isArchived}
            className="gap-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
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
