"use client";

import { useCallback, useEffect, useState } from "react";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: "manychat" | "telegram" | "manual" | "web";
  status: "new" | "contacted" | "qualified" | "consultation" | "retained" | "closed";
  caseType?: string;
  lastAction: string;
  lastActionAt: string;
  notes?: string;
  assignedTo?: string;
  tags: string[];
  manychatSubscriberId?: string;
  telegramChatId?: string;
  supermemoryId?: string;
}

export function useContacts() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/crm/leads", { cache: "no-store" });
      const data = (await response.json()) as { leads: Lead[] };
      setLeads(data.leads || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    leads,
    isLoading,
    refresh,
    setLeads,
  };
}
