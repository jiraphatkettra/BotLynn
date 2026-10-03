import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import type { BotCommand } from "../index.js";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "🟢 ต่ำ (Low)",
  MEDIUM: "🔵 ปานกลาง (Medium)",
  HIGH: "🟠 สูง (High)",
  URGENT: "🔴 เร่งด่วน (Urgent)",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "⚪ รอดำเนินการ",
  IN_PROGRESS: "🟡 กำลังทำ",
  DONE: "✅ เสร็จสิ้น",
  CANCELLED: "❌ ยกเลิก",
};

export const taskCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("task")
    .setDescription("ระบบมอบหมายและติดตามงานทีมงาน (Task Management)")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("สร้างและมอบหมายงานใหม่")
        .addStringOption((opt) =>
          opt.setName("title").setDescription("ชื่องานหรือหัวข้อ").setRequired(true)
        )
        .addUserOption((opt) =>
          opt.setName("assignee").setDescription("ผู้รับผิดชอบงาน").setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("priority")
            .setDescription("ระดับความสำคัญ")
            .setRequired(false)
            .addChoices(
              { name: "🟢 ต่ำ (Low)", value: "LOW" },
              { name: "🔵 ปานกลาง (Medium)", value: "MEDIUM" },
              { name: "🟠 สูง (High)", value: "HIGH" },
              { name: "🔴 เร่งด่วน (Urgent)", value: "URGENT" }
            )
        )
        .addStringOption((opt) =>
          opt.setName("description").setDescription("รายละเอียดของงาน").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("ดูรายการงานที่ได้รับมอบหมาย")
        .addStringOption((opt) =>
          opt
            .setName("filter")
            .setDescription("ตัวกรอง")
            .setRequired(false)
            .addChoices(
              { name: "งานของฉัน (Mine)", value: "mine" },
              { name: "งานทั้งหมด (All)", value: "all" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("done")
        .setDescription("ทำเครื่องหมายงานว่าเสร็จสิ้นแล้ว")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Task ID").setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const subcommand = interaction.options.getSubcommand();

    // Ensure executor exists in database
    const creator = await prisma.user.upsert({
      where: { discordId: interaction.user.id },
      update: { username: interaction.user.username },
      create: {
        discordId: interaction.user.id,
        username: interaction.user.username,
        role: "ADMIN",
      },
    });

    if (subcommand === "create") {
      const title = interaction.options.getString("title", true);
      const targetUser = interaction.options.getUser("assignee");
      const priority = interaction.options.getString("priority") || "MEDIUM";
      const description = interaction.options.getString("description");

      let assigneeUserId: string | null = null;
      if (targetUser) {
        const assignedDbUser = await prisma.user.upsert({
          where: { discordId: targetUser.id },
          update: { username: targetUser.username },
          create: {
            discordId: targetUser.id,
            username: targetUser.username,
            role: "ADMIN",
          },
        });
        assigneeUserId = assignedDbUser.id;
      }

      const newTask = await prisma.task.create({
        data: {
          title,
          description,
          priority,
          status: "TODO",
          assignedById: creator.id,
          assigneeId: assigneeUserId,
        },
        include: {
          assignee: true,
          assignedBy: true,
        },
      });

      // Send DM notification to assignee if assigned
      if (targetUser && !targetUser.bot) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(THEME_COLORS.surface)
            .setTitle("📋 คุณได้รับมอบหมายงานใหม่!")
            .setDescription(
              `**หัวข้อ:** ${title}\n` +
              (description ? `**รายละเอียด:** ${description}\n` : "") +
              `**ระดับความสำคัญ:** ${PRIORITY_LABELS[priority] || priority}\n` +
              `**ผู้มอบหมาย:** <@${interaction.user.id}>\n\n` +
              `> เมื่อทำเสร็จแล้วพิมพ์ \`/task done ${newTask.id}\``
            )
            .setFooter({ text: "LynnBot Task Management" })
            .setTimestamp();
          await targetUser.send({ embeds: [dmEmbed] });
        } catch {
          // Ignore DM block
        }
      }

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.success)
        .setTitle("✅ มอบหมายงานสำเร็จ")
        .setDescription(
          `**ชื่องาน:** ${title}\n` +
          `**ความสำคัญ:** ${PRIORITY_LABELS[priority] || priority}\n` +
          `**ผู้รับผิดชอบ:** ${targetUser ? `<@${targetUser.id}>` : "ยังไม่ระบุ"}\n` +
          `**Task ID:** \`${newTask.id}\``
        )
        .setFooter({ text: "LynnBot Operations System • Tasks" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "list") {
      const filter = interaction.options.getString("filter") || "mine";

      const whereClause: any = {
        status: { in: ["TODO", "IN_PROGRESS"] },
      };

      if (filter === "mine") {
        whereClause.assigneeId = creator.id;
      }

      const tasks = await prisma.task.findMany({
        where: whereClause,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 10,
        include: { assignee: true, assignedBy: true },
      });

      if (tasks.length === 0) {
        await interaction.editReply({
          content: filter === "mine" ? "✨ คุณไม่มีงานค้างอยู่ในขณะนี้!" : "✨ ไม่มีงานที่ค้างอยู่ในระบบ",
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.surface)
        .setTitle(filter === "mine" ? "📋 งานที่มอบหมายถึงคุณ" : "📋 งานที่กำลังดำเนินการทั้งหมด")
        .setDescription(
          tasks
            .map(
              (t, i) =>
                `**${i + 1}. ${t.title}**\n` +
                `• สถานะ: ${STATUS_LABELS[t.status] || t.status} | ความสำคัญ: ${PRIORITY_LABELS[t.priority] || t.priority}\n` +
                `• ผู้รับผิดชอบ: ${t.assignee ? `<@${t.assignee.discordId}>` : "ยังไม่ระบุ"} | มอบหมายโดย: <@${t.assignedBy.discordId}>\n` +
                `• รหัส: \`${t.id}\``
            )
            .join("\n\n")
        )
        .setFooter({ text: "ใช้ /task done <id> เมื่อทำงานเสร็จสิ้น" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "done") {
      const taskId = interaction.options.getString("id", true);

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { assignedBy: true, assignee: true },
      });

      if (!task) {
        await interaction.editReply({ content: "❌ ไม่พบงานที่ระบุ" });
        return;
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "DONE",
          completedAt: new Date(),
        },
      });

      // Notify task assigner if available
      if (task.assignedBy?.discordId && task.assignedBy.discordId !== interaction.user.id) {
        try {
          const assigner = await interaction.client.users.fetch(task.assignedBy.discordId);
          if (assigner) {
            const doneEmbed = new EmbedBuilder()
              .setColor(THEME_COLORS.success)
              .setTitle("🎉 งานเสร็จสิ้นแล้ว!")
              .setDescription(
                `งาน **"${task.title}"** ถูกทำเครื่องหมายว่าเสร็จสิ้นแล้วโดย <@${interaction.user.id}>\n\n` +
                `> Task ID: \`${task.id}\``
              )
              .setFooter({ text: "LynnBot Task Management" })
              .setTimestamp();
            await assigner.send({ embeds: [doneEmbed] });
          }
        } catch {}
      }

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.success)
        .setTitle("✅ บันทึกงานสำเร็จแล้ว")
        .setDescription(`งาน **"${task.title}"** ถูกบันทึกว่าเสร็จสิ้นเรียบร้อยแล้ว ✨`)
        .setFooter({ text: `Task ID: ${task.id}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  },
};
