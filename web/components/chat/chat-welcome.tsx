"use client";

import { Bot, Sparkles } from "lucide-react";

const SUGGESTED_QUERIES = [
  "Muéstrame los leads nuevos de hoy",
  "Redacta seguimiento para María García",
  "¿Qué casos necesitan atención esta semana?",
  "Resume mi bandeja de ManyChat",
  "Califica los contactos más recientes",
];

export function ChatWelcome({ onSuggestionClick }: { onSuggestionClick: (value: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50">
        <Bot className="h-8 w-8 text-blue-700" />
      </div>
      <h1 className="mb-3 text-3xl font-semibold text-stone-900">¿En qué te ayudo?</h1>
      <p className="mb-8 max-w-xl text-center text-stone-500">
        Pide al agente de ALA Legal revisar el pipeline, resumir conversaciones de ManyChat o redactar
        la siguiente acción para un lead.
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
