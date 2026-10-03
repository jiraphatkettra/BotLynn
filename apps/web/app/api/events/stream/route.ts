import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let lastCheckedTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  const customReadable = new ReadableStream({
    async start(controller) {
      // Send initial connect handshake
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date() })}\n\n`)
      );

      // Periodically check for new audit logs & send keepalive heartbeat
      intervalId = setInterval(async () => {
        try {
          const newLogs = await prisma.auditLog.findMany({
            where: {
              createdAt: { gt: lastCheckedTime },
            },
            orderBy: { createdAt: "asc" },
            take: 10,
          });

          if (newLogs.length > 0) {
            lastCheckedTime = newLogs[newLogs.length - 1].createdAt;
            for (const log of newLogs) {
              controller.enqueue(
                encoder.encode(`event: log\ndata: ${JSON.stringify(log)}\n\n`)
              );
            }
          } else {
            // Heartbeat
            controller.enqueue(
              encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`)
            );
          }
        } catch (err) {
          // If stream closed, clear interval
          if (intervalId) clearInterval(intervalId);
        }
      }, 5000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
