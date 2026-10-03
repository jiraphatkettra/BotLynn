import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type SlashCommandBuilder,
} from "discord.js";
import http from "node:http";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from multiple possible locations
config();
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../.env") });
config({ path: resolve(process.cwd(), "../../.env") });

import { prisma } from "@lynnbot/database";

// Import commands
import { clockinCommand } from "./commands/clockin.js";
import { clockoutCommand } from "./commands/clockout.js";
import { shopCommand } from "./commands/shop.js";
import { buyCommand } from "./commands/buy.js";
import { attendanceCommand } from "./commands/attendance.js";
import { adminCommand } from "./commands/admin.js";
import { helpCommand } from "./commands/help.js";
import { ticketSetupCommand, ticketClaimCommand } from "./commands/ticket.js";
import { backupCommand, restoreCommand } from "./commands/backup.js";
import {
  balanceCommand,
  topupCommand,
  giveBalanceCommand,
} from "./commands/wallet.js";
import { leaveCommand } from "./commands/leave.js";
import { panelCommand } from "./commands/panel.js";
import { dynamicVoiceCommand } from "./commands/dynamicVoice.js";
import { scheduleCommand } from "./commands/schedule.js";
import { leaderboardCommand } from "./commands/leaderboard.js";
import { giveawayCommand } from "./commands/giveaway.js";
import { pollCommand } from "./commands/poll.js";
import { warnCommand, warningsCommand, unwarnCommand } from "./commands/warn.js";
import { reactionRoleCommand } from "./commands/reactionRole.js";
import { scheduleMsgCommand } from "./commands/scheduleMsg.js";
import { taskCommand } from "./commands/task.js";

// Import events & services
import { handleReady } from "./events/ready.js";
import { handleInteraction } from "./events/interactionCreate.js";
import { handleVoiceStateUpdate } from "./events/voiceStateUpdate.js";
import { handleGuildMemberAdd } from "./events/guildMemberAdd.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleMessageReactionAdd } from "./events/messageReactionAdd.js";
import { handleMessageReactionRemove } from "./events/messageReactionRemove.js";
import { checkAutoClockOut } from "./services/attendanceService.js";
import { checkExpiredGiveaways, checkScheduledMessages } from "./services/cronService.js";

export interface BotCommand {
  data: SlashCommandBuilder | any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

// Create client with required partials for reaction roles
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Register commands
const commands = new Collection<string, BotCommand>();
const commandList: BotCommand[] = [
  clockinCommand,
  clockoutCommand,
  shopCommand,
  buyCommand,
  attendanceCommand,
  adminCommand,
  helpCommand,
  ticketSetupCommand,
  ticketClaimCommand,
  backupCommand,
  restoreCommand,
  balanceCommand,
  topupCommand,
  giveBalanceCommand,
  leaveCommand,
  panelCommand,
  dynamicVoiceCommand,
  scheduleCommand,
  leaderboardCommand,
  giveawayCommand,
  pollCommand,
  warnCommand,
  warningsCommand,
  unwarnCommand,
  reactionRoleCommand,
  scheduleMsgCommand,
  taskCommand,
];

for (const command of commandList) {
  commands.set(command.data.name, command);
}

// Attach commands to client for access in event handlers
(client as any).commands = commands;

// Register events
client.once(Events.ClientReady, (readyClient) => {
  handleReady(readyClient, prisma);
  // Initial check for expired shifts & schedule periodic check every 15m
  setTimeout(() => checkAutoClockOut(client), 5000);
  setInterval(() => checkAutoClockOut(client), 15 * 60 * 1000);

  // Background Giveaway check every 30s
  setInterval(() => checkExpiredGiveaways(client), 30 * 1000);

  // Background Scheduled Announcement check every 60s
  setInterval(() => checkScheduledMessages(client), 60 * 1000);
});

client.on(Events.InteractionCreate, (interaction) =>
  handleInteraction(interaction, commands)
);
client.on(Events.VoiceStateUpdate, (oldState, newState) =>
  handleVoiceStateUpdate(oldState, newState)
);
client.on(Events.GuildMemberAdd, (member) =>
  handleGuildMemberAdd(member)
);
client.on(Events.MessageCreate, (message) =>
  handleMessageCreate(message)
);
client.on(Events.MessageReactionAdd, (reaction, user) =>
  handleMessageReactionAdd(reaction as any, user as any)
);
client.on(Events.MessageReactionRemove, (reaction, user) =>
  handleMessageReactionRemove(reaction as any, user as any)
);

// Graceful shutdown
async function shutdown(reason: string) {
  console.log(`\n🛑 Shutting down bot: ${reason}`);

  try {
    // Report to API
    const apiUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await fetch(`${apiUrl}/api/bot/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", reason }),
    });
  } catch (e) {
    // API might not be available
  }

  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("⚠️ Uncaught Exception:", error);
});

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN not found in .env");
  process.exit(1);
}

// Minimal HTTP health check server (required for Render Free Tier Web Service & uptime monitors)
const PORT = process.env.PORT || 3001;
const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      bot: client.user?.tag || "starting",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});

healthServer.listen(PORT, () => {
  console.log(`📡 Health check server listening on port ${PORT}`);
});

console.log("🤖 Starting LynnBot...");
client.login(token);
