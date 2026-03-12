import { getOpenClawUrl, getWorkspaceSlug } from "@/lib/api";

function streamText(content: string) {
  const encoder = new TextEncoder();
  const chunks = content.split(/(\s+)/).filter(Boolean);

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`)
        );
        await new Promise((resolve) => setTimeout(resolve, 12));
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  const { message, history } = (await request.json()) as {
    message?: string;
    history?: Array<{ role: string; content: string }>;
  };

  if (!message?.trim()) {
    return Response.json({ error: "El mensaje es obligatorio" }, { status: 400 });
  }

  const openClawUrl = getOpenClawUrl();
  const workspaceSlug = getWorkspaceSlug();
  const candidateUrls = Array.from(
    new Set([openClawUrl, process.env.OPENCLAW_GATEWAY_URL, "http://localhost:3100"].filter(Boolean))
  );
  const historyText = Array.isArray(history)
    ? history
        .slice(-8)
        .map((item) => `${item.role}: ${item.content}`)
        .join("\n")
    : "";
  const telegramLikeContent = historyText
    ? `[TELEGRAM_ADMIN] Panel Web:\nConversación previa:\n${historyText}\n\nConsulta actual: ${message}`
    : `[TELEGRAM_ADMIN] Panel Web: ${message}`;

  for (const baseUrl of candidateUrls) {
    try {
      const streamingResponse = await fetch(`${baseUrl}/api/v1/workspace/${workspaceSlug}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message,
          history,
        }),
      });

      if (
        streamingResponse.ok &&
        streamingResponse.body &&
        (streamingResponse.headers.get("content-type") || "").includes("text/event-stream")
      ) {
        return new Response(streamingResponse.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }
    } catch {
      // Try next endpoint candidate.
    }
  }

  for (const baseUrl of candidateUrls) {
    try {
      const response = await fetch(`${baseUrl}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          channel: "telegram_admin",
          content: telegramLikeContent,
          metadata: {
            query_type: "admin_query",
            source: "web_dashboard_chat",
          },
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        content?: string;
        message?: string;
        response?: string;
      };
      const content = data.content || data.message || data.response || "No recibí una respuesta completa del agente.";

      return new Response(streamText(content), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } catch {
      // Try next endpoint candidate.
    }
  }

  return Response.json(
    {
      error: "No se pudo conectar con OpenClaw",
    },
    { status: 502 }
  );
}
