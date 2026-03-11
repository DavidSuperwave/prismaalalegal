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
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const openClawUrl = getOpenClawUrl();
  const workspaceSlug = getWorkspaceSlug();

  try {
    const streamingResponse = await fetch(
      `${openClawUrl}/api/v1/workspace/${workspaceSlug}/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message,
          history,
        }),
      }
    );

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
    // Fall back to the bridge-compatible endpoint below.
  }

  try {
    const historyText = Array.isArray(history)
      ? history
          .slice(-8)
          .map((item) => `${item.role}: ${item.content}`)
          .join("\n")
      : "";

    const response = await fetch(`${openClawUrl}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "user",
        channel: "web",
        content: historyText
          ? `Previous conversation:\n${historyText}\n\nCurrent user message: ${message}`
          : message,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenClaw request failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      content?: string;
      message?: string;
      response?: string;
    };
    const content =
      data.content ||
      data.message ||
      data.response ||
      "OpenClaw returned an empty response.";

    return new Response(streamText(content), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return Response.json(
      {
        error: "Unable to reach OpenClaw",
      },
      { status: 502 }
    );
  }
}
