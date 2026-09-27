import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import {
  createGuildRoleBackup,
  restoreGuildRoleBackup,
} from "../services/backupService.js";

export const backupCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("backup-roles")
    .setDescription("สำรองข้อมูลยศทั้งหมดในเซิร์ฟเวอร์ (Auto Role Backup)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    try {
      const backup = await createGuildRoleBackup(
        interaction.guild,
        interaction.user.username
      );

      const embed = new EmbedBuilder()
        .setColor(0x34c759)
        .setTitle("💾 สำรองข้อมูลยศสำเร็จเรียบร้อย")
        .setDescription(
          `ระบบได้ทำการบันทึกโครงสร้างยศและการถือครองยศของสมาชิกทั้งหมดลงในฐานข้อมูลเรียบร้อยแล้ว`
        )
        .addFields(
          {
            name: "🏷️ ชื่อจุดสำรอง",
            value: backup.name,
            inline: false,
          },
          {
            name: "📋 จำนวนยศที่บันทึก",
            value: `${backup.totalRoles} ยศ`,
            inline: true,
          },
          {
            name: "👥 สมาชิกที่มีการบันทึกยศ",
            value: `${backup.totalMembers} คน`,
            inline: true,
          },
          {
            name: "🛡️ ผู้ดำเนินการ",
            value: `<@${interaction.user.id}>`,
            inline: true,
          }
        )
        .setFooter({
          text: "LynnBot Security • สามารถกู้คืนได้ทุกเมื่อผ่าน Web Dashboard หรือคำสั่ง /restore-roles",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error("Error creating backup:", error);
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาดในการสำรองข้อมูล: ${error.message}`,
      });
    }
  },
};

export const restoreCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("restore-roles")
    .setDescription("กู้คืนยศจากจุดสำรองข้อมูล (Role Restore)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("backup_id")
        .setDescription("ID ของจุดสำรอง (ถ้าไม่ระบุ จะแสดงรายการให้เลือก)")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    try {
      const backupId = interaction.options.getString("backup_id");

      if (backupId) {
        const result = await restoreGuildRoleBackup(
          interaction.guild,
          backupId
        );

        const embed = new EmbedBuilder()
          .setColor(0x34c759)
          .setTitle("🔄 กู้คืนยศสำเร็จแล้ว")
          .setDescription(
            `กู้คืนยศจาก **${result.backupName}** สำเร็จ\n• สร้างยศใหม่ที่หายไป: ${result.rolesRecreated} ยศ\n• คืนยศให้สมาชิก: ${result.membersRestored} คน`
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // If no ID provided, list recent 5 backups
      const recentBackups = await prisma.roleBackup.findMany({
        where: { guildId: interaction.guild.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (recentBackups.length === 0) {
        await interaction.editReply({
          content:
            "⚠️ ยังไม่มีจุดสำรองข้อมูลยศในเซิร์ฟเวอร์นี้ ใช้คำสั่ง `/backup-roles` เพื่อสร้างจุดสำรองก่อน",
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle("🔄 เลือกจุดสำรองยศที่ต้องการกู้คืน")
        .setDescription(
          `พบจุดสำรองล่าสุด ${recentBackups.length} รายการ กรุณาคัดลอก ID แล้วรัน \`/restore-roles backup_id:รหัส\` หรือเข้ากู้คืนผ่านปุ่มเดียวใน Web Dashboard (/backups):\n\n` +
            recentBackups
              .map(
                (b, i) =>
                  `**${i + 1}. ${b.name}**\n` +
                  `ID: \`${b.id}\`\n` +
                  `ยศ: ${b.totalRoles} | สมาชิก: ${b.totalMembers} คน | ผู้สร้าง: ${b.createdBy}\n`
              )
              .join("\n")
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาดในการกู้คืน: ${error.message}`,
      });
    }
  },
};
