"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isProcessing: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isProcessing,
  placeholder = "Ask anything about leads, cases, or inbox activity...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isProcessing) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="border-t border-[var(--color-divider)] bg-[var(--color-surface)] p-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 shadow-sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="min-h-[52px] w-full resize-none bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
