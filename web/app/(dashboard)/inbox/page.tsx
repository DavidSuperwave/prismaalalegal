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

export default function InboxPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);

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

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      return;
    }

    void loadConversation(selectedConversationId);
  }, [loadConversation, selectedConversationId]);

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
    <div className="flex h-full min-h-screen">
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
      />
      <ConversationView
        conversation={selectedConversation}
        onReplySent={() => {
          if (selectedConversationId) {
            void loadConversation(selectedConversationId);
          }
          void loadConversations();
        }}
        onStatusChanged={() => {
          setSelectedConversationId(null);
          setSelectedConversation(null);
          void loadConversations();
        }}
      />
    </div>
  );
}
