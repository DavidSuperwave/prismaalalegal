"use client";

import { InboxChat } from "@/components/inbox/inbox-chat";
import { Badge } from "@/components/ui/badge";

export interface ConversationMessage {
  id: string;
  sender: "contact" | "agent" | "human";
  content: string;
  channel: "manychat" | "telegram" | "web";
  timestamp: string;
}

export interface ConversationDetail {
  id: string;
  contactName: string;
  contactPhone?: string;
  source: "manychat" | "telegram";
  sentiment?: "positive" | "neutral" | "negative";
  messages: ConversationMessage[];
}

export function ConversationView({
  conversation,
}: {
  conversation: ConversationDetail | null;
}) {
  if (!conversation) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[#08080A]">
        <div className="max-w-md text-center">
          <h3 className="text-lg font-semibold text-[#E8E8ED]">Select a conversation</h3>
          <p className="mt-2 text-sm text-[#8888A0]">
            Choose a thread from the left to review the full history and ask the agent for help.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#0E0E12]">
      <div className="border-b border-[#2A2A32] px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[#E8E8ED]">{conversation.contactName}</h1>
          <Badge variant="outline">{conversation.source}</Badge>
        </div>
        <p className="mt-1 text-sm text-[#8888A0]">{conversation.contactPhone || "No phone number available"}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {conversation.messages.map((message) => (
          <div key={message.id} className={message.sender === "contact" ? "text-left" : "text-right"}>
            <div
              className={
                message.sender === "contact"
                  ? "inline-block max-w-2xl rounded-2xl border border-[#2A2A32] bg-[#141418] px-4 py-3 text-left"
                  : "inline-block max-w-2xl rounded-2xl bg-[#818CF8] px-4 py-3 text-left text-[#08080A]"
              }
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                <span className="font-medium">{message.sender}</span>
                <span>{new Date(message.timestamp).toLocaleString()}</span>
                <span className="uppercase">{message.channel}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      <InboxChat conversationId={conversation.id} />
    </section>
  );
}
