import { type GuildMember } from "discord.js";
import { prisma } from "@lynnbot/database";

/**
 * Ensures user exists in database and returns the record
 */
export async function ensureUser(
  discordUser: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string | null;
    displayAvatarURL?: () => string;
  },
  defaultRole: "MEMBER" | "ADMIN" = "MEMBER"
) {
  const avatarUrl =
    typeof discordUser.displayAvatarURL === "function"
      ? discordUser.displayAvatarURL()
      : discordUser.avatar || null;

  return await prisma.user.upsert({
    where: { discordId: discordUser.id },
    update: {
      username: discordUser.username,
      displayName: discordUser.displayName || discordUser.username,
      avatar: avatarUrl,
    },
    create: {
      discordId: discordUser.id,
      username: discordUser.username,
      displayName: discordUser.displayName || discordUser.username,
      avatar: avatarUrl,
      role: defaultRole,
    },
  });
}

/**
 * Helper: Find or assign/remove On Duty role
 */
export async function toggleOnDutyRole(member: GuildMember | null, assign: boolean) {
  if (!member || !member.guild) return;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "on_duty_role_id" } });
    let roleId = setting?.value;

    if (!roleId) {
      const found = member.guild.roles.cache.find(
        (r) =>
          r.name.toLowerCase().includes("on duty") ||
          r.name.toLowerCase().includes("onduty") ||
          r.name.includes("เข้าเวร")
      );
      if (found) roleId = found.id;
    }

    if (roleId && member.guild.roles.cache.has(roleId)) {
      if (assign && !member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
      } else if (!assign && member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      }
    }
  } catch (err) {
    console.warn("⚠️ Could not toggle On Duty role:", err);
  }
}
