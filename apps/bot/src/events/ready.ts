import { type Client } from "discord.js";
import { type PrismaClient } from "@lynnbot/database";

export async function handleReady(client: Client<true>, prisma: PrismaClient) {
  console.log(`✅ LynnBot is online as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);

  // Calculate total users
  let totalUsers = 0;
  client.guilds.cache.forEach((guild) => {
    totalUsers += guild.memberCount;
  });

  // Report to API
  try {
    const apiUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await fetch(`${apiUrl}/api/bot/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        guilds: client.guilds.cache.size,
        users: totalUsers,
        ping: client.ws.ping,
      }),
    });
    console.log("📡 Reported online status to dashboard");
  } catch (error) {
    console.warn("⚠️ Could not report to dashboard (API may not be running)");
  }

  // Set bot activity
  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "Admin Dashboard | /help",
        type: 3, // Watching
      },
    ],
  });

  // Initial Voice Session Audit & Discord Reconciliation
  setTimeout(() => syncVoiceSessions(client, prisma), 3000);

  // Start heartbeat interval (every 5 minutes)
  setInterval(async () => {
    try {
      syncVoiceSessions(client, prisma);

      let users = 0;
      client.guilds.cache.forEach((guild) => {
        users += guild.memberCount;
      });

      const apiUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      await fetch(`${apiUrl}/api/bot/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          guilds: client.guilds.cache.size,
          users,
          ping: client.ws.ping,
        }),
      });
    } catch {
      // Silently fail heartbeat
    }
  }, 5 * 60 * 1000);
}

async function syncVoiceSessions(client: Client<true>, prisma: PrismaClient) {
  try {
    const activeSessions = await prisma.voiceSession.findMany({
      where: { leftAt: null },
      include: { user: true },
    });

    const now = new Date();
    for (const session of activeSessions) {
      const guild = client.guilds.cache.get(session.guildId);
      if (!guild) {
        await prisma.voiceSession.update({
          where: { id: session.id },
          data: {
            leftAt: now,
            duration: Math.max(1, Math.floor((now.getTime() - session.joinedAt.getTime()) / 1000)),
          },
        });
        continue;
      }

      const member =
        guild.members.cache.get(session.user.discordId) ||
        (await guild.members.fetch(session.user.discordId).catch(() => null));

      // If member is not in Discord voice or not in this channel anymore
      if (!member || !member.voice?.channelId || member.voice.channelId !== session.channelId) {
        const duration = Math.max(1, Math.floor((now.getTime() - session.joinedAt.getTime()) / 1000));
        await prisma.voiceSession.update({
          where: { id: session.id },
          data: {
            leftAt: now,
            duration,
          },
        });
        console.log(`🎙️ [Voice Sync] Closed stale session for ${session.user.username}`);
      }
    }
  } catch (err) {
    console.error("❌ Voice session sync error:", err);
  }
}
