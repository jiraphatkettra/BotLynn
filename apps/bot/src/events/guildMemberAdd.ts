import { type GuildMember } from "discord.js";
import { handleWelcomeMember } from "../services/welcomeService.js";

/**
 * Handle new member joining the guild:
 * Automatically executes Welcome Embed, Auto-Role, and Optional DM
 */
export async function handleGuildMemberAdd(member: GuildMember) {
  // Ignore bot joins to prevent welcoming bots
  if (member.user.bot) return;

  try {
    await handleWelcomeMember(member);
  } catch (error) {
    console.error("❌ Error in handleGuildMemberAdd:", error);
  }
}
