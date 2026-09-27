import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";

export const adminCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("จัดการทีมแอดมิน")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("รายชื่อแอดมินทั้งหมด")
    )
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("ตรวจสอบข้อมูลแอดมิน")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("เลือกแอดมิน")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("setrole")
        .setDescription("กำหนดตำแหน่งแอดมิน")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("เลือกแอดมิน")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("role")
            .setDescription("ตำแหน่ง")
            .setRequired(true)
            .addChoices(
              { name: "Owner", value: "OWNER" },
              { name: "Manager", value: "MANAGER" },
              { name: "Admin", value: "ADMIN" },
              { name: "Moderator", value: "MODERATOR" }
            )
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      const admins = await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { role: "asc" },
        include: {
          _count: { select: { attendances: true, transactions: true } },
        },
      });

      if (admins.length === 0) {
        await interaction.editReply({ content: "ยังไม่มีแอดมินในระบบ" });
        return;
      }

      const lines = admins.map(
        (a) => `**${a.displayName || a.username}** — ${a.role} • ตอกบัตร: ${a._count.attendances} ครั้ง`
      );

      const embed = new EmbedBuilder()
        .setColor(0x2997ff)
        .setTitle(`รายชื่อแอดมิน (${admins.length} คน)`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: "LynnBot" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "info") {
      const targetUser = interaction.options.getUser("user", true);

      const admin = await prisma.user.findUnique({
        where: { discordId: targetUser.id },
        include: {
          _count: { select: { attendances: true, transactions: true } },
          attendances: {
            take: 1,
            orderBy: { clockIn: "desc" },
          },
        },
      });

      if (!admin) {
        await interaction.editReply({ content: "ไม่พบข้อมูลแอดมินในระบบ" });
        return;
      }

      const lastAtt = admin.attendances[0];
      const lastSeen = lastAtt
        ? `<t:${Math.floor(lastAtt.clockIn.getTime() / 1000)}:R>`
        : "ยังไม่มีประวัติ";

      const embed = new EmbedBuilder()
        .setColor(0x2997ff)
        .setAuthor({
          name: admin.displayName || admin.username,
          iconURL: targetUser.displayAvatarURL(),
        })
        .setTitle("ข้อมูลแอดมิน")
        .setDescription(
          `ตำแหน่ง: **${admin.role}** • ตอกบัตร: **${admin._count.attendances}** ครั้ง • ซื้อยศ: **${admin._count.transactions}** รายการ\nการตอกบัตรล่าสุด: ${lastSeen}`
        )
        .setFooter({ text: "LynnBot" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "setrole") {
      const targetUser = interaction.options.getUser("user", true);
      const newRole = interaction.options.getString("role", true) as any;

      let admin = await prisma.user.findUnique({
        where: { discordId: targetUser.id },
      });

      if (!admin) {
        admin = await prisma.user.create({
          data: {
            discordId: targetUser.id,
            username: targetUser.username,
            displayName: targetUser.displayName || targetUser.username,
            avatar: targetUser.displayAvatarURL(),
            role: newRole,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: admin.id },
          data: { role: newRole },
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x30d158)
        .setTitle("ปรับตำแหน่งสำเร็จ")
        .setDescription(`กำหนดให้ <@${targetUser.id}> เป็นตำแหน่ง **${newRole}** เรียบร้อยแล้ว`)
        .setFooter({ text: "LynnBot" });

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
