import { type Client, type TextChannel } from "discord.js";
import { prisma } from "@lynnbot/database";
import { refreshFandayPanelLive } from "../../../services/panels/fandayPanelHandler.js";

/**
 * 🛠️ Background worker for persistent Fanday jobs in PostgreSQL
 * Ensures zero data loss, idempotent retries, and clean job processing even after bot restarts.
 */
export async function processFandayJobs(client: Client) {
  try {
    const now = new Date();
    const pendingJobs = await prisma.fandayJob.findMany({
      where: {
        status: "PENDING",
        runAt: { lte: now },
      },
      take: 10,
    });

    for (const job of pendingJobs) {
      try {
        await prisma.fandayJob.update({
          where: { id: job.id },
          data: { status: "PROCESSING", attempts: { increment: 1 } },
        });

        if (job.type === "PANEL_REFRESH") {
          await refreshFandayPanelLive(client);
        } else if (job.type === "LOCK_EXPIRE") {
          // Check for expired unconfirmed partner locks
          const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
          await prisma.fandayPlayer.updateMany({
            where: {
              status: "REGISTERED",
              hasPartner: true,
              lockedWithId: { not: null },
              updatedAt: { lte: cutoff },
            },
            data: {
              hasPartner: false,
              lockedWithId: null,
            },
          });
        }

        await prisma.fandayJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED" },
        });
      } catch (jobErr: any) {
        console.error(`Error processing Fanday job ${job.id}:`, jobErr);
        await prisma.fandayJob.update({
          where: { id: job.id },
          data: {
            status: job.attempts >= 3 ? "FAILED" : "PENDING",
            lastError: jobErr.message,
          },
        });
      }
    }
  } catch (err) {
    console.error("Error in processFandayJobs worker:", err);
  }
}

/**
 * 📬 Background worker to deliver outbox messages (resilient against network or rate limit issues)
 */
export async function processFandayOutbox(client: Client) {
  try {
    const pendingOutbox = await prisma.fandayOutbox.findMany({
      where: { status: "PENDING" },
      take: 5,
    });

    for (const item of pendingOutbox) {
      try {
        if (item.channelId) {
          const channel = client.channels.cache.get(item.channelId) as TextChannel | undefined;
          if (channel) {
            await channel.send({
              content: item.content || undefined,
              embeds: item.embedData ? [item.embedData as any] : undefined,
            });
          }
        } else if (item.targetDiscordId) {
          const user = await client.users.fetch(item.targetDiscordId).catch(() => null);
          if (user) {
            await user.send({
              content: item.content || undefined,
              embeds: item.embedData ? [item.embedData as any] : undefined,
            });
          }
        }

        await prisma.fandayOutbox.update({
          where: { id: item.id },
          data: { status: "SENT" },
        });
      } catch (sendErr: any) {
        await prisma.fandayOutbox.update({
          where: { id: item.id },
          data: {
            status: item.attempts >= 3 ? "FAILED" : "PENDING",
            attempts: { increment: 1 },
            lastError: sendErr.message,
          },
        });
      }
    }
  } catch (err) {
    console.error("Error in processFandayOutbox worker:", err);
  }
}

