import { NextRequest } from "next/server";
import { subscribe } from "@/lib/sse";

// GET /api/sessions/[id]/events — SSE stream for realtime updates
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial ping
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Subscribe to session events
      const unsubscribe = subscribe(id, (data) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
          unsubscribe();
        }
      });

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30000);

      // Cleanup when client disconnects
      _req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
