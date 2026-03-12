"use client";

import { useMemo, useState } from "react";

import { useContacts, type Lead } from "@/lib/hooks/use-contacts";
import { formatTimeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeadDetailModal } from "@/components/crm/lead-detail-modal";

const COLUMNS = [
  { id: "new", label: "Nuevo", color: "#3b82f6" },
  { id: "contacted", label: "Contactado", color: "#8b5cf6" },
  { id: "qualified", label: "Calificado", color: "#f59e0b" },
  { id: "consultation", label: "Consulta agendada", color: "#10b981" },
  { id: "retained", label: "Retenido", color: "#059669" },
  { id: "closed", label: "Cerrado/Perdido", color: "#ef4444" },
] as const;

export function PipelineKanban() {
  const { leads, isLoading, refresh } = useContacts();
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const groupedLeads = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        leads: leads.filter((lead) => lead.status === column.id),
      })),
    [leads]
  );

  const handleDrop = async (status: Lead["status"]) => {
    if (!draggedLead || draggedLead.status === status) return;

    await fetch(`/api/crm/leads/${draggedLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        lastAction: `Movido a ${COLUMNS.find((column) => column.id === status)?.label}`,
      }),
    });

    setDraggedLead(null);
    await refresh();
  };

  return (
    <>
      <div className="flex h-full min-h-screen flex-col bg-stone-50">
        <div className="border-b border-stone-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-stone-900">Pipeline CRM</h1>
              <p className="mt-1 text-sm text-stone-500">
                {leads.length} leads totales • {leads.filter((lead) => lead.status === "new").length} nuevos
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>+ Agregar lead</Button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-6 py-6">
          <div className="flex min-h-full min-w-max gap-4">
            {groupedLeads.map((column) => (
              <div
                key={column.id}
                className="flex w-80 flex-col rounded-xl bg-stone-100"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void handleDrop(column.id)}
              >
                <div
                  className="flex items-center justify-between rounded-t-xl px-4 py-3"
                  style={{ backgroundColor: `${column.color}20` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
                    <span className="font-medium text-stone-800">{column.label}</span>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-stone-500">
                    {column.leads.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {isLoading ? (
                    <div className="rounded-lg border border-dashed border-stone-200 bg-white p-4 text-sm text-stone-500">
                      Cargando leads...
                    </div>
                  ) : null}

                  {!isLoading && column.leads.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-stone-200 bg-white p-4 text-sm text-stone-500">
                      Suelta un lead aquí.
                    </div>
                  ) : null}

                  {column.leads.map((lead) => (
                    <button
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLead(lead)}
                      onClick={() => setSelectedLead(lead)}
                      className="w-full rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-stone-900">{lead.name}</h3>
                          <p className="text-sm text-stone-500">{lead.email || lead.phone || "Sin dato de contacto"}</p>
                        </div>
                        <Badge variant={lead.source === "manychat" ? "blue" : "outline"}>{lead.source}</Badge>
                      </div>

                      <p className="mb-3 line-clamp-2 text-sm text-stone-600">{lead.lastAction}</p>

                      <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>{formatTimeAgo(lead.lastActionAt)}</span>
                        <span>{lead.assignedTo ? lead.assignedTo.split("@")[0] : "Sin asignar"}</span>
                      </div>

                      {lead.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {lead.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(selectedLead || showCreateModal) ? (
        <LeadDetailModal
          lead={selectedLead}
          isCreateMode={showCreateModal}
          onClose={() => {
            setSelectedLead(null);
            setShowCreateModal(false);
          }}
          onSaved={() => void refresh()}
        />
      ) : null}
    </>
  );
}
