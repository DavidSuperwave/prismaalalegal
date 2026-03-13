"use client";

import { Bot, Sparkles } from "lucide-react";

const SUGGESTED_QUERIES = [
  "Show me today's new leads",
  "Draft a follow-up for Maria Garcia",
  "What cases need attention this week?",
  "Summarize my inbox from ManyChat",
  "Qualify the latest inbound contacts",
];

export function ChatWelcome({ onSuggestionClick }: { onSuggestionClick: (value: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-primary)] bg-[var(--color-primary-glow)]">
        <Bot className="h-8 w-8 text-[var(--color-primary)]" />
      </div>
      <h1 className="mb-3 font-display text-3xl font-semibold text-[var(--color-text)]">What can I help with?</h1>
      <p className="mb-8 max-w-xl text-center text-[var(--color-text-muted)]">
        Ask PrismaProject to review pipeline activity, summarize ManyChat conversations, or draft the
        next action for a lead.
      </p>
      <div className="flex max-w-3xl flex-wrap justify-center gap-2">
        {SUGGESTED_QUERIES.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-glow)] hover:text-[var(--color-primary)]"
          >
            <Sparkles className="h-4 w-4" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
