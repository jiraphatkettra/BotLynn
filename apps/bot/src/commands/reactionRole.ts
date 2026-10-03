import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import type { BotCommand } from "../index.js";

export const reactionRoleCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("จัดการระบบแจกยศอัตโนมัติเมื่อกด Reaction")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("สร้างข้อความและตั้งค่ายศที่ได้รับเมื่อกด Reaction")
        .addChannelOption((opt) =>
          opt.setName("channel").setDescription("ห้องที่จะส่งข้อความ").setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("ยศที่จะมอบให้").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("emoji").setDescription("อิโมจิที่ใช้กดรับยศ (เช่น 🎮, 📌)").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("message").setDescription("ข้อความคำอธิบาย (Optional)").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("ดูการตั้งค่า Reaction Role ทั้งหมด")
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("ลบการตั้งค่า Reaction Role")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Reaction Role ID").setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "setup") {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.options.getChannel("channel", true) as TextChannel;
      const role = interaction.options.getRole("role", true);
      const emoji = interaction.options.getString("emoji", true).trim();
      const customMsg = interaction.options.getString("message");

      if (!interaction.guild) {
        await interaction.editReply({ content: "❌ ใช้คำสั่งนี้ได้ในเซิร์ฟเวอร์เท่านั้น" });
        return;
      }

      // 1. Post message to target channel
      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.accent)
        .setTitle("🏷️  REACTION ROLE • กดเพื่อรับยศ")
        .setDescription(
          (customMsg ? `${customMsg}\n\n` : "") +
          `กด Reaction ${emoji} ด้านล่างข้อความนี้ เพื่อรับ/ยกเลิกยศ **${role.name}** (<@&${role.id}>) อัตโนมัติ`
        )
        .setFooter({ text: "LynnBot Operations System • Reaction Roles" })
        .setTimestamp();

      let msg;
      try {
        msg = await channel.send({ embeds: [embed] });
        await msg.react(emoji);
      } catch (err: any) {
        await interaction.editReply({
          content: `❌ บอทไม่สามารถส่งข้อความหรือใส่อิโมจิในห้อง <#${channel.id}> ได้: ${err.message}`,
        });
        return;
      }

      // 2. Save to database
      const record = await prisma.reactionRole.create({
        data: {
          guildId: interaction.guild.id,
          channelId: channel.id,
          messageId: msg.id,
          emoji,
          roleId: role.id,
          roleName: role.name,
        },
      });

      await interaction.editReply({
        content: `✅ ติดตั้ง Reaction Role เรียบร้อยแล้วใน <#${channel.id}> (ID: \`${record.id}\`)`,
      });
      return;
    }

    if (subcommand === "list") {
      await interaction.deferReply({ ephemeral: true });

      const list = await prisma.reactionRole.findMany({
        where: { guildId: interaction.guild?.id || "" },
        orderBy: { createdAt: "desc" },
      });

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.surface)
        .setTitle("📋  REACTION ROLES • รายการที่ตั้งค่าไว้")
        .setDescription(
          list.length === 0
            ? "⚪ ยังไม่มีการตั้งค่า Reaction Role ในเซิร์ฟเวอร์นี้"
            : list
                .map(
                  (r) =>
                    `• **${r.emoji}** → <@&${r.roleId}> (${r.roleName})\n  └ ห้อง: <#${r.channelId}> | ID: \`${r.id}\``
                )
                .join("\n\n")
        )
        .setFooter({ text: "LynnBot Operations System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "remove") {
      await interaction.deferReply({ ephemeral: true });
      const id = interaction.options.getString("id", true);

      try {
        await prisma.reactionRole.delete({ where: { id } });
        await interaction.editReply({ content: `✅ ลบการตั้งค่า Reaction Role (ID: \`${id}\`) เรียบร้อยแล้ว` });
      } catch {
        await interaction.editReply({ content: "❌ ไม่พบ Reaction Role ตาม ID ที่ระบุ" });
      }
      return;
    }
  },
};
