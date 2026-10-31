import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  type UserSelectMenuInteraction,
  type TextChannel,
  type Client,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import {
  buildFandayPanelEmbed,
  createFandayEmbed,
  FANDAY_COLORS,
  BRAND_DIVIDER,
  WAVE_DIVIDER,
} from "../../utils/fandayTheme.js";
import { renderCustomEmbed } from "../embedService.js";
import {
  showGameMenu,
  launchMiniGame,
  handleGameAnswer,
} from "../../features/fanday/games/gameRegistry.js";
import {
  showLetterComposeModal,
  handleLetterSubmit,
} from "../../features/fanday/letters/letterService.js";

// In-memory registration drafts: discordId -> { gender, seeking }
const playerDrafts = new Map<string, { gender?: string; seeking?: string }>();

/**
 * Helper to get or create the active/default Fanday Event for the guild
 */
export async function getOrCreateActiveEvent(guildId?: string) {
  const targetGuildId = guildId || process.env.DISCORD_GUILD_ID || "1078869442609561691";
  let event = await prisma.fandayEvent.findFirst({
    where: {
      guildId: targetGuildId,
      status: { notIn: ["ENDED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      players: {
        where: { status: { in: ["REGISTERED", "LOCKED", "MATCHED"] } },
        orderBy: { joinedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!event) {
    event = await prisma.fandayEvent.create({
      data: {
        guildId: targetGuildId,
        title: "กิจกรรมแฟนเดย์ • 753BC",
        status: "REGISTRATION",
        minPlayers: 7,
        pairingMode: "MALE_FEMALE",
        allowSelfLock: true,
        allowReroll: true,
        aiMatchingEnabled: true,
      },
      include: {
        players: true,
      },
    });
  }

  return event;
}

/**
 * 🎀 1. Build Fanday Persistent Interactive Panel (Matches reference image)
 */
export async function buildFandayPanel(options?: {
  eventTitle?: string;
  playerCount?: number;
  minPlayers?: number;
  statusLabel?: string;
  statusEmoji?: string;
  recentPlayerNames?: string[];
}) {
  const event = await getOrCreateActiveEvent();

  const totalPlayers = await prisma.fandayPlayer.count({
    where: {
      eventId: event.id,
      status: { in: ["REGISTERED", "LOCKED", "MATCHED"] },
    },
  });

  const recentPlayers = await prisma.fandayPlayer.findMany({
    where: {
      eventId: event.id,
      status: { in: ["REGISTERED", "LOCKED", "MATCHED"] },
    },
    orderBy: { joinedAt: "desc" },
    take: 5,
    select: { displayName: true },
  });

  const recentNames = recentPlayers.map((p) => p.displayName);

  let statusLabel = "เปิดรับสมัครผู้เข้าร่วม";
  let statusEmoji = "🟢";

  if (event.status === "PAUSED") {
    statusLabel = "พักกิจกรรมชั่วคราว";
    statusEmoji = "🛠️";
  } else if (event.status === "MATCHING") {
    statusLabel = "กำลังดำเนินการจับคู่";
    statusEmoji = "🟡";
  } else if (event.status === "ACTIVE") {
    statusLabel = "เริ่มกิจกรรมแล้ว";
    statusEmoji = "💗";
  } else if (event.status === "LETTERS") {
    statusLabel = "ช่วงเขียนจดหมายความรู้สึก";
    statusEmoji = "💌";
  } else if (event.status === "ENDED") {
    statusLabel = "จบกิจกรรมแล้ว";
    statusEmoji = "🏁";
  }

  const defaultEmbed = buildFandayPanelEmbed({
    title: options?.eventTitle || event.title,
    playerCount: options?.playerCount ?? totalPlayers,
    minPlayers: options?.minPlayers ?? event.minPlayers,
    statusLabel: options?.statusLabel || statusLabel,
    statusEmoji: options?.statusEmoji || statusEmoji,
    recentPlayerNames: options?.recentPlayerNames || recentNames,
  });

  const formattedRecent = recentNames.length > 0
    ? recentNames.map((n) => `• \`${n}\``).join("\n")
    : "- *ยังไม่มีผู้เข้าร่วมในขณะนี้*";

  const embed = await renderCustomEmbed("fanday_panel_main", defaultEmbed, {
    event_title: event.title,
    player_count: totalPlayers,
    min_players: event.minPlayers,
    status_label: statusLabel,
    status_emoji: statusEmoji,
    recent_players: formattedRecent,
    brand_divider: BRAND_DIVIDER,
    wave_divider: WAVE_DIVIDER,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("fd_join")
      .setLabel("เข้าร่วมเกม")
      .setEmoji("🎀")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("fd_leave")
      .setLabel("ออกจากเกม")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("fd_rules")
      .setLabel("อ่านกติกา")
      .setEmoji("📖")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("fd_myrole")
      .setLabel("บทบาทของฉัน")
      .setEmoji("🔎")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 🔄 Refresh the live Fanday panel in Discord
 */
export async function refreshFandayPanelLive(client: Client) {
  try {
    const event = await prisma.fandayEvent.findFirst({
      where: { status: { notIn: ["ENDED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
    });

    if (!event || !event.panelChannelId || !event.panelMessageId) return;

    const channel = client.channels.cache.get(event.panelChannelId) as TextChannel | undefined;
    if (!channel) return;

    const message = await channel.messages.fetch(event.panelMessageId).catch(() => null);
    if (!message) return;

    const updatedData = await buildFandayPanel();
    await message.edit(updatedData);
  } catch (err) {
    console.error("Error refreshing Fanday panel live:", err);
  }
}

/**
 * 🎀 2. Handle fd_join: Step 1 (Consent & Preferences)
 */
export async function handleFandayJoin(interaction: ButtonInteraction) {
  try {
    const event = await getOrCreateActiveEvent(interaction.guildId || undefined);

    if (event.status === "PAUSED") {
      const pausedEmbed = createFandayEmbed({
        title: "🛠️ กิจกรรมอยู่ในโหมดพักชั่วคราว",
        description: "ขณะนี้แอดมินกำลังปรับปรุงระบบ หรือเตรียมการสำหรับรอบถัดไป\nกรุณารอสักครู่แล้วลองใหม่อีกครั้งครับ",
        color: FANDAY_COLORS.warning,
      });
      await interaction.reply({ embeds: [pausedEmbed], ephemeral: true });
      return;
    }

    if (event.status !== "REGISTRATION" && event.status !== "DRAFT") {
      const closedEmbed = createFandayEmbed({
        title: "🔒 ปิดรับสมัครสำหรับรอบนี้แล้ว",
        description: `ขณะนี้กิจกรรมอยู่ในสถานะ **${event.status}** ไม่เปิดรับสมัครผู้เล่นเพิ่มในรอบนี้แล้วครับ`,
        color: FANDAY_COLORS.danger,
      });
      await interaction.reply({ embeds: [closedEmbed], ephemeral: true });
      return;
    }

    // Check if already registered
    const existingPlayer = await prisma.fandayPlayer.findUnique({
      where: {
        eventId_discordId: {
          eventId: event.id,
          discordId: interaction.user.id,
        },
      },
    });

    if (existingPlayer && ["REGISTERED", "LOCKED", "MATCHED"].includes(existingPlayer.status)) {
      const alreadyEmbed = createFandayEmbed({
        title: "✅ คุณได้ลงทะเบียนเข้าร่วมกิจกรรมไว้แล้ว",
        description: `• **สถานะของคุณ:** \`${existingPlayer.status}\`\n• **เพศที่คุณระบุ:** \`${existingPlayer.gender}\`\n• **เพศที่ต้องการคู่:** \`${existingPlayer.seeking}\`\n${existingPlayer.lockedWithId ? `• **ขอล็อกคู่ไว้กับ:** <@${existingPlayer.lockedWithId}>\n` : ""}\nหากต้องการดูรายละเอียดคู่หรือมินิเกม ให้กดปุ่ม **"บทบาทของฉัน"** ด้านล่าง`,
        color: FANDAY_COLORS.pink,
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("fd_myrole")
          .setLabel("บทบาทของฉัน")
          .setEmoji("🔎")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("fd_leave")
          .setLabel("ออกจากกิจกรรม")
          .setEmoji("🚪")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ embeds: [alreadyEmbed], components: [row], ephemeral: true });
      return;
    }

    // Show Registration Step 1
    const introEmbed = createFandayEmbed({
      title: "🎀 ข้อมูลเบื้องต้นสำหรับการจับคู่แฟนเดย์",
      description:
        `ยินดีต้อนรับคุณ <@${interaction.user.id}> สู่กิจกรรมแฟนเดย์ 753BC!\n\n` +
        `**กรุณาเลือกเพศและเงื่อนไขการจับคู่ของคุณ:**\n` +
        `1. เพศของคุณ (สำหรับการคำนวณโหมด ${event.pairingMode})\n` +
        `2. เพศที่คุณต้องการให้ระบบสุ่มจับคู่ด้วย\n` +
        `3. คุณมีคู่อยู่แล้วและต้องการ **"ล็อกคู่"** หรือไม่?\n\n` +
        `-# *ข้อมูลของคุณจะถูกใช้เฉพาะการจับคู่ในกิจกรรมนี้เท่านั้น และเก็บรักษาเป็นความลับ*`,
      color: FANDAY_COLORS.theme,
    });

    const genderSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("fd_select_gender")
        .setPlaceholder("👤 1. เลือกเพศของคุณ")
        .addOptions([
          new StringSelectMenuOptionBuilder().setLabel("ชาย (Male)").setValue("MALE").setEmoji("👨"),
          new StringSelectMenuOptionBuilder().setLabel("หญิง (Female)").setValue("FEMALE").setEmoji("👩"),
          new StringSelectMenuOptionBuilder().setLabel("Non-binary / ความหลากหลาย").setValue("NONBINARY").setEmoji("🌈"),
          new StringSelectMenuOptionBuilder().setLabel("ไม่ระบุเพศ (Prefer not to say)").setValue("PREFER_NOT").setEmoji("✨"),
        ])
    );

    const seekingSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("fd_select_seeking")
        .setPlaceholder("💘 2. เลือกเพศที่คุณต้องการให้จับคู่ด้วย")
        .addOptions([
          new StringSelectMenuOptionBuilder().setLabel("ต้องการคู่: ชาย (Male)").setValue("MALE").setEmoji("👨"),
          new StringSelectMenuOptionBuilder().setLabel("ต้องการคู่: หญิง (Female)").setValue("FEMALE").setEmoji("👩"),
          new StringSelectMenuOptionBuilder().setLabel("ใครก็ได้ / ไม่จำกัดเพศ (Any)").setValue("ANY").setEmoji("💞"),
        ])
    );

    const intentRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("fd_step_continue_single")
        .setLabel("โสด • ให้ AI สุ่มคู่ตามนิสัย")
        .setEmoji("🎲")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("fd_step_lock_partner")
        .setLabel("มีคู่แล้ว • ขอล็อกคู่ของฉัน")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [introEmbed],
      components: [genderSelect, seekingSelect, intentRow],
      ephemeral: true,
    });
  } catch (err: any) {
    console.error("Error in handleFandayJoin:", err);
    await interaction.reply({
      content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      ephemeral: true,
    }).catch(() => {});
  }
}

/**
 * 🚪 3. Handle fd_leave: Leave Activity & Confirmation
 */
export async function handleFandayLeave(interaction: ButtonInteraction) {
  try {
    const event = await getOrCreateActiveEvent(interaction.guildId || undefined);

    const player = await prisma.fandayPlayer.findUnique({
      where: {
        eventId_discordId: {
          eventId: event.id,
          discordId: interaction.user.id,
        },
      },
    });

    if (!player || player.status === "WITHDRAWN") {
      const notInEmbed = createFandayEmbed({
        title: "ℹ️ คุณไม่ได้อยู่ในกิจกรรมนี้",
        description: "คุณยังไม่ได้ลงทะเบียนเข้าร่วม หรือได้ถอนตัวออกจากกิจกรรมไปแล้วครับ",
        color: FANDAY_COLORS.warning,
      });
      await interaction.reply({ embeds: [notInEmbed], ephemeral: true });
      return;
    }

    const confirmEmbed = createFandayEmbed({
      title: "🚪 ยืนยันการออกจากกิจกรรมแฟนเดย์",
      description:
        `คุณแน่ใจหรือไม่ว่าต้องการถอนตัวออกจากกิจกรรม **${event.title}**?\n\n` +
        `• หากคุณมีคู่อยู่แล้ว ระบบจะแจ้งเตือนคู่ของคุณอย่างสุภาพ\n` +
        `• คุณสามารถกลับมาสมัครใหม่ได้ตลอดเวลาตราบใดที่ยังเปิดรับสมัครอยู่`,
      color: FANDAY_COLORS.danger,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("fd_leave_confirm")
        .setLabel("ยืนยันถอนตัวออกจากเกม")
        .setEmoji("⚠️")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("fd_cancel_dismiss")
        .setLabel("ยกเลิก")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
  } catch (err: any) {
    console.error("Error in handleFandayLeave:", err);
    await interaction.reply({
      content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      ephemeral: true,
    }).catch(() => {});
  }
}

/**
 * 🚪 3.1 Handle fd_leave_confirm: Process Leave
 */
export async function handleFandayLeaveConfirm(interaction: ButtonInteraction) {
  try {
    const event = await getOrCreateActiveEvent(interaction.guildId || undefined);

    await prisma.fandayPlayer.updateMany({
      where: {
        eventId: event.id,
        discordId: interaction.user.id,
      },
      data: {
        status: "WITHDRAWN",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "Fanday: Player Withdrawn",
        category: "FANDAY",
        details: `${interaction.user.tag} (${interaction.user.id}) withdrawn from ${event.title}`,
      },
    });

    const successEmbed = createFandayEmbed({
      title: "🚪 ถอนตัวออกจากกิจกรรมเรียบร้อยแล้ว",
      description: "ระบบได้ทำการนำชื่อของคุณออกจากกิจกรรมแฟนเดย์รอบนี้แล้วครับ\nหวังว่าจะได้ร่วมสนุกกันใหม่ในโอกาสหน้านะครับ!",
      color: FANDAY_COLORS.theme,
    });

    await interaction.update({ embeds: [successEmbed], components: [] });
    setTimeout(() => refreshFandayPanelLive(interaction.client), 1000);
  } catch (err: any) {
    console.error("Error in handleFandayLeaveConfirm:", err);
  }
}

/**
 * 📖 4. Handle fd_rules: Show Fanday Rules
 */
export async function handleFandayRules(interaction: ButtonInteraction) {
  try {
    const event = await getOrCreateActiveEvent(interaction.guildId || undefined);

    const defaultEmbed = createFandayEmbed({
      title: "📖 กฎกติกา & ระเบียบกิจกรรมแฟนเดย์ • 753BC",
      description:
        `ยินดีต้อนรับสู่กิจกรรม **แฟนเดย์ (Fanday)** ของคอมมูนิตี้ 753BC!\n` +
        `เพื่อความสนุกและบรรยากาศที่ดีของทุกคน กรุณาปฏิบัติตามกฎกติกาดังต่อไปนี้:\n\n` +
        `**1. การสมัครและการให้ข้อมูล**\n` +
        `• สมัครด้วยความสมัครใจ และต้องอยู่ในเซิร์ฟเวอร์ตลอดระยะเวลากิจกรรม\n` +
        `• ระบุเพศและคำตอบตามความเป็นจริง เพื่อให้ระบบ AI และแบบประเมินจับคู่ได้อย่างเหมาะสมที่สุด\n\n` +
        `**2. สิทธิ์การล็อกคู่ (Self-Lock)**\n` +
        `• สมาชิกที่มีคู่อยู่แล้ว สามารถเลือก 'ขอล็อกคู่' ได้ โดยอีกฝ่ายต้องกดยืนยันการจับคู่\n` +
        `• เมื่อยืนยันคู่สำเร็จ ทั้งสองจะถูกแยกออกจาก Pool การสุ่มเดี่ยวโดยอัตโนมัติ\n\n` +
        `**3. มารยาทและความปลอดภัย**\n` +
        `• ให้เกียรติและเคารพซึ่งกันและกัน ไม่ใช้ถ้อยคำคุกคาม หยาบคาย หรือเรียกร้องข้อมูลส่วนตัวเกินขอบเขต\n` +
        `• กิจกรรมจัดขึ้นเพื่อมิตรภาพและความบันเทิง ไม่บังคับให้เกิดความสัมพันธ์จริงจัง\n` +
        `• หากพบพฤติกรรมไม่เหมาะสม สามารถกดปุ่ม 'รายงาน/ขอความช่วยเหลือ' ได้ทันที ทีมงานจะเข้าดูแลอย่างลับๆ\n\n` +
        `**4. มินิเกมและจดหมาย**\n` +
        `• ร่วมเล่นมินิเกมกระชับความสัมพันธ์ในห้องส่วนตัว\n` +
        `• เมื่อจบกิจกรรม สามารถเขียนจดหมายความรู้สึกส่งถึงคู่ของคุณได้ (เลือกแบบระบุชื่อหรือนิรนามได้)`,
      color: FANDAY_COLORS.theme,
    });

    const embed = await renderCustomEmbed("fanday_rules", defaultEmbed, {
      event_title: event.title,
      min_players: event.minPlayers,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err: any) {
    console.error("Error in handleFandayRules:", err);
    await interaction.reply({
      content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      ephemeral: true,
    }).catch(() => {});
  }
}

/**
 * 🔎 5. Handle fd_myrole: View My Status & Partner
 */
export async function handleFandayMyRole(interaction: ButtonInteraction) {
  try {
    const event = await getOrCreateActiveEvent(interaction.guildId || undefined);

    const player = await prisma.fandayPlayer.findUnique({
      where: {
        eventId_discordId: {
          eventId: event.id,
          discordId: interaction.user.id,
        },
      },
    });

    if (!player || player.status === "WITHDRAWN") {
      const notRegisteredEmbed = createFandayEmbed({
        title: "🔎 คุณยังไม่ได้ลงทะเบียนในกิจกรรมนี้",
        description:
          `คุณยังไม่ได้เข้าร่วมกิจกรรม **${event.title}** ในขณะนี้\n` +
          `กดปุ่ม **"🎀 เข้าร่วมเกม"** ที่แผงหลักเพื่อเริ่มลงทะเบียนและจับคู่ได้เลยครับ!`,
        color: FANDAY_COLORS.warning,
      });
      await interaction.reply({ embeds: [notRegisteredEmbed], ephemeral: true });
      return;
    }

    // Find pair if matched
    const pair = await prisma.fandayPair.findFirst({
      where: {
        eventId: event.id,
        status: "ACTIVE",
        OR: [{ playerAId: interaction.user.id }, { playerBId: interaction.user.id }],
      },
    });

    const partnerId = pair ? (pair.playerAId === interaction.user.id ? pair.playerBId : pair.playerAId) : null;
    const partnerText = partnerId ? `<@${partnerId}>` : (player.lockedWithId ? `ขอล็อกคู่กับ <@${player.lockedWithId}> (รอยืนยัน)` : "⏳ รอการจับคู่");
    const channelText = pair?.channelId ? `<#${pair.channelId}>` : "ยังไม่ได้เปิดห้อง";

    const defaultEmbed = createFandayEmbed({
      title: "🔎 ข้อมูลบทบาทและสถานะกิจกรรมของคุณ",
      description:
        `• **ผู้เข้าร่วม:** <@${interaction.user.id}>\n` +
        `• **สถานะปัจจุบัน:** \`${player.status}\`\n` +
        `• **เพศของคุณ:** \`${player.gender}\` | **เพศที่ต้องการ:** \`${player.seeking}\`\n` +
        `• **คู่แฟนเดย์ของคุณ:** ${partnerText}\n` +
        `• **ห้องกิจกรรมคู่:** ${channelText}\n\n` +
        `**🌟 บุคลิกภาพของคุณ (AI Personality Type):**\n` +
        `> **${player.typeCode || "รอการวิเคราะห์ (AI Evaluating)"}**\n` +
        `> *${player.typeSummary || "ระบบจะทำการประเมิน Type ของคุณเมื่อเริ่มการจับคู่"}*`,
      color: FANDAY_COLORS.pink,
    });

    const embed = await renderCustomEmbed("fanday_myrole", defaultEmbed, {
      user: `<@${interaction.user.id}>`,
      status: player.status,
      partner: partnerText,
      type_name: player.typeCode || "รอการประเมิน",
      type_summary: player.typeSummary || "ระบบจะทำการประเมิน Type ของคุณเมื่อเริ่มการจับคู่",
      pair_channel: channelText,
    });

    const components: any[] = [];
    if (pair) {
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`fd_game_menu:${pair.id}`)
            .setLabel("เริ่มเล่นมินิเกมคู่")
            .setEmoji("🎮")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`fd_letter_write:${pair.id}`)
            .setLabel("เขียนจดหมายถึงคู่")
            .setEmoji("💌")
            .setStyle(ButtonStyle.Success)
        )
      );
    }

    await interaction.reply({ embeds: [embed], components, ephemeral: true });
  } catch (err: any) {
    console.error("Error in handleFandayMyRole:", err);
    await interaction.reply({
      content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      ephemeral: true,
    }).catch(() => {});
  }
}

/**
 * 6. Handle fd_select_gender: Update gender preference in draft
 */
export async function handleFandaySelectGender(interaction: StringSelectMenuInteraction) {
  const chosen = interaction.values[0];
  const draft = playerDrafts.get(interaction.user.id) || {};
  draft.gender = chosen;
  playerDrafts.set(interaction.user.id, draft);

  await interaction.reply({
    content: `✅ บันทึกเพศของคุณเป็น: \`${chosen}\` เรียบร้อยแล้ว (กรุณาเลือกเพศที่ต้องการจับคู่และกดยืนยัน)`,
    ephemeral: true,
  });
}

/**
 * 7. Handle fd_select_seeking: Update seeking preference in draft
 */
export async function handleFandaySelectSeeking(interaction: StringSelectMenuInteraction) {
  const chosen = interaction.values[0];
  const draft = playerDrafts.get(interaction.user.id) || {};
  draft.seeking = chosen;
  playerDrafts.set(interaction.user.id, draft);

  await interaction.reply({
    content: `✅ บันทึกเพศที่ต้องการคู่เป็น: \`${chosen}\` เรียบร้อยแล้ว (กดปุ่มเลือกรูปแบบด้านล่าง)`,
    ephemeral: true,
  });
}

/**
 * 8. Handle fd_step_continue_single: Open Personality & Interest Questionnaire Modal
 */
export async function handleFandayStepSingle(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("fd_modal_questionnaire")
    .setTitle("แบบประเมินนิสัย & ความชอบแฟนเดย์");

  const q1 = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("q_talk_style")
      .setLabel("1. สไตล์การพูดคุยของคุณ")
      .setPlaceholder("เช่น ชวนคุยเก่ง, ชอบเป็นผู้ฟัง, เฮฮาตลก, หรือจริงจังปรึกษาได้")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
  );

  const q2 = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("q_favorite_games")
      .setLabel("2. เกมหรือกิจกรรมที่อยากทำร่วมกับคู่")
      .setPlaceholder("เช่น เล่นเกมชิลล์ๆ, ดูสตรีม/ฟังเพลง, แข่งเกม FPS, คุยเปิดไมค์เฉยๆ")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
  );

  const q3 = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("q_online_time")
      .setLabel("3. ช่วงเวลาที่คุณสะดวกและออนไลน์บ่อย")
      .setPlaceholder("เช่น บ่าย (12:00-18:00), ค่ำ (19:00-23:00), หรือดึก (00:00 เป็นต้นไป)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(60)
  );

  const q4 = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("q_goal")
      .setLabel("4. สิ่งที่คุณมองหาจากกิจกรรมแฟนเดย์")
      .setPlaceholder("เช่น เพื่อนเล่นเกมใหม่ๆ, มิตรภาพพูดคุยแลกเปลี่ยน, หรือหาคนรู้ใจ")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
  );

  const q5 = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("q_bio")
      .setLabel("5. แนะนำตัวเองสั้นๆ ให้คู่ของคุณรู้จัก")
      .setPlaceholder("นิสัยส่วนตัว ความชอบ อาหารที่ชอบ หรือคำทักทายแรกของคุณ...")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(300)
  );

  modal.addComponents(q1, q2, q3, q4, q5);
  await interaction.showModal(modal);
}

/**
 * 9. Handle fd_modal_questionnaire submit: Save Player & Complete Registration
 */
export async function handleFandayModalQuestionnaire(interaction: ModalSubmitInteraction) {
  try {
    const event = await getOrCreateActiveEvent(interaction.guildId || undefined);
    const draft = playerDrafts.get(interaction.user.id) || {};

    const talkStyle = interaction.fields.getTextInputValue("q_talk_style");
    const favGames = interaction.fields.getTextInputValue("q_favorite_games");
    const onlineTime = interaction.fields.getTextInputValue("q_online_time");
    const goal = interaction.fields.getTextInputValue("q_goal");
    const bio = interaction.fields.getTextInputValue("q_bio");

    const answers = {
      talkStyle,
      favGames,
      onlineTime,
      goal,
      bio,
    };

    const player = await prisma.fandayPlayer.upsert({
      where: {
        eventId_discordId: {
          eventId: event.id,
          discordId: interaction.user.id,
        },
      },
      update: {
        displayName: interaction.user.displayName || interaction.user.username,
        gender: draft.gender || "PREFER_NOT",
        seeking: draft.seeking || "ANY",
        status: "REGISTERED",
        hasPartner: false,
        answers,
      },
      create: {
        eventId: event.id,
        discordId: interaction.user.id,
        displayName: interaction.user.displayName || interaction.user.username,
        gender: draft.gender || "PREFER_NOT",
        seeking: draft.seeking || "ANY",
        status: "REGISTERED",
        hasPartner: false,
        answers,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "Fanday: Player Registered",
        category: "FANDAY",
        details: `${interaction.user.tag} (${interaction.user.id}) registered for ${event.title}`,
      },
    });

    const successEmbed = createFandayEmbed({
      title: "🎉 ลงทะเบียนเข้าร่วมกิจกรรมแฟนเดย์สำเร็จ!",
      description:
        `ยินดีต้อนรับคุณ <@${interaction.user.id}> เข้าสู่กิจกรรม **${event.title}**!\n\n` +
        `• **เพศของคุณ:** \`${player.gender}\`\n` +
        `• **เพศที่ต้องการให้จับคู่:** \`${player.seeking}\`\n` +
        `• **สถานะ:** 🟢 \`รอการจับคู่ (Registered & Waiting for Matching)\`\n\n` +
        `ระบบได้บันทึกคำตอบของคุณเข้าสู่แบบประเมินเรียบร้อยแล้ว เมื่อถึงเวลาเริ่มกิจกรรม AI จะทำการจับคู่คนที่เหมาะสมที่สุดให้คุณอัตโนมัติครับ!`,
      color: FANDAY_COLORS.success,
    });

    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    setTimeout(() => refreshFandayPanelLive(interaction.client), 1000);
  } catch (err: any) {
    console.error("Error in handleFandayModalQuestionnaire:", err);
    await interaction.reply({
      content: `❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${err.message}`,
      ephemeral: true,
    }).catch(() => {});
  }
}

/**
 * 🔒 10. Handle fd_step_lock_partner: Show Partner Selection UserSelectMenu
 */
export async function handleFandayStepLock(interaction: ButtonInteraction) {
  const select = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("fd_select_lock_target")
      .setPlaceholder("💘 เลือกสมาชิกที่คุณต้องการขอล็อกคู่ด้วย")
  );

  const lockEmbed = createFandayEmbed({
    title: "🔒 เลือกคู่ที่คุณต้องการขอล็อกคู่ด้วย (Self-Lock)",
    description:
      `กรุณาเลือกสมาชิกในเซิร์ฟเวอร์ที่คุณต้องการจับคู่ด้วย\n\n` +
      `**เงื่อนไขการล็อกคู่:**\n` +
      `1. อีกฝ่ายต้องเป็นสมาชิกในเซิร์ฟเวอร์\n` +
      `2. ระบบจะส่งคำขอไปยังคู่ของคุณ และต้องได้รับการกดยืนยันจากอีกฝ่าย\n` +
      `3. เมื่อยืนยันสำเร็จ ทั้งสองจะกลายเป็นคู่แฟนเดย์กันทันทีโดยไม่ต้องรอรอบสุ่ม AI`,
    color: FANDAY_COLORS.pink,
  });

  await interaction.reply({ embeds: [lockEmbed], components: [select], ephemeral: true });
}

/**
 * 🔒 11. Handle fd_select_lock_target: Target chosen, send confirmation request
 */
export async function handleFandaySelectLockTarget(interaction: UserSelectMenuInteraction) {
  try {
    const targetUserId = interaction.values[0];

    if (targetUserId === interaction.user.id) {
      await interaction.reply({
        content: "❌ คุณไม่สามารถเลือกล็อกคู่กับตัวเองได้ครับ กรุณาเลือกสมาชิกท่านอื่น",
        ephemeral: true,
      });
      return;
    }

    const event = await getOrCreateActiveEvent(interaction.guildId || undefined);

    await prisma.fandayPlayer.upsert({
      where: {
        eventId_discordId: {
          eventId: event.id,
          discordId: interaction.user.id,
        },
      },
      update: {
        displayName: interaction.user.displayName || interaction.user.username,
        status: "REGISTERED",
        hasPartner: true,
        lockedWithId: targetUserId,
      },
      create: {
        eventId: event.id,
        discordId: interaction.user.id,
        displayName: interaction.user.displayName || interaction.user.username,
        status: "REGISTERED",
        hasPartner: true,
        lockedWithId: targetUserId,
      },
    });

    const sentEmbed = createFandayEmbed({
      title: "💌 ส่งคำขอล็อกคู่เรียบร้อยแล้ว!",
      description:
        `ระบบได้ส่งคำขอล็อกคู่แฟนเดย์ไปยัง <@${targetUserId}> เรียบร้อยแล้วครับ\n` +
        `เมื่ออีกฝ่ายกดยืนยัน ระบบจะผูกคู่ของคุณทั้งสองคนทันที\n\n` +
        `-# คุณสามารถตรวจสอบสถานะได้ตลอดเวลาที่ปุ่ม **'บทบาทของฉัน'**`,
      color: FANDAY_COLORS.pink,
    });

    await interaction.reply({ embeds: [sentEmbed], ephemeral: true });

    // Try sending DM to target
    try {
      const targetUser = await interaction.client.users.fetch(targetUserId);
      if (targetUser) {
        const inviteEmbed = createFandayEmbed({
          title: "💌 คุณมีคำขอล็อกคู่แฟนเดย์! (Fanday Pair Request)",
          description:
            `สมาชิก <@${interaction.user.id}> (${interaction.user.displayName || interaction.user.username}) ได้ส่งคำขอ **ล็อกคู่แฟนเดย์** กับคุณในกิจกรรม **${event.title}**\n\n` +
            `หากคุณตอบรับ คุณทั้งสองคนจะได้เป็นคู่แฟนเดย์ร่วมเล่นมินิเกมและเขียนจดหมายความรู้สึกด้วยกันครับ!`,
          color: FANDAY_COLORS.pink,
        });

        const decisionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`fd_lock_accept:${interaction.user.id}`)
            .setLabel("ตอบรับเป็นคู่แฟนเดย์ • Accept")
            .setEmoji("💖")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`fd_lock_decline:${interaction.user.id}`)
            .setLabel("ปฏิเสธ • Decline")
            .setEmoji("✖️")
            .setStyle(ButtonStyle.Secondary)
        );

        await targetUser.send({ embeds: [inviteEmbed], components: [decisionRow] }).catch(() => {});
      }
    } catch (e) {
      console.warn("Error sending lock request DM:", e);
    }
  } catch (err: any) {
    console.error("Error in handleFandaySelectLockTarget:", err);
    await interaction.reply({
      content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      ephemeral: true,
    }).catch(() => {});
  }
}

/**
 * 💖 12. Handle fd_lock_accept & fd_lock_decline
 */
export async function handleFandayLockDecision(interaction: ButtonInteraction, proposerId: string, accepted: boolean) {
  try {
    const event = await getOrCreateActiveEvent(interaction.guildId || undefined);

    if (!accepted) {
      const declineEmbed = createFandayEmbed({
        title: "⚪ คุณได้ปฏิเสธคำขอล็อกคู่แล้ว",
        description: `ระบบได้ยกเลิกคำขอล็อกคู่จาก <@${proposerId}> เรียบร้อยแล้วครับ`,
        color: FANDAY_COLORS.surface,
      });
      await interaction.update({ embeds: [declineEmbed], components: [] });
      return;
    }

    // Both accepted: create pair
    await prisma.$transaction([
      prisma.fandayPlayer.upsert({
        where: { eventId_discordId: { eventId: event.id, discordId: proposerId } },
        update: { status: "LOCKED", hasPartner: true, lockedWithId: interaction.user.id },
        create: {
          eventId: event.id,
          discordId: proposerId,
          displayName: proposerId,
          status: "LOCKED",
          hasPartner: true,
          lockedWithId: interaction.user.id,
        },
      }),
      prisma.fandayPlayer.upsert({
        where: { eventId_discordId: { eventId: event.id, discordId: interaction.user.id } },
        update: {
          displayName: interaction.user.displayName || interaction.user.username,
          status: "LOCKED",
          hasPartner: true,
          lockedWithId: proposerId,
        },
        create: {
          eventId: event.id,
          discordId: interaction.user.id,
          displayName: interaction.user.displayName || interaction.user.username,
          status: "LOCKED",
          hasPartner: true,
          lockedWithId: proposerId,
        },
      }),
      prisma.fandayPair.create({
        data: {
          eventId: event.id,
          playerAId: proposerId,
          playerBId: interaction.user.id,
          source: "SELF_LOCK",
          compatibility: 100,
          reason: "ทั้งสองฝ่ายเลือกที่จะล็อกคู่ด้วยความยินยอมร่วมกัน (Self-Lock Pair)",
          status: "ACTIVE",
          lockedAt: new Date(),
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        action: "Fanday: Self-Lock Pair Confirmed",
        category: "FANDAY",
        details: `Pair confirmed between <@${proposerId}> and <@${interaction.user.id}> in ${event.title}`,
      },
    });

    const celebrationEmbed = createFandayEmbed({
      title: "💖 ยืนยันการล็อกคู่แฟนเดย์สำเร็จ!",
      description:
        `ยินดีด้วยครับ! คุณและ <@${proposerId}> ได้ยืนยันเป็น **คู่แฟนเดย์** ในกิจกรรม **${event.title}** เรียบร้อยแล้ว!\n\n` +
        `• **คู่ของคุณ:** <@${proposerId}>\n` +
        `• **สถานะ:** 🔒 \`ล็อกคู่สำเร็จ (Self-Lock Active)\`\n\n` +
        `ระบบได้นำคุณทั้งสองคนเข้าสู่สถานะคู่กิจกรรมแล้ว เมื่อถึงเวลาเริ่มกิจกรรม คุณจะสามารถร่วมสนุกกับมินิเกมและส่งจดหมายถึงกันได้ครับ!`,
      color: FANDAY_COLORS.pink,
    });

    await interaction.update({ embeds: [celebrationEmbed], components: [] });
    setTimeout(() => refreshFandayPanelLive(interaction.client), 1000);
  } catch (err: any) {
    console.error("Error in handleFandayLockDecision:", err);
  }
}

/**
 * 🚦 Centralized Router for all Fanday Interactions (`fd_*`)
 */
export async function handleFandayRouter(interaction: any) {
  const customId: string = interaction.customId || "";

  // 1. Buttons
  if (interaction.isButton()) {
    const btn = interaction as ButtonInteraction;
    if (customId === "fd_join") return handleFandayJoin(btn);
    if (customId === "fd_leave") return handleFandayLeave(btn);
    if (customId === "fd_leave_confirm") return handleFandayLeaveConfirm(btn);
    if (customId === "fd_rules") return handleFandayRules(btn);
    if (customId === "fd_myrole") return handleFandayMyRole(btn);
    if (customId === "fd_step_continue_single") return handleFandayStepSingle(btn);
    if (customId === "fd_step_lock_partner") return handleFandayStepLock(btn);
    if (customId === "fd_cancel_dismiss") {
      return btn.update({
        content: "⚪ ยกเลิกรายการเรียบร้อยแล้ว",
        embeds: [],
        components: [],
      });
    }
    if (customId.startsWith("fd_lock_accept:")) {
      const proposerId = customId.split(":")[1];
      return handleFandayLockDecision(btn, proposerId, true);
    }
    if (customId.startsWith("fd_lock_decline:")) {
      const proposerId = customId.split(":")[1];
      return handleFandayLockDecision(btn, proposerId, false);
    }
    if (customId.startsWith("fd_game_menu:")) {
      const pairId = customId.split(":")[1];
      return showGameMenu(btn, pairId);
    }
    if (customId.startsWith("fd_game_answer:")) {
      const parts = customId.split(":");
      const sessionId = parts[1];
      const answer = parts[2];
      return handleGameAnswer(btn, sessionId, answer);
    }
    if (customId.startsWith("fd_letter_write:")) {
      const pairId = customId.split(":")[1];
      return showLetterComposeModal(btn, pairId);
    }
  }

  // 2. String Select Menus
  if (interaction.isStringSelectMenu()) {
    const sel = interaction as StringSelectMenuInteraction;
    if (customId === "fd_select_gender") return handleFandaySelectGender(sel);
    if (customId === "fd_select_seeking") return handleFandaySelectSeeking(sel);
    if (customId.startsWith("fd_game_select:")) {
      const pairId = customId.split(":")[1];
      return launchMiniGame(sel, pairId, sel.values[0]);
    }
  }

  // 3. User Select Menus
  if (interaction.isUserSelectMenu()) {
    const userSel = interaction as UserSelectMenuInteraction;
    if (customId === "fd_select_lock_target") return handleFandaySelectLockTarget(userSel);
  }

  // 4. Modals
  if (interaction.isModalSubmit()) {
    const modal = interaction as ModalSubmitInteraction;
    if (customId === "fd_modal_questionnaire") return handleFandayModalQuestionnaire(modal);
    if (customId.startsWith("fd_modal_letter:")) {
      const pairId = customId.split(":")[1];
      return handleLetterSubmit(modal, pairId);
    }
  }
}
