import { chatWithAgent } from "@/lib/openclaw-client";

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
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const historyText = Array.isArray(history)
    ? history
        .slice(-8)
        .map((item) => `${item.role}: ${item.content}`)
        .join("\n")
    : "";

  const prompt = historyText
    ? `Previous conversation:\n${historyText}\n\nCurrent user message: ${message}`
    : message;

  const result = await chatWithAgent("operator", prompt);

  if (!result.success || !result.data) {
    return Response.json(
      { error: "Unable to reach OpenClaw" },
      { status: 502 }
    );
  }

  const content = result.data.content || "OpenClaw returned an empty response.";

  return new Response(streamText(content), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
