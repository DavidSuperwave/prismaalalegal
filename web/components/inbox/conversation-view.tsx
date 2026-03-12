"use client";

import { useState } from "react";
import { InboxChat } from "@/components/inbox/inbox-chat";
import { HumanReplyComposer } from "@/components/inbox/human-reply-composer";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  onRefresh,
}: {
  conversation: ConversationDetail | null;
  onRefresh?: () => void;
}) {
  const [activeTab, setActiveTab] = useState("reply");

  if (!conversation) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[#08080A]">
        <div className="max-w-md text-center">
          <h3 className="text-lg font-semibold text-[#E8E8ED]">Selecciona una conversación</h3>
          <p className="mt-2 text-sm text-[#8888A0]">
            Elige un hilo de la izquierda para revisar el historial y responder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#0E0E12]">
      {/* Header */}
      <div className="border-b border-[#2A2A32] px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[#E8E8ED]">{conversation.contactName}</h1>
          <Badge variant="outline">{conversation.source}</Badge>
          {conversation.sentiment && (
            <Badge 
              variant="outline" 
              className={
                conversation.sentiment === "positive" ? "border-emerald-500/50 text-emerald-400" :
                conversation.sentiment === "negative" ? "border-red-500/50 text-red-400" :
                "border-[#2A2A32] text-[#8888A0]"
              }
            >
              {conversation.sentiment}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-[#8888A0]">
          {conversation.contactPhone || "Sin número de teléfono"}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {conversation.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[#55556A]">No hay mensajes en esta conversación</p>
          </div>
        ) : (
          conversation.messages.map((message) => (
            <div key={message.id} className={message.sender === "contact" ? "text-left" : "text-right"}>
              <div
                className={
                  message.sender === "contact"
                    ? "inline-block max-w-2xl rounded-2xl border border-[#2A2A32] bg-[#141418] px-4 py-3 text-left"
                    : message.sender === "human"
                    ? "inline-block max-w-2xl rounded-2xl bg-emerald-500 px-4 py-3 text-left text-white"
                    : "inline-block max-w-2xl rounded-2xl bg-[#818CF8] px-4 py-3 text-left text-[#08080A]"
                }
              >
                <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                  <span className="font-medium">
                    {message.sender === "contact" ? conversation.contactName : 
                     message.sender === "human" ? "Tú" : "Agente"}
                  </span>
                  <span>{new Date(message.timestamp).toLocaleString()}</span>
                  <span className="uppercase">{message.channel}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Section with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="border-t border-[#2A2A32]">
        <TabsList className="grid w-full grid-cols-2 bg-[#141418]">
          <TabsTrigger value="reply" className="data-[state=active]:bg-[#0E0E12]">
            ✍️ Responder
          </TabsTrigger>
          <TabsTrigger value="copilot" className="data-[state=active]:bg-[#0E0E12]">
            🤖 Copilot
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="reply" className="mt-0">
          <HumanReplyComposer
            conversationId={conversation.id}
            contactName={conversation.contactName}
            onReplySent={onRefresh}
          />
        </TabsContent>
        
        <TabsContent value="copilot" className="mt-0">
          <InboxChat conversationId={conversation.id} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
