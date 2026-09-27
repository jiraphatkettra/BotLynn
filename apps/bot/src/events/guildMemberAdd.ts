import { type GuildMember, EmbedBuilder, Events } from "discord.js";
import { prisma } from "@lynnbot/database";

export async function handleGuildMemberAdd(member: GuildMember) {
  if (member.user.bot) return;

  try {
    // Upsert member into database
    await prisma.user.upsert({
      where: { discordId: member.id },
      update: {
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        avatar: member.user.displayAvatarURL(),
      },
      create: {
        discordId: member.id,
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        avatar: member.user.displayAvatarURL(),
        role: "ADMIN", // default role enum
      },
    });

    // Fetch settings from DB
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "welcome_enabled",
            "welcome_channel_id",
            "welcome_message",
            "autorole_enabled",
            "autorole_id",
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // 1. Auto-Role assignment
    if (
      settingsMap.autorole_enabled === "true" &&
      settingsMap.autorole_id
    ) {
      try {
        const role = member.guild.roles.cache.get(settingsMap.autorole_id);
        if (role) {
          await member.roles.add(role, "แจกยศสมาชิกเริ่มต้นอัตโนมัติ (LynnBot Auto-Role)");
          console.log(`🏷️ [Auto-Role] Added ${role.name} to ${member.user.username}`);
        }
      } catch (err) {
        console.warn(`⚠️ [Auto-Role] Could not add role to ${member.user.username}:`, err);
      }
    }

    // 2. Welcome Card embed
    if (
      settingsMap.welcome_enabled !== "false" &&
      settingsMap.welcome_channel_id
    ) {
      const channel = member.guild.channels.cache.get(
        settingsMap.welcome_channel_id
      ) as any;

      if (channel && channel.isTextBased()) {
        const rawMessage =
          settingsMap.welcome_message ||
          "ยินดีต้อนรับสู่ **{server}**! ขอให้มีความสุขกับการพูดคุยและร่วมกิจกรรมกับพวกเรา";

        const formattedDesc = rawMessage
          .replace(/\{user\}/g, `<@${member.id}>`)
          .replace(/\{username\}/g, member.user.username)
          .replace(/\{server\}/g, member.guild.name)
          .replace(/\{count\}/g, member.guild.memberCount.toString());

        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setAuthor({
            name: `${member.user.username} เข้าร่วมเซิร์ฟเวอร์`,
            iconURL: member.user.displayAvatarURL(),
          })
          .setTitle(`👋 ยินดีต้อนรับสู่ ${member.guild.name}`)
          .setDescription(formattedDesc)
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .addFields(
            {
              name: "👤 ผู้ใช้",
              value: `<@${member.id}>`,
              inline: true,
            },
            {
              name: "👥 สมาชิกคนที่",
              value: `#${member.guild.memberCount}`,
              inline: true,
            },
            {
              name: "📅 บัญชีสร้างเมื่อ",
              value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
              inline: true,
            }
          )
          .setFooter({
            text: `${member.guild.name} Community • ยินดีต้อนรับเสมอ`,
          })
          .setTimestamp();

        await channel.send({
          content: `<@${member.id}>`,
          embeds: [embed],
        });
        console.log(`👋 [Welcome] Sent welcome embed for ${member.user.username}`);
      }
    }
  } catch (error) {
    console.error("❌ Error in handleGuildMemberAdd:", error);
  }
}
