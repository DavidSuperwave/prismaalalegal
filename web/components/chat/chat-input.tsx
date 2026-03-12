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
    <div className="border-t border-[#2A2A32] bg-[#0E0E12] p-4">
      <div className="rounded-2xl border border-[#333340] bg-[#141418] p-3 shadow-sm">
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
          className="min-h-[52px] w-full resize-none bg-transparent text-sm text-[#E8E8ED] placeholder:text-[#55556A] focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#333340] bg-transparent px-3 py-1.5 text-xs text-[#8888A0]"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-full bg-[#818CF8] px-4 py-2 text-sm font-medium text-[#08080A] transition hover:bg-[#6366F1] disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
