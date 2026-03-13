"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { formatCurrencyFromCents } from "@/lib/currency";
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

type ColumnId = (typeof COLUMNS)[number]["id"];
type DndListeners = Record<string, ((event: unknown) => void) | undefined>;

function isColumnId(value: string | null | undefined): value is ColumnId {
  return COLUMNS.some((column) => column.id === value);
}

function LeadCard({
  lead,
  onClick,
  isDragging = false,
  isOverlay = false,
  attributes,
  listeners,
  style,
}: {
  lead: Lead;
  onClick: () => void;
  isDragging?: boolean;
  isOverlay?: boolean;
  attributes?: DraggableAttributes;
  listeners?: DndListeners;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface-2)] p-4 text-left shadow-sm transition ${
        isOverlay
          ? "cursor-grabbing shadow-[0_12px_24px_rgba(0,0,0,0.25),0_4px_8px_rgba(0,0,0,0.15)]"
          : "hover:bg-[var(--color-surface-offset)] hover:shadow-md"
      } ${isDragging ? "opacity-40" : ""}`}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-[var(--color-text)]">{lead.name}</h3>
          <p className="text-sm text-[var(--color-text-muted)]">{lead.email || lead.phone || "No contact detail"}</p>
        </div>
        <Badge variant={lead.source === "manychat" ? "blue" : "outline"}>{lead.source}</Badge>
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">{lead.lastAction}</p>

      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>{formatTimeAgo(lead.lastActionAt)}</span>
        <span>{lead.assignedTo ? lead.assignedTo.split("@")[0] : "Unassigned"}</span>
      </div>

      <div className="mt-2 text-xs font-medium text-[var(--color-text)]">
        {formatCurrencyFromCents(lead.opportunityValue)}
      </div>

      {lead.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-[var(--color-surface-offset)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function DraggableLeadCard({
  lead,
  onClick,
}: {
  lead: Lead;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { type: "lead", leadId: lead.id, status: lead.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: "none",
  } as CSSProperties;

  return (
    <div ref={setNodeRef}>
      <LeadCard
        lead={lead}
        onClick={onClick}
        isDragging={isDragging}
        style={style}
        attributes={attributes}
        listeners={listeners as unknown as DndListeners}
      />
    </div>
  );
}

function DroppableColumn({
  column,
  isHighlighted,
  isLoading,
  leads,
  onLeadClick,
}: {
  column: (typeof COLUMNS)[number];
  isHighlighted: boolean;
  isLoading: boolean;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 flex-col rounded-xl bg-[var(--color-surface)] transition-all ${
        isHighlighted ? "ring-2 ring-[var(--color-primary)] ring-offset-0" : ""
      }`}
    >
      <div className="flex items-center justify-between rounded-t-xl px-4 py-3" style={{ backgroundColor: `${column.color}15` }}>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="font-medium text-[var(--color-text)]">{column.label}</span>
        </div>
        <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text-muted)]">{leads.length}</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-text-muted)]">
            Loading leads...
          </div>
        ) : null}

        {!isLoading && leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-text-muted)]">
            Drop a lead here.
          </div>
        ) : null}

        {leads.map((lead) => (
          <DraggableLeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
        ))}
      </div>
    </div>
  );
}

export function PipelineKanban() {
  const { leads, isLoading, refresh } = useContacts();
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [activeDropColumnId, setActiveDropColumnId] = useState<ColumnId | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const groupedLeads = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        leads: leads.filter((lead) => lead.status === column.id),
      })),
    [leads]
  );

  const activeLead = useMemo(
    () => leads.find((lead) => lead.id === activeLeadId) || null,
    [activeLeadId, leads]
  );

  const pipelineValue = useMemo(
    () =>
      leads
        .filter((lead) => lead.status !== "closed")
        .reduce((sum, lead) => sum + (lead.opportunityValue ?? 0), 0),
    [leads]
  );

  const handleDrop = async (lead: Lead, status: Lead["status"]) => {
    if (lead.status === status) return;

    await fetch(`/api/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        lastAction: `Moved to ${COLUMNS.find((column) => column.id === status)?.label}`,
      }),
    });

    await refresh();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLeadId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    setActiveDropColumnId(isColumnId(overId) ? overId : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const draggedId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    setActiveLeadId(null);
    setActiveDropColumnId(null);

    if (!isColumnId(overId)) return;

    const draggedLead = leads.find((lead) => lead.id === draggedId);
    if (!draggedLead) return;

    await handleDrop(draggedLead, overId);
  };

  const handleDragCancel = () => {
    setActiveLeadId(null);
    setActiveDropColumnId(null);
  };

  return (
    <>
      <div className="flex h-full min-h-screen flex-col bg-[var(--color-bg)]">
        <div className="border-b border-[var(--color-divider)] bg-[var(--color-surface)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-text)]">CRM Pipeline</h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {leads.length} leads total • {leads.filter((lead) => lead.status === "new").length} new •{" "}
                {formatCurrencyFromCents(pipelineValue)} pipeline value
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>+ Add Lead</Button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-6 py-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={(event) => void handleDragEnd(event)}
            onDragCancel={handleDragCancel}
          >
            <div className="flex min-h-full min-w-max gap-4">
              {groupedLeads.map((column) => (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  isHighlighted={activeDropColumnId === column.id}
                  isLoading={isLoading}
                  leads={column.leads}
                  onLeadClick={setSelectedLead}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
              {activeLead ? (
                <div style={{ transform: "rotate(-6deg) scale(1.02)" }}>
                  <LeadCard lead={activeLead} onClick={() => undefined} isOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
