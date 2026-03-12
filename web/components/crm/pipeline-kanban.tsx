"use client";

import { useMemo, useState } from "react";

import { useContacts, type Lead } from "@/lib/hooks/use-contacts";
import { formatTimeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeadDetailModal } from "@/components/crm/lead-detail-modal";

const COLUMNS = [
  { id: "new", label: "New Inquiry", color: "#818CF8" },
  { id: "contacted", label: "Contacted", color: "#A78BFA" },
  { id: "qualified", label: "Qualified", color: "#F59E0B" },
  { id: "consultation", label: "Consultation Set", color: "#34D399" },
  { id: "retained", label: "Retained", color: "#059669" },
  { id: "closed", label: "Closed/Lost", color: "#F87171" },
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
        lastAction: `Moved to ${COLUMNS.find((column) => column.id === status)?.label}`,
      }),
    });

    setDraggedLead(null);
    await refresh();
  };

  return (
    <>
      <div className="flex h-full min-h-screen flex-col bg-[#08080A]">
        <div className="border-b border-[#2A2A32] bg-[#0E0E12] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#E8E8ED]">CRM Pipeline</h1>
              <p className="mt-1 text-sm text-[#8888A0]">
                {leads.length} leads total • {leads.filter((lead) => lead.status === "new").length} new
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>+ Add Lead</Button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-6 py-6">
          <div className="flex min-h-full min-w-max gap-4">
            {groupedLeads.map((column) => (
              <div
                key={column.id}
                className="flex w-80 flex-col rounded-xl bg-[#0E0E12]"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void handleDrop(column.id)}
              >
                <div
                  className="flex items-center justify-between rounded-t-xl px-4 py-3"
                  style={{ backgroundColor: `${column.color}15` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
                    <span className="font-medium text-[#E8E8ED]">{column.label}</span>
                  </div>
                  <span className="rounded-full bg-[#141418] px-2 py-1 text-xs text-[#8888A0]">
                    {column.leads.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {isLoading ? (
                    <div className="rounded-lg border border-dashed border-[#333340] bg-[#141418] p-4 text-sm text-[#8888A0]">
                      Loading leads...
                    </div>
                  ) : null}

                  {!isLoading && column.leads.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#333340] bg-[#141418] p-4 text-sm text-[#8888A0]">
                      Drop a lead here.
                    </div>
                  ) : null}

                  {column.leads.map((lead) => (
                    <button
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLead(lead)}
                      onClick={() => setSelectedLead(lead)}
                      className="w-full rounded-xl border border-[#2A2A32] bg-[#141418] p-4 text-left shadow-sm transition hover:bg-[#1A1A20] hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-[#E8E8ED]">{lead.name}</h3>
                          <p className="text-sm text-[#8888A0]">{lead.email || lead.phone || "No contact detail"}</p>
                        </div>
                        <Badge variant={lead.source === "manychat" ? "blue" : "outline"}>{lead.source}</Badge>
                      </div>

                      <p className="mb-3 line-clamp-2 text-sm text-[#8888A0]">{lead.lastAction}</p>

                      <div className="flex items-center justify-between text-xs text-[#8888A0]">
                        <span>{formatTimeAgo(lead.lastActionAt)}</span>
                        <span>{lead.assignedTo ? lead.assignedTo.split("@")[0] : "Unassigned"}</span>
                      </div>

                      {lead.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {lead.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-[#1A1A20] px-2 py-0.5 text-xs text-[#8888A0]"
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
