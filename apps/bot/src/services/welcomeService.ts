import {
  type GuildMember,
  type TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";

export interface WelcomeOptions {
  customTitle?: string;
  customMessage?: string;
  bannerUrl?: string;
  rulesChannelId?: string;
  embedColor?: string;
  showFields?: boolean;
  isTest?: boolean;
}

/**
 * Find the most suitable rules channel in the guild
 */
export function findRulesChannel(guild: GuildMember["guild"], configuredId?: string): TextChannel | null {
  if (configuredId) {
    const channel = guild.channels.cache.get(configuredId);
    if (channel && channel.isTextBased()) return channel as TextChannel;
  }

  // Auto-detect rules channel (ignore admin/staff channels)
  const detected = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      !/admin|แอดมิน|ทีมงาน|staff/i.test(ch.name) &&
      /rules|กฎ|ระเบียบ|ข้อตกลง/i.test(ch.name)
  );
  return (detected as TextChannel) || null;
}

/**
 * Find the configured or auto-detected welcome channel
 */
export function findWelcomeChannel(guild: GuildMember["guild"], configuredId?: string): TextChannel | null {
  if (configuredId) {
    const channel = guild.channels.cache.get(configuredId);
    if (channel && channel.isTextBased()) return channel as TextChannel;
  }

  // Auto-detect welcome channel
  const detected = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      /welcome|ยินดีต้อนรับ|ต้อนรับ|ประตู|ทางเข้า/i.test(ch.name)
  );
  return (detected as TextChannel) || null;
}

/**
 * Format dynamic placeholder variables in welcome text
 */
export function formatWelcomeText(
  template: string,
  member: GuildMember,
  rulesChannel?: TextChannel | null
): string {
  const rulesMention = rulesChannel ? `<#${rulesChannel.id}>` : "ห้องกฎระเบียบ";
  return template
    .replace(/\{user\}/g, `<@${member.id}>`)
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{name\}/g, member.displayName || member.user.username)
    .replace(/\{server\}/g, member.guild.name)
    .replace(/\{count\}/g, member.guild.memberCount.toLocaleString("th-TH"))
    .replace(/\{rules\}/g, rulesMention);
}

/**
 * Builds the modern Apple Pro Dark aesthetic welcome embed
 */
export function buildWelcomeEmbed(
  member: GuildMember,
  options: WelcomeOptions = {}
): EmbedBuilder {
  const guild = member.guild;
  const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);
  const rulesChannel = findRulesChannel(guild, options.rulesChannelId);

  const defaultGreeting =
    `ยินดีต้อนรับคุณ <@${member.id}> สู่ครอบครัว **${guild.name}** อย่างเป็นทางการครับ! 🎉\n\n` +
    `ขอให้เพลิดเพลินกับการพูดคุย แลกเปลี่ยน และร่วมกิจกรรมในเซิร์ฟเวอร์นะครับ\n` +
    (rulesChannel
      ? `• อย่าลืมแวะอ่านข้อตกลงและกฎระเบียบได้ที่ห้อง <#${rulesChannel.id}>\n`
      : "") +
    `• หากพบปัญหาหรือต้องการความช่วยเหลือ สามารถเปิดทิกเก็ตติดต่อทีมงานได้ตลอด 24 ชม.`;

  const rawMessage = options.customMessage || defaultGreeting;
  const formattedDesc = formatWelcomeText(rawMessage, member, rulesChannel);

  const defaultTitle = `👋  WELCOME TO ${guild.name.toUpperCase()}`;
  const rawTitle = options.customTitle || defaultTitle;
  const formattedTitle = formatWelcomeText(rawTitle, member, rulesChannel);

  let embedColor: any = THEME_COLORS.accent;
  if (options.embedColor) {
    const cleanHex = options.embedColor.replace("#", "").trim();
    const parsed = parseInt(cleanHex, 16);
    if (!isNaN(parsed)) embedColor = parsed;
  }

  const avatarUrl = member.user.displayAvatarURL({ size: 512, forceStatic: false });
  const serverIconUrl = guild.iconURL({ size: 256 }) || undefined;
  const bannerUrl = options.bannerUrl || guild.bannerURL({ size: 1024 }) || undefined;

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor({
      name: `${member.displayName || member.user.username} เข้าร่วมเซิร์ฟเวอร์ ✨`,
      iconURL: avatarUrl,
    })
    .setTitle(formattedTitle)
    .setDescription(formattedDesc)
    .setThumbnail(avatarUrl);

  if (options.showFields) {
    embed.addFields(
      {
        name: "👤 ข้อมูลสมาชิก",
        value: `<@${member.id}>\n\`${member.user.username}\``,
        inline: true,
      },
      {
        name: "👥 ลำดับสมาชิก",
        value: `คนที่ **#${guild.memberCount.toLocaleString("th-TH")}**\nในเซิร์ฟเวอร์`,
        inline: true,
      },
      {
        name: "📅 สร้างบัญชีเมื่อ",
        value: `<t:${createdTimestamp}:D>\n(<t:${createdTimestamp}:R>)`,
        inline: true,
      }
    );
  }

  if (rulesChannel) {
    embed.addFields({
      name: "📜 เริ่มต้นใช้งาน",
      value: `อ่านกฎระเบียบก่อนเริ่มคุย: <#${rulesChannel.id}>`,
      inline: false,
    });
  }

  if (bannerUrl) {
    embed.setImage(bannerUrl);
  }

  embed.setFooter({
    text: `${guild.name} Community • LynnBot Welcome System`,
    iconURL: serverIconUrl,
  });
  embed.setTimestamp();

  return embed;
}

/**
 * Builds action buttons (Link to Rules channel or Guild)
 */
export function buildWelcomeButtons(
  guild: GuildMember["guild"],
  rulesChannelId?: string
): ActionRowBuilder<ButtonBuilder> | null {
  const rulesChannel = findRulesChannel(guild, rulesChannelId);
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (rulesChannel) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel("📖 กฎระเบียบเซิร์ฟเวอร์")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${rulesChannel.id}`)
    );
  }

  // If there is an announcement / guide channel
  const guideChannel = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      /ประกาศ|announcement|guide|info/i.test(ch.name) &&
      (!rulesChannel || ch.id !== rulesChannel.id)
  );

  if (guideChannel) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel("📢 ห้องประกาศเซิร์ฟเวอร์")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${guideChannel.id}`)
    );
  }

  return row.components.length > 0 ? row : null;
}

/**
 * Process a new member joining: Auto-Role + Welcome Embed + Optional DM
 */
export async function handleWelcomeMember(
  member: GuildMember,
  options: { isTest?: boolean; targetChannelId?: string } = {}
): Promise<{ success: boolean; channelId?: string; error?: string }> {
  try {
    // 1. Fetch welcome & autorole settings from database
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "welcome_enabled",
            "welcome_channel_id",
            "welcome_title",
            "welcome_message",
            "welcome_embed_color",
            "welcome_banner_url",
            "welcome_dm_enabled",
            "welcome_show_fields",
            "rules_channel_id",
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

    // Check if welcome system is enabled (default to true if not explicitly false)
    const isEnabled = settingsMap.welcome_enabled !== "false";
    if (!isEnabled && !options.isTest) {
      return { success: false, error: "ระบบต้อนรับถูกปิดการใช้งาน (welcome_enabled: false)" };
    }

    // 2. Auto-Role assignment (skip in test mode unless member needs it)
    if (!options.isTest && settingsMap.autorole_enabled === "true" && settingsMap.autorole_id) {
      try {
        const role = member.guild.roles.cache.get(settingsMap.autorole_id);
        if (role) {
          await member.roles.add(role, "แจกยศสมาชิกเริ่มต้นอัตโนมัติ (LynnBot Auto-Role)");
          console.log(`🏷️ [Auto-Role] Successfully assigned role '${role.name}' to ${member.user.username}`);
        }
      } catch (roleErr) {
        console.warn(`⚠️ [Auto-Role] Could not add role to ${member.user.username}:`, roleErr);
      }
    }

    // 3. Locate target welcome channel
    const targetChannelId = options.targetChannelId || settingsMap.welcome_channel_id;
    const channel = findWelcomeChannel(member.guild, targetChannelId);

    if (!channel) {
      console.warn(`⚠️ [Welcome] No welcome channel found for guild ${member.guild.name}`);
      return { success: false, error: "ไม่พบห้องสำหรับส่งข้อความต้อนรับ" };
    }

    // 4. Build Embed and Components
    const embed = buildWelcomeEmbed(member, {
      customTitle: settingsMap.welcome_title,
      customMessage: settingsMap.welcome_message,
      bannerUrl: settingsMap.welcome_banner_url,
      rulesChannelId: settingsMap.rules_channel_id,
      embedColor: settingsMap.welcome_embed_color,
      showFields: settingsMap.welcome_show_fields === "true",
      isTest: options.isTest,
    });

    const buttonRow = buildWelcomeButtons(member.guild, settingsMap.rules_channel_id);
    const components = buttonRow ? [buttonRow] : [];

    // 5. Send to welcome channel
    await channel.send({
      content: `<@${member.id}>`,
      embeds: [embed],
      components,
    });

    console.log(`👋 [Welcome] Sent welcome embed for ${member.user.username} in #${channel.name}`);

    // 6. Optional Direct Message (DM) to new member
    if (settingsMap.welcome_dm_enabled === "true" && !member.user.bot && !options.isTest) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.accent)
          .setTitle(`🎉 ยินดีต้อนรับสู่ ${member.guild.name}!`)
          .setDescription(
            `สวัสดีคุณ <@${member.id}>,\n\n` +
            `ขอบคุณที่เข้าร่วมคอมมูนิตี้ **${member.guild.name}** ของเรา!\n` +
            `หากต้องการเริ่มต้นใช้งาน แนะนำให้เข้าไปทำความคุ้นเคยกับกฎระเบียบและห้องพูดคุยในเซิร์ฟเวอร์ได้เลยครับ ✨`
          )
          .setFooter({ text: `${member.guild.name} • ยินดีต้อนรับเสมอ` })
          .setTimestamp();

        await member.send({ embeds: [dmEmbed], components }).catch(() => {});
      } catch {
        // User may have DMs closed, safe to ignore
      }
    }

    return { success: true, channelId: channel.id };
  } catch (err: any) {
    console.error("❌ Error in handleWelcomeMember:", err);
    return { success: false, error: err.message };
  }
}
