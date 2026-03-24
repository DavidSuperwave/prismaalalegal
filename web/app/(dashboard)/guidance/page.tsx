"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type GuidanceItem = {
  id: string;
  content: string;
  category: string | null;
  created_at: string;
};

export default function GuidancePage() {
  const [items, setItems] = useState<GuidanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGuidance = useCallback(async () => {
    try {
      const response = await fetch("/api/guidance", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { guidance: GuidanceItem[] };
        setItems(data.guidance || []);
      }
    } catch {
      setError("Failed to load guidance");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGuidance();
  }, [loadGuidance]);

  const handleAdd = async () => {
    const content = newContent.trim();
    if (!content) return;

    setIsAdding(true);
    setError(null);
    try {
      const response = await fetch("/api/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          category: newCategory.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to add guidance");
      }

      setNewContent("");
      setNewCategory("");
      void loadGuidance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/guidance?id=${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete guidance");
      }
      void loadGuidance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Reglas del Operador</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Instrucciones permanentes que el agente sigue al responder conversaciones. Se aplican
          automáticamente basado en relevancia.
        </p>
      </div>

      {/* Add new guidance */}
      <div className="mb-8 rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Nueva regla</h2>
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Ej: Siempre preguntar por el número de póliza en casos de negativa de aseguradora"
          className="mb-3 min-h-[80px] resize-none border-[var(--color-divider)] bg-[var(--color-surface-2)]"
        />
        <div className="flex gap-3">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Categoría (opcional)"
            className="max-w-xs border-[var(--color-divider)] bg-[var(--color-surface-2)]"
          />
          <Button
            onClick={() => void handleAdd()}
            disabled={!newContent.trim() || isAdding}
            className="gap-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]"
          >
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      {/* Guidance list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          No hay reglas activas. Agrega una usando el formulario de arriba.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface)] p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--color-text)]">{item.content}</p>
                <div className="mt-2 flex items-center gap-2">
                  {item.category && <Badge variant="outline">{item.category}</Badge>}
                  <span className="text-xs text-[var(--color-text-faint)]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-[var(--color-text-faint)]">ID: {item.id}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="shrink-0 border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-red-400 hover:text-red-400"
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
