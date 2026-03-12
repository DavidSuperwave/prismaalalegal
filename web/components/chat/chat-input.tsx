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
  placeholder = "Pregunta sobre leads, casos o actividad de la bandeja...",
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
    <div className="border-t border-stone-200 bg-white p-4">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-sm">
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
          className="min-h-[52px] w-full resize-none bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Adjuntar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
