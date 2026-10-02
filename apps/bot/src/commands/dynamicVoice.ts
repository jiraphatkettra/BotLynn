import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  CategoryChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import {
  seedDynamicVoiceChannels,
  DEFAULT_TALK_EMOJIS,
  DEFAULT_GAME_EMOJI,
} from "../services/dynamicVoiceService.js";

export const dynamicVoiceCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("dynamic-voice")
    .setDescription("จัดการระบบห้องเสียงไดนามิก ขยายและยุบห้องอัตโนมัติ (Auto Voice Pool)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("เปิดใช้งานและตั้งค่าโซนห้องเสียงไดนามิกในหมวดหมู่ที่เลือก")
        .addChannelOption((opt) =>
          opt
            .setName("category")
            .setDescription("หมวดหมู่ (Category) ที่ต้องการให้บอทดูแล")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("zone_type")
            .setDescription("เลือกประเภทโซนห้องเสียง")
            .setRequired(true)
            .addChoices(
              { name: "🎮 Gaming Zone (เล่นเกม • จำกัด 5 คน)", value: "GAMING" },
              { name: "☕ Living Zone (พูดคุย • จำกัด 10 คน)", value: "LIVING" }
            )
        )
        .addIntegerOption((opt) =>
          opt
            .setName("min_rooms")
            .setDescription("จำนวนห้องขั้นต่ำที่ต้องการคงไว้ (ค่าเริ่มต้น: 5 ห้อง)")
            .setMinValue(2)
            .setMaxValue(20)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("sync")
        .setDescription("ตรวจสอบและสร้างห้องเริ่มต้นให้ครบตามแพทเทิร์น 01-05")
        .addChannelOption((opt) =>
          opt
            .setName("category")
            .setDescription("หมวดหมู่ที่ต้องการซิงค์ห้องเริ่มต้น")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("ดูสถานะและรายการโซนห้องเสียงไดนามิกทั้งหมดในเซิร์ฟเวอร์")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    if (!guild) return;

    if (sub === "setup") {
      await interaction.deferReply({ ephemeral: true });

      const category = interaction.options.getChannel("category") as CategoryChannel;
      const zoneType = interaction.options.getString("zone_type");
      const minRooms = interaction.options.getInteger("min_rooms") || 5;

      const isGaming = zoneType === "GAMING";
      const zoneName = isGaming ? "เล่นเกม" : "พูดคุย";
      const userLimit = isGaming ? 5 : 10;
      const emojis = isGaming
        ? DEFAULT_GAME_EMOJI
        : DEFAULT_TALK_EMOJIS.join(",");

      const config = await prisma.dynamicVoiceConfig.upsert({
        where: { categoryId: category.id },
        update: {
          categoryName: category.name,
          zoneName,
          userLimit,
          minChannels: minRooms,
          spareChannels: 1,
          emojis,
          isEnabled: true,
        },
        create: {
          guildId: guild.id,
          categoryId: category.id,
          categoryName: category.name,
          zoneName,
          userLimit,
          minChannels: minRooms,
          spareChannels: 1,
          emojis,
          isEnabled: true,
        },
      });

      // Seed initial rooms
      await seedDynamicVoiceChannels(guild, category.id);

      const embed = new EmbedBuilder()
        .setColor(0x30d158)
        .setTitle("✅ เปิดใช้งานระบบห้องเสียงไดนามิกสำเร็จ")
        .setDescription(
          `บอทได้ผูกหมวดหมู่ **${category.name}** เข้ากับระบบ Auto-Expanding Voice เรียบร้อยแล้ว!\n\n` +
          `• **ชื่อแพทเทิร์น:** \`[╭ ┆ ╰] ㆍ ${zoneName}ㆍ[01..] ㆍ [Emoji] ⁺\`\n` +
          `• **จำกัดจำนวนคน:** ${userLimit} คน/ห้อง\n` +
          `• **ห้องขั้นต่ำ:** ${minRooms} ห้อง\n` +
          `• **การทำงาน:** เมื่อห้องว่างเหลือน้อยกว่า 1 ห้อง บอทจะแตกห้องใหม่ให้อัตโนมัติ และเมื่อไม่มีคนใช้จะลบคืนรูปทรงเดิมให้ทันที`
        )
        .setFooter({ text: "LynnBot Dynamic Voice Engine" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "sync") {
      await interaction.deferReply({ ephemeral: true });
      const category = interaction.options.getChannel("category") as CategoryChannel;

      const config = await prisma.dynamicVoiceConfig.findUnique({
        where: { categoryId: category.id },
      });

      if (!config) {
        await interaction.editReply({
          content: `❌ หมวดหมู่นี้ยังไม่ได้ตั้งค่า Dynamic Voice กรุณาใช้คำสั่ง \`/dynamic-voice setup\` ก่อน`,
        });
        return;
      }

      await seedDynamicVoiceChannels(guild, category.id);

      await interaction.editReply({
        content: `✅ ซิงค์และตรวจสอบห้องเริ่มต้นในหมวดหมู่ **${category.name}** เรียบร้อยแล้ว!`,
      });
      return;
    }

    if (sub === "status") {
      await interaction.deferReply({ ephemeral: true });

      const configs = await prisma.dynamicVoiceConfig.findMany({
        where: { guildId: guild.id },
      });

      if (configs.length === 0) {
        await interaction.editReply({
          content: "ℹ️ ยังไม่มีการตั้งค่าหมวดหมู่ Dynamic Voice ในเซิร์ฟเวอร์นี้ ใช้คำสั่ง `/dynamic-voice setup` เพื่อเริ่มใช้งาน",
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x0a84ff)
        .setTitle("🎙️ สถานะหมวดหมู่ Dynamic Voice ในเซิร์ฟเวอร์")
        .setDescription(
          configs
            .map((c, i) => {
              const cat = guild.channels.cache.get(c.categoryId);
              const catName = cat?.name || c.categoryName || c.categoryId;
              return (
                `**${i + 1}. ${catName}**\n` +
                `> • โซน: \`${c.zoneName}\` | จำกัด: \`${c.userLimit} คน\`\n` +
                `> • ห้องขั้นต่ำ: \`${c.minChannels}\` ห้อง | สถานะ: ${c.isEnabled ? "🟢 เปิดใช้งาน" : "🔴 ปิด"}\n`
              );
            })
            .join("\n")
        )
        .setFooter({ text: "LynnBot Dynamic Voice Engine" });

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
