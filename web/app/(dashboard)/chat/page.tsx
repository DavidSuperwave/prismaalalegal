"use client";

import { useEffect, useRef } from "react";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatWelcome } from "@/components/chat/chat-welcome";
import { SessionSidebar } from "@/components/chat/session-sidebar";
import { useStreamingChat } from "@/lib/hooks/use-streaming-chat";

export default function ChatPage() {
  const {
    activeSessionId,
    sessions,
    messages,
    isStreaming,
    openSession,
    createSession,
    deleteSession,
    sendMessage,
  } = useStreamingChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex h-full min-h-screen">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionClick={openSession}
        onNewChat={createSession}
        onDeleteSession={deleteSession}
      />

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-stone-200 bg-white px-6 py-4">
          <h1 className="text-xl font-semibold text-stone-900">Agent Chat</h1>
          <p className="mt-1 text-sm text-stone-500">
            Stream answers from OpenClaw and keep lightweight session history on the client.
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <ChatWelcome onSuggestionClick={sendMessage} />
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col gap-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <ChatInput onSend={sendMessage} isProcessing={isStreaming} />
        </div>
      </section>
    </div>
  );
}
