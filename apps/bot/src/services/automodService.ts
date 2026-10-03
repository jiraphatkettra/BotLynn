import {
  type Message,
  type TextChannel,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";

// In-memory rate limit tracker: userId -> timestamp array
const userMessageTimestamps = new Map<string, number[]>();

export async function processAutoMod(message: Message): Promise<boolean> {
  // Never automod admins or bot messages
  if (message.author.bot || !message.guild) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  try {
    // 1. Fetch Auto-Mod Settings from Setting table
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "automod_enabled",
            "automod_blocked_words",
            "automod_blocked_links",
            "automod_spam_threshold",
            "automod_action",
            "automod_log_channel",
          ],
        },
      },
    });

    const settingsMap = new Map<string, string>(
      settings.map((s: { key: string; value: string }) => [s.key, s.value])
    );
    const isEnabled = settingsMap.get("automod_enabled") === "true";
    if (!isEnabled) return false;

    const blockedWordsRaw: string = settingsMap.get("automod_blocked_words") || "";
    const blockedLinksRaw: string =
      settingsMap.get("automod_blocked_links") || "discord.gg/,discord.com/invite";
    const spamThreshold = parseInt(settingsMap.get("automod_spam_threshold") || "5", 10);
    const action: string = settingsMap.get("automod_action") || "DELETE";
    const logChannelId: string | undefined = settingsMap.get("automod_log_channel");

    const content = message.content.toLowerCase();
    let violationReason: string | null = null;

    // 2. Check Spam Rate Limit (Threshold messages in 5 seconds)
    const now = Date.now();
    const timestamps = userMessageTimestamps.get(message.author.id) || [];
    const recent = timestamps.filter((t) => now - t < 5000);
    recent.push(now);
    userMessageTimestamps.set(message.author.id, recent);

    if (recent.length > spamThreshold) {
      violationReason = `สแปมข้อความถี่เกินกำหนด (${recent.length} ข้อความ / 5 วินาที)`;
    }

    // 3. Check Blocked Words
    if (!violationReason && blockedWordsRaw.trim()) {
      const blockedWords = blockedWordsRaw
        .split(",")
        .map((w: string) => w.trim().toLowerCase())
        .filter(Boolean);

      for (const word of blockedWords) {
        if (content.includes(word)) {
          violationReason = `มีคำต้องห้ามในข้อความ ("${word}")`;
          break;
        }
      }
    }

    // 4. Check Blocked Links / Discord Invites
    if (!violationReason && blockedLinksRaw.trim()) {
      const blockedLinks = blockedLinksRaw
        .split(",")
        .map((l: string) => l.trim().toLowerCase())
        .filter(Boolean);

      for (const link of blockedLinks) {
        if (content.includes(link)) {
          violationReason = `มีลิงก์ต้องห้ามหรือคำเชิญดิสคอร์ด (${link})`;
          break;
        }
      }
    }

    // If violation detected
    if (violationReason) {
      // Delete message
      try {
        if (message.deletable) {
          await message.delete();
        }
      } catch (e) {
        // Failed to delete
      }

      // Record Warning if action is WARN or MUTE
      if (action === "WARN" || action === "MUTE") {
        await prisma.warning.create({
          data: {
            discordId: message.author.id,
            discordName: message.author.username,
            issuedById: message.client.user?.id || "automod",
            issuedBy: "🤖 LynnBot AutoMod",
            reason: violationReason,
            severity: action === "MUTE" ? "HIGH" : "MEDIUM",
          },
        });
      }

      // Timeout / Mute member if action is MUTE
      if (action === "MUTE" && message.member?.moderatable) {
        try {
          await message.member.timeout(10 * 60 * 1000, violationReason); // 10 minutes timeout
        } catch {}
      }

      // DM Warning to Member
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.danger)
          .setTitle("⚠️ ระบบตรวจพบการละเมิดกฎเซิร์ฟเวอร์")
          .setDescription(
            `ข้อความของคุณใน **${message.guild.name}** ถูกระงับ\n\n` +
            `• **สาเหตุ:** ${violationReason}\n` +
            `• **มาตรการ:** ${action}\n\n` +
            `> กรุณาปฏิบัติตามกฎของเซิร์ฟเวอร์เพื่อความเรียบร้อยของชุมชน`
          )
          .setFooter({ text: "LynnBot Auto-Moderation System" })
          .setTimestamp();
        await message.author.send({ embeds: [dmEmbed] });
      } catch {}

      // Log to designated log channel if configured
      if (logChannelId) {
        try {
          const logChannel = message.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor(THEME_COLORS.danger)
              .setTitle("🚨 ตรวจพบการละเมิดกฎโดย AutoMod")
              .addFields(
                { name: "สมาชิก", value: `<@${message.author.id}> (${message.author.username})`, inline: true },
                { name: "ห้อง", value: `<#${message.channelId}>`, inline: true },
                { name: "มาตรการ", value: action, inline: true },
                { name: "สาเหตุ", value: violationReason },
                { name: "ข้อความเดิม", value: message.content ? `\`\`\`${message.content.slice(0, 500)}\`\`\`` : "*(ไม่มีข้อความ)*" }
              )
              .setFooter({ text: "LynnBot Security Engine" })
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch {}
      }

      // Add to audit log
      try {
        await prisma.auditLog.create({
          data: {
            category: "MODERATION",
            action: `AUTOMOD_${action}`,
            details: `AutoMod action ${action}: ${violationReason} for ${message.author.username} (${message.author.id}) in channel ${message.channelId}`,
            metadata: { reason: violationReason, channelId: message.channelId, targetId: message.author.id },
          },
        });
      } catch {}

      return true; // Message was intercepted and deleted
    }

    return false;
  } catch (err) {
    console.error("AutoMod error:", err);
    return false;
  }
}
