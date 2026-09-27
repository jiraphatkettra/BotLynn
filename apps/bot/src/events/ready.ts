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

  // Start heartbeat interval (every 5 minutes)
  setInterval(async () => {
    try {
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
