"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { Lead } from "@/lib/hooks/use-contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STATUSES: Lead["status"][] = ["new", "contacted", "qualified", "consultation", "retained", "closed"];
const CASE_TYPES = ["immigration", "criminal", "family", "civil", "other"];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0E0E12] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#2A2A32] p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#E8E8ED]">
              {isCreateMode ? "Add Lead" : formState.name || "Lead Detail"}
            </h2>
            <p className="mt-1 text-sm text-[#8888A0]">
              Review notes, case type, tags, and stage progression.
            </p>
          </div>
          <button onClick={onClose} className="text-[#55556A] transition hover:text-[#E8E8ED]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Name</label>
            <Input value={formState.name} onChange={(event) => setFormState({ ...formState, name: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Email</label>
            <Input value={formState.email} onChange={(event) => setFormState({ ...formState, email: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Phone</label>
            <Input value={formState.phone} onChange={(event) => setFormState({ ...formState, phone: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Assigned To</label>
            <Input value={formState.assignedTo} onChange={(event) => setFormState({ ...formState, assignedTo: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Status</label>
            <select
              value={formState.status}
              onChange={(event) => setFormState({ ...formState, status: event.target.value as Lead["status"] })}
              className="flex h-10 w-full rounded-md border border-[#333340] bg-[#08080A] px-3 py-2 text-sm text-[#E8E8ED]"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Case Type</label>
            <select
              value={formState.caseType}
              onChange={(event) => setFormState({ ...formState, caseType: event.target.value })}
              className="flex h-10 w-full rounded-md border border-[#333340] bg-[#08080A] px-3 py-2 text-sm text-[#E8E8ED]"
            >
              <option value="">Select case type</option>
              {CASE_TYPES.map((caseType) => (
                <option key={caseType} value={caseType}>
                  {caseType}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Last Action</label>
            <Input
              value={formState.lastAction}
              onChange={(event) => setFormState({ ...formState, lastAction: event.target.value })}
              placeholder="Called client, sent follow-up, scheduled consultation..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Tags</label>
            <Input
              value={formState.tags}
              onChange={(event) => setFormState({ ...formState, tags: event.target.value })}
              placeholder="manychat, warm, spanish"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-[#E8E8ED]">Notes</label>
            <Textarea
              value={formState.notes}
              onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
              placeholder="Intake summary, next steps, court date, budget notes..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#2A2A32] p-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formState.name.trim()}>
            {isSubmitting ? "Saving..." : isCreateMode ? "Create Lead" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
