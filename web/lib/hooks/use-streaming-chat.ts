"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { generateId } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  sessionType: "chat";
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const SESSIONS_KEY = "superwave_chat_sessions";
const ACTIVE_SESSION_KEY = "superwave_chat_active_session";

function getMessagesKey(sessionId: string) {
  return `superwave_chat_messages_${sessionId}`;
}

function loadJson<T>(key: string, fallback: T) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useStreamingChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const storedSessions = loadJson<ChatSession[]>(SESSIONS_KEY, []);
    const storedActiveSessionId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
    const fallbackSessionId = storedSessions[0]?.id || null;
    const resolvedSessionId = storedActiveSessionId || fallbackSessionId;

    setSessions(storedSessions);
    setActiveSessionId(resolvedSessionId);

    if (resolvedSessionId) {
      setMessages(loadJson<ChatMessage[]>(getMessagesKey(resolvedSessionId), []));
    }
  }, []);

  const persistSessions = useCallback((nextSessions: ChatSession[]) => {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(nextSessions));
    setSessions(nextSessions);
  }, []);

  const persistMessages = useCallback((sessionId: string, nextMessages: ChatMessage[]) => {
    window.localStorage.setItem(getMessagesKey(sessionId), JSON.stringify(nextMessages));
    setMessages(nextMessages);
  }, []);

  const createSession = useCallback(() => {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: generateId(),
      title: "Nuevo chat",
      sessionType: "chat",
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const nextSessions = [session, ...sessions];
    persistSessions(nextSessions);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, session.id);
    window.localStorage.setItem(getMessagesKey(session.id), JSON.stringify([]));
    setActiveSessionId(session.id);
    setMessages([]);
    return session.id;
  }, [persistSessions, sessions]);

  const openSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      window.localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      setMessages(loadJson<ChatMessage[]>(getMessagesKey(sessionId), []));
    },
    []
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      const nextSessions = sessions.filter((session) => session.id !== sessionId);
      persistSessions(nextSessions);
      window.localStorage.removeItem(getMessagesKey(sessionId));

      if (activeSessionId === sessionId) {
        const nextActiveSessionId = nextSessions[0]?.id || null;
        setActiveSessionId(nextActiveSessionId);
        if (nextActiveSessionId) {
          window.localStorage.setItem(ACTIVE_SESSION_KEY, nextActiveSessionId);
          setMessages(loadJson<ChatMessage[]>(getMessagesKey(nextActiveSessionId), []));
        } else {
          window.localStorage.removeItem(ACTIVE_SESSION_KEY);
          setMessages([]);
        }
      }
    },
    [activeSessionId, persistSessions, sessions]
  );

  const syncSessionMeta = useCallback(
    (sessionId: string, nextMessages: ChatMessage[]) => {
      const firstUserMessage = nextMessages.find((message) => message.role === "user");
      const currentSessions = loadJson<ChatSession[]>(SESSIONS_KEY, []);
      const nextSessions = currentSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              title: firstUserMessage?.content.slice(0, 36) || session.title,
              messageCount: nextMessages.length,
              updatedAt: new Date().toISOString(),
            }
          : session
      );

      nextSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      persistSessions(nextSessions);
    },
    [persistSessions]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = createSession();
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      const optimisticMessages = [...messages, userMessage, assistantMessage];
      persistMessages(sessionId, optimisticMessages);
      syncSessionMeta(sessionId, optimisticMessages);
      setIsStreaming(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId,
            history: messages.slice(-12),
          }),
        });

        if (!response.ok) {
          throw new Error("Chat request failed");
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream") && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let finalText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";

            for (const event of events) {
              const payloadLine = event
                .split("\n")
                .find((line) => line.startsWith("data: "));

              if (!payloadLine) continue;
              const payload = JSON.parse(payloadLine.slice(6)) as { type: string; content?: string };

              if (payload.type === "delta" && payload.content) {
                finalText += payload.content;
                const nextMessages = optimisticMessages.map((message) =>
                  message.id === assistantMessage.id
                    ? { ...message, content: finalText, isStreaming: true }
                    : message
                );
                persistMessages(sessionId, nextMessages);
              }
            }
          }

          const completedMessages = optimisticMessages.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: finalText || "No se recibió respuesta.", isStreaming: false }
              : message
          );
          persistMessages(sessionId, completedMessages);
          syncSessionMeta(sessionId, completedMessages);
        } else {
          const data = (await response.json()) as { content: string };
          const completedMessages = optimisticMessages.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: data.content, isStreaming: false }
              : message
          );
          persistMessages(sessionId, completedMessages);
          syncSessionMeta(sessionId, completedMessages);
        }
      } catch {
        const failedMessages = optimisticMessages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: "No pude conectar con OpenClaw. Inténtalo de nuevo.",
                isStreaming: false,
              }
            : message
        );
        persistMessages(sessionId, failedMessages);
        syncSessionMeta(sessionId, failedMessages);
      } finally {
        setIsStreaming(false);
      }
    },
    [activeSessionId, createSession, isStreaming, messages, persistMessages, syncSessionMeta]
  );

  return useMemo(
    () => ({
      activeSessionId,
      sessions,
      messages,
      isStreaming,
      openSession,
      createSession,
      deleteSession,
      sendMessage,
    }),
    [activeSessionId, createSession, deleteSession, isStreaming, messages, openSession, sendMessage, sessions]
  );
}
