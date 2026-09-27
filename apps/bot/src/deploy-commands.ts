import { REST, Routes } from "discord.js";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from multiple possible locations
config();
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

import { clockinCommand } from "./commands/clockin.js";
import { clockoutCommand } from "./commands/clockout.js";
import { shopCommand } from "./commands/shop.js";
import { buyCommand } from "./commands/buy.js";
import { attendanceCommand } from "./commands/attendance.js";
import { adminCommand } from "./commands/admin.js";
import { helpCommand } from "./commands/help.js";
import { ticketSetupCommand } from "./commands/ticket.js";
import { backupCommand, restoreCommand } from "./commands/backup.js";
import {
  balanceCommand,
  topupCommand,
  giveBalanceCommand,
} from "./commands/wallet.js";
import { leaveCommand } from "./commands/leave.js";

const commands = [
  clockinCommand.data.toJSON(),
  clockoutCommand.data.toJSON(),
  shopCommand.data.toJSON(),
  buyCommand.data.toJSON(),
  attendanceCommand.data.toJSON(),
  adminCommand.data.toJSON(),
  helpCommand.data.toJSON(),
  ticketSetupCommand.data.toJSON(),
  backupCommand.data.toJSON(),
  restoreCommand.data.toJSON(),
  balanceCommand.data.toJSON(),
  topupCommand.data.toJSON(),
  giveBalanceCommand.data.toJSON(),
  leaveCommand.data.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_TOKEN!
);

async function deployCommands() {
  try {
    console.log(
      `🔄 Registering ${commands.length} slash commands...`
    );

    const clientId = process.env.DISCORD_CLIENT_ID!;
    const guildId = process.env.DISCORD_GUILD_ID;

    // First, register globally
    console.log("🌐 Registering global commands...");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    console.log(`✅ Successfully registered global commands!`);

    // If specific guild is provided, register there too (for instant reflection)
    if (guildId) {
      try {
        console.log(`📍 Registering guild commands for ${guildId}...`);
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands }
        );
        console.log(`✅ Successfully registered guild commands for ${guildId}!`);
      } catch (err: any) {
        console.warn(`⚠️ Could not register to guild ${guildId}: ${err?.message || err}`);
      }
    }
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
    process.exit(1);
  }
}

deployCommands();
