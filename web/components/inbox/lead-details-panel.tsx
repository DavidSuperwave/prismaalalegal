"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock3, MessageSquare, UserRound, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatTimeAgo } from "@/lib/utils";

type DetailsResponse = {
  conversation: {
    id: string;
    contactName: string;
    contactPhone?: string;
    source: "manychat" | "telegram";
    sentiment: "positive" | "neutral" | "negative";
    status: "active" | "archived";
    leadId?: string;
  };
  lead: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    source: "manychat" | "telegram" | "manual" | "web";
    status: "new" | "contacted" | "qualified" | "consultation" | "retained" | "closed";
    caseType?: string;
    lastAction: string;
    lastActionAt?: string;
    notes: string;
    assignedTo?: string;
    tags: string[];
    opportunityValue: number;
  } | null;
  activity: Array<
    | {
        type: "message";
        id: string;
        sender: "contact" | "agent" | "human";
        channel: "manychat" | "telegram" | "web";
        timestamp: string;
        contentPreview: string;
        metadata: Record<string, unknown>;
      }
    | {
        type: "lead_action";
        id: string;
        action: string;
        timestamp: string;
      }
  >;
};

const LEAD_STATUSES: Array<{
  value: "new" | "contacted" | "qualified" | "consultation" | "retained" | "closed";
  label: string;
}> = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "qualified", label: "Calificado" },
  { value: "consultation", label: "Consulta" },
  { value: "retained", label: "Retenido" },
  { value: "closed", label: "Cerrado" },
];

function DataRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-divider)] py-2 text-xs">
      <span className="text-[var(--color-text-faint)]">{label}</span>
      <span className="text-right text-[var(--color-text)]">{value || "—"}</span>
    </div>
  );
}

export function LeadDetailsPanel({
  conversationId,
  isOpen,
  onClose,
}: {
  conversationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<DetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [leadStatus, setLeadStatus] = useState<"new" | "contacted" | "qualified" | "consultation" | "retained" | "closed">("new");
  const [leadOpportunityValue, setLeadOpportunityValue] = useState("0");
  const [leadNotes, setLeadNotes] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createStatus, setCreateStatus] = useState<
    "new" | "contacted" | "qualified" | "consultation" | "retained" | "closed"
  >("new");
  const [createOpportunityValue, setCreateOpportunityValue] = useState("0");
  const [createNotes, setCreateNotes] = useState("");

  const parseNonNegativeNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const loadDetails = async (targetConversationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inbox/conversations/${targetConversationId}/details`, {
        cache: "no-store",
      });
      const data = (await response.json()) as DetailsResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load details");
      }

      setDetails(data);
      setSaveMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !conversationId) {
      return;
    }

    void loadDetails(conversationId);
  }, [conversationId, isOpen]);

  const activity = useMemo(() => details?.activity || [], [details]);

  useEffect(() => {
    if (!details) return;

    if (details.lead) {
      setLeadStatus(details.lead.status);
      setLeadNotes(details.lead.notes || "");
      setLeadOpportunityValue(String(details.lead.opportunityValue ?? 0));
    } else {
      setCreateName(details.conversation.contactName || "");
      setCreatePhone(details.conversation.contactPhone || "");
      setCreateEmail("");
      setCreateStatus("new");
      setCreateOpportunityValue("0");
      setCreateNotes("");
    }
  }, [details]);

  const handleSaveLead = async () => {
    if (!details?.lead) return;

    setIsSavingLead(true);
    setError(null);
    setSaveMessage(null);
    try {
      const response = await fetch(`/api/crm/leads/${details.lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: leadStatus,
          opportunityValue: parseNonNegativeNumber(leadOpportunityValue),
          notes: leadNotes,
          lastAction: `Updated opportunity stage to ${leadStatus}`,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar el lead");
      }
      if (conversationId) {
        await loadDetails(conversationId);
      }
      setSaveMessage("Lead actualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el lead");
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleCreateAndLinkLead = async () => {
    if (!conversationId) return;
    if (!createName.trim()) {
      setError("Nombre del lead es obligatorio.");
      return;
    }

    setIsCreatingLead(true);
    setError(null);
    setSaveMessage(null);
    try {
      const createResponse = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim() || undefined,
          phone: createPhone.trim() || undefined,
          source: "manual",
          status: createStatus,
          opportunityValue: parseNonNegativeNumber(createOpportunityValue),
          notes: createNotes.trim(),
          lastAction: "Created from inbox details panel",
        }),
      });
      const createData = (await createResponse.json()) as { error?: string; lead?: { id: string } };
      if (!createResponse.ok || !createData.lead?.id) {
        throw new Error(createData.error || "No se pudo crear el lead");
      }

      const linkResponse = await fetch(`/api/inbox/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: createData.lead.id }),
      });
      const linkData = (await linkResponse.json()) as { error?: string };
      if (!linkResponse.ok) {
        throw new Error(linkData.error || "No se pudo vincular el lead");
      }

      await loadDetails(conversationId);
      setSaveMessage("Oportunidad creada y vinculada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la oportunidad");
    } finally {
      setIsCreatingLead(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="h-full w-96 shrink-0 overflow-y-auto border-l border-[var(--color-divider)] bg-[var(--color-surface)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-divider)] bg-[var(--color-surface)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Detalles</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)]"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && <div className="px-4 py-6 text-sm text-[var(--color-text-muted)]">Cargando detalles...</div>}
      {error && <div className="px-4 py-6 text-sm text-red-400">{error}</div>}
      {saveMessage && <div className="px-4 pt-4 text-xs text-emerald-400">{saveMessage}</div>}

      {!isLoading && !error && details && (
        <div className="space-y-5 px-4 py-4">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Conversación
            </h4>
            <div className="rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-3 py-1">
              <DataRow label="ID" value={details.conversation.id} />
              <DataRow label="Contacto" value={details.conversation.contactName} />
              <DataRow label="Teléfono" value={details.conversation.contactPhone} />
              <DataRow label="Canal" value={details.conversation.source} />
              <DataRow label="Estado" value={details.conversation.status} />
              <DataRow label="Sentimiento" value={details.conversation.sentiment} />
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Lead</h4>
              {details.lead?.id ? (
                <Link href="/crm" className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">
                  Ver en CRM
                </Link>
              ) : null}
            </div>

            {details.lead ? (
              <div className="rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-3 py-2">
                <DataRow label="Nombre" value={details.lead.name} />
                <DataRow label="Asignado a" value={details.lead.assignedTo} />
                <div className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] py-2 text-xs">
                  <span className="text-[var(--color-text-faint)]">Etapa</span>
                  <select
                    value={leadStatus}
                    onChange={(event) =>
                      setLeadStatus(
                        event.target.value as
                          | "new"
                          | "contacted"
                          | "qualified"
                          | "consultation"
                          | "retained"
                          | "closed"
                      )
                    }
                    className="rounded-md border border-[var(--color-divider)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
                  >
                    {LEAD_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[#202028] py-2 text-xs">
                  <span className="text-[#777789]">Valor oportunidad ($)</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={leadOpportunityValue}
                    onChange={(event) => setLeadOpportunityValue(event.target.value)}
                    className="h-8 w-32 border-[#2A2A32] bg-[#101016] text-right text-xs text-[#E8E8ED]"
                  />
                </div>
                <DataRow label="Tipo de caso" value={details.lead.caseType} />
                <DataRow label="Email" value={details.lead.email} />
                <DataRow label="Teléfono" value={details.lead.phone} />
                <DataRow
                  label="Última acción"
                  value={
                    details.lead.lastActionAt
                      ? `${details.lead.lastAction} (${formatTimeAgo(details.lead.lastActionAt)})`
                      : details.lead.lastAction
                  }
                />
                <div className="space-y-2 border-b border-[var(--color-divider)] py-2">
                  <div className="text-xs text-[var(--color-text-faint)]">Notas</div>
                  <Textarea
                    value={leadNotes}
                    onChange={(event) => setLeadNotes(event.target.value)}
                    className="min-h-[96px] border-[var(--color-divider)] bg-[var(--color-surface)] text-sm"
                    placeholder="Agregar notas de seguimiento..."
                  />
                </div>
                <div className="flex items-start justify-between gap-3 py-2 text-xs">
                  <span className="text-[var(--color-text-faint)]">Etiquetas</span>
                  <div className="flex max-w-[65%] flex-wrap justify-end gap-1">
                    {details.lead.tags.length > 0 ? (
                      details.lead.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-[var(--color-border)] text-[var(--color-text-muted)]">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-right text-[var(--color-text)]">—</span>
                    )}
                  </div>
                </div>
                <div className="pb-1 pt-2">
                  <Button
                    onClick={() => void handleSaveLead()}
                    disabled={isSavingLead}
                    className="w-full bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]"
                  >
                    {isSavingLead ? "Guardando..." : "Guardar oportunidad"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-3 py-3">
                <p className="text-sm text-[var(--color-text-muted)]">Sin lead asociado a esta conversación.</p>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--color-text-faint)]">Nombre</label>
                  <Input value={createName} onChange={(event) => setCreateName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--color-text-faint)]">Email (opcional)</label>
                  <Input
                    type="email"
                    value={createEmail}
                    onChange={(event) => setCreateEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--color-text-faint)]">Teléfono (opcional)</label>
                  <Input value={createPhone} onChange={(event) => setCreatePhone(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--color-text-faint)]">Etapa</label>
                  <select
                    value={createStatus}
                    onChange={(event) =>
                      setCreateStatus(
                        event.target.value as
                          | "new"
                          | "contacted"
                          | "qualified"
                          | "consultation"
                          | "retained"
                          | "closed"
                      )
                    }
                    className="h-10 w-full rounded-md border border-[var(--color-divider)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus:outline-none"
                  >
                    {LEAD_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#777789]">Valor oportunidad ($)</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={createOpportunityValue}
                    onChange={(event) => setCreateOpportunityValue(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--color-text-faint)]">Notas</label>
                  <Textarea
                    value={createNotes}
                    onChange={(event) => setCreateNotes(event.target.value)}
                    className="min-h-[96px] border-[var(--color-divider)] bg-[var(--color-surface)] text-sm"
                  />
                </div>
                <Button
                  onClick={() => void handleCreateAndLinkLead()}
                  disabled={isCreatingLead}
                  className="w-full bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]"
                >
                  {isCreatingLead ? "Creando..." : "Crear oportunidad y vincular"}
                </Button>
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Historial y acciones
            </h4>
            <div className="space-y-2">
              {activity.length === 0 ? (
                <div className="rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-3 py-3 text-sm text-[var(--color-text-muted)]">
                  Sin actividad aún.
                </div>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface-2)] p-3">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1.5">
                        {item.type === "message" ? (
                          <>
                            <MessageSquare className="h-3.5 w-3.5" />
                            {item.sender === "contact"
                              ? "Contacto"
                              : item.sender === "human"
                                ? "Tú"
                                : "Agente"}{" "}
                            ({item.channel})
                          </>
                        ) : (
                          <>
                            <UserRound className="h-3.5 w-3.5" />
                            Acción de lead
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text)]">
                      {item.type === "message" ? item.contentPreview : item.action}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
