"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ConversationList,
  type ConversationThread,
  type StatusFilter,
} from "@/components/inbox/conversation-list";
import {
  ConversationView,
  type ConversationDetail,
} from "@/components/inbox/conversation-view";

type ReplyMode = "manual" | "auto";

type PendingDraft = {
  id: string;
  agent_draft: string;
  conversation_id: string;
};

export default function InboxPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>("manual");
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<string | null>(null);

  // Load reply mode setting
  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings?key=reply_mode", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { value?: string };
          if (data.value === "auto" || data.value === "manual") {
            setReplyMode(data.value);
          }
        }
      } catch {
        // Ignore — default to manual
      }
    })();
  }, []);

  const handleToggleMode = async () => {
    const newMode = replyMode === "auto" ? "manual" : "auto";
    setIsTogglingMode(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "reply_mode", value: newMode }),
      });
      if (response.ok) {
        setReplyMode(newMode);
      }
    } finally {
      setIsTogglingMode(false);
    }
  };

  const loadConversations = useCallback(async () => {
    const response = await fetch(`/api/inbox/conversations?status=${statusFilter}`, { cache: "no-store" });
    const data = (await response.json()) as { conversations: ConversationThread[] };
    setConversations(data.conversations || []);
    setSelectedConversationId((current) => current || data.conversations?.[0]?.id || null);
  }, [statusFilter]);

  const loadConversation = useCallback(async (conversationId: string) => {
    const response = await fetch(`/api/inbox/conversations/${conversationId}`, { cache: "no-store" });
    const data = (await response.json()) as { conversation: ConversationDetail };
    setSelectedConversation(data.conversation);
  }, []);

  // Load pending draft for selected conversation
  const loadPendingDraft = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as {
          conversation: ConversationDetail;
          pending_draft?: PendingDraft;
        };
        setPendingDraft(data.pending_draft?.agent_draft || null);
      }
    } catch {
      setPendingDraft(null);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      setPendingDraft(null);
      return;
    }

    void loadConversation(selectedConversationId);
    void loadPendingDraft(selectedConversationId);
  }, [loadConversation, loadPendingDraft, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      return (
        conversation.contactName.toLowerCase().includes(query) ||
        conversation.lastMessage.toLowerCase().includes(query) ||
        conversation.contactPhone?.toLowerCase().includes(query)
      );
    });
  }, [conversations, search]);

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="flex flex-1 min-h-0">
        <ConversationList
          search={search}
          onSearchChange={setSearch}
          conversations={filteredConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          statusFilter={statusFilter}
          onStatusFilterChange={(filter) => {
            setStatusFilter(filter);
            setSelectedConversationId(null);
          }}
          replyMode={replyMode}
          isTogglingMode={isTogglingMode}
          onToggleMode={() => void handleToggleMode()}
        />
        <ConversationView
          conversation={selectedConversation}
          pendingDraft={pendingDraft}
          onReplySent={() => {
            if (selectedConversationId) {
              void loadConversation(selectedConversationId);
            }
            setPendingDraft(null);
            void loadConversations();
          }}
          onStatusChanged={() => {
            setSelectedConversationId(null);
            setSelectedConversation(null);
            void loadConversations();
          }}
        />
      </div>
    </div>
  );
}
