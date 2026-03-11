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
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50">
        <Bot className="h-8 w-8 text-blue-700" />
      </div>
      <h1 className="mb-3 text-3xl font-semibold text-stone-900">What can I help with?</h1>
      <p className="mb-8 max-w-xl text-center text-stone-500">
        Ask SUPERWAVE to review pipeline activity, summarize ManyChat conversations, or draft the
        next action for a lead.
      </p>
      <div className="flex max-w-3xl flex-wrap justify-center gap-2">
        {SUGGESTED_QUERIES.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Sparkles className="h-4 w-4" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
