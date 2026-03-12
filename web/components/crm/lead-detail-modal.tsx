"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { Lead } from "@/lib/hooks/use-contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STATUSES: Lead["status"][] = ["new", "contacted", "qualified", "consultation", "retained", "closed"];
const CASE_TYPES = ["immigration", "criminal", "family", "civil", "other"];
const STATUS_LABELS: Record<Lead["status"], string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  consultation: "Consulta agendada",
  retained: "Retenido",
  closed: "Cerrado/Perdido",
};
const CASE_TYPE_LABELS: Record<string, string> = {
  immigration: "Inmigración",
  criminal: "Penal",
  family: "Familiar",
  civil: "Civil",
  other: "Otro",
};

interface LeadDetailModalProps {
  lead: Lead | null;
  isCreateMode?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function LeadDetailModal({
  lead,
  isCreateMode = false,
  onClose,
  onSaved,
}: LeadDetailModalProps) {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    source: "manual",
    status: "new",
    caseType: "",
    lastAction: "",
    notes: "",
    assignedTo: "",
    tags: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!lead) {
      setFormState({
        name: "",
        email: "",
        phone: "",
        source: "manual",
        status: "new",
        caseType: "",
        lastAction: "",
        notes: "",
        assignedTo: "",
        tags: "",
      });
      return;
    }

    setFormState({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source,
      status: lead.status,
      caseType: lead.caseType || "",
      lastAction: lead.lastAction || "",
      notes: lead.notes || "",
      assignedTo: lead.assignedTo || "",
      tags: lead.tags.join(", "),
    });
  }, [lead]);

  if (!lead && !isCreateMode) {
    return null;
  }

  const leadId = lead?.id;

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const payload = {
      ...formState,
      tags: formState.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    const response = await fetch(leadId ? `/api/crm/leads/${leadId}` : "/api/crm/leads", {
      method: leadId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {isCreateMode ? "Agregar lead" : formState.name || "Detalle del lead"}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Revisa notas, tipo de caso, etiquetas y avance en el pipeline.
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 transition hover:text-stone-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Nombre</label>
            <Input value={formState.name} onChange={(event) => setFormState({ ...formState, name: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Email</label>
            <Input value={formState.email} onChange={(event) => setFormState({ ...formState, email: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Teléfono</label>
            <Input value={formState.phone} onChange={(event) => setFormState({ ...formState, phone: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Asignado a</label>
            <Input value={formState.assignedTo} onChange={(event) => setFormState({ ...formState, assignedTo: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Estado</label>
            <select
              value={formState.status}
              onChange={(event) => setFormState({ ...formState, status: event.target.value as Lead["status"] })}
              className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Tipo de caso</label>
            <select
              value={formState.caseType}
              onChange={(event) => setFormState({ ...formState, caseType: event.target.value })}
              className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="">Selecciona tipo de caso</option>
              {CASE_TYPES.map((caseType) => (
                <option key={caseType} value={caseType}>
                  {CASE_TYPE_LABELS[caseType]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-stone-700">Última acción</label>
            <Input
              value={formState.lastAction}
              onChange={(event) => setFormState({ ...formState, lastAction: event.target.value })}
              placeholder="Llamé al cliente, envié seguimiento, agendé consulta..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-stone-700">Etiquetas</label>
            <Input
              value={formState.tags}
              onChange={(event) => setFormState({ ...formState, tags: event.target.value })}
              placeholder="manychat, tibio, español"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-stone-700">Notas</label>
            <Textarea
              value={formState.notes}
              onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
              placeholder="Resumen de intake, próximos pasos, fecha de audiencia, presupuesto..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-200 p-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formState.name.trim()}>
            {isSubmitting ? "Guardando..." : isCreateMode ? "Crear lead" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
