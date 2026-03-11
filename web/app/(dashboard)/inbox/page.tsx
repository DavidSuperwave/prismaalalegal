"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ConversationList,
  type ConversationThread,
} from "@/components/inbox/conversation-list";
import {
  ConversationView,
  type ConversationDetail,
} from "@/components/inbox/conversation-view";

export default function InboxPage() {
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);

  useEffect(() => {
    const loadConversations = async () => {
      const response = await fetch("/api/inbox/conversations", { cache: "no-store" });
      const data = (await response.json()) as { conversations: ConversationThread[] };
      setConversations(data.conversations || []);
      setSelectedConversationId((current) => current || data.conversations?.[0]?.id || null);
    };

    void loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      return;
    }

    const loadConversation = async () => {
      const response = await fetch(`/api/inbox/conversations/${selectedConversationId}`, { cache: "no-store" });
      const data = (await response.json()) as { conversation: ConversationDetail };
      setSelectedConversation(data.conversation);
    };

    void loadConversation();
  }, [selectedConversationId]);

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
      />
      <ConversationView conversation={selectedConversation} />
    </div>
  );
}
