import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";

export const buyCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("สั่งซื้อยศ")
    .addStringOption((option) =>
      option
        .setName("role")
        .setDescription("ชื่อยศที่ต้องการซื้อ")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: any) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const roles = await prisma.shopRole.findMany({
        where: { isActive: true },
        take: 25,
      });

      const filtered = roles.filter(
        (r) =>
          r.name.toLowerCase().includes(focusedValue) ||
          r.discordRoleId.includes(focusedValue)
      );

      await interaction.respond(
        filtered.map((r) => ({
          name: `${r.name} — ฿${r.price}${r.stock !== null ? ` (เหลือ ${r.stock})` : ""}`,
          value: r.name,
        }))
      );
    } catch (e) {
      console.error("Autocomplete error:", e);
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const roleName = interaction.options.getString("role", true);
    const discordId = interaction.user.id;

    let user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId,
          username: interaction.user.username,
          displayName:
            interaction.user.displayName || interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
        },
      });
    }

    const shopRole = await prisma.shopRole.findFirst({
      where: {
        name: { equals: roleName, mode: "insensitive" },
        isActive: true,
      },
    });

    if (!shopRole) {
      const embed = new EmbedBuilder()
        .setColor(0xff453a)
        .setTitle("ไม่พบยศที่ระบุ")
        .setDescription(`ไม่พบยศ "${roleName}" ตรวจสอบรายการยศด้วยคำสั่ง \`/shop\``)
        .setFooter({ text: "LynnBot" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (shopRole.stock !== null && shopRole.stock <= 0) {
      const embed = new EmbedBuilder()
        .setColor(0xff453a)
        .setTitle("ยศหมดแล้ว")
        .setDescription(`ยศ "${shopRole.name}" ไม่มีจำนวนคงเหลือในระบบ`)
        .setFooter({ text: "LynnBot" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const existingPurchases = await prisma.transaction.count({
      where: {
        userId: user.id,
        roleId: shopRole.id,
        status: "COMPLETED",
      },
    });

    if (existingPurchases >= shopRole.maxPerUser) {
      const embed = new EmbedBuilder()
        .setColor(0xff453a)
        .setTitle("ไม่สามารถซื้อซ้ำได้")
        .setDescription(`คุณครอบครองยศ "${shopRole.name}" ครบโควต้าแล้ว (${shopRole.maxPerUser} ครั้ง)`)
        .setFooter({ text: "LynnBot" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        roleId: shopRole.id,
        price: shopRole.price,
        status: "COMPLETED",
      },
    });

    if (shopRole.stock !== null) {
      await prisma.shopRole.update({
        where: { id: shopRole.id },
        data: { stock: shopRole.stock - 1 },
      });
    }

    try {
      const guild = interaction.guild;
      if (guild) {
        const member = await guild.members.fetch(discordId);
        await member.roles.add(shopRole.discordRoleId);
      }
    } catch (error) {
      console.error("Failed to add Discord role:", error);
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ซื้อยศ",
        category: "SHOP",
        details: `${user.displayName || user.username} ซื้อยศ "${shopRole.name}" ราคา ${shopRole.price}`,
        metadata: {
          roleId: shopRole.id,
          roleName: shopRole.name,
          price: shopRole.price,
          transactionId: transaction.id,
        },
      },
    });

    // Send notification to designated channel if configured
    try {
      const notifySetting = await prisma.setting.findUnique({
        where: { key: "shop_notify_channel" },
      });

      if (notifySetting?.value && interaction.guild) {
        const channel = await interaction.guild.channels
          .fetch(notifySetting.value)
          .catch(() => null);
        if (channel && channel.isTextBased()) {
          const notifyEmbed = new EmbedBuilder()
            .setColor(0x30d158)
            .setAuthor({
              name: interaction.user.displayName || interaction.user.username,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTitle("มีการสั่งซื้อยศใหม่")
            .setDescription(
              `สมาชิก: <@${interaction.user.id}>\nยศที่ได้รับ: **${shopRole.name}**\nราคา: ฿${shopRole.price.toLocaleString("th-TH")} • อ้างอิง: \`${transaction.id.slice(-8)}\``
            )
            .setFooter({ text: "LynnBot Shop Notification" })
            .setTimestamp();

          await channel.send({ embeds: [notifyEmbed] }).catch(() => null);
        }
      }
    } catch (err) {
      console.warn("Could not send purchase notification:", err);
    }

    const embed = new EmbedBuilder()
      .setColor(0x30d158)
      .setTitle("ซื้อยศสำเร็จ")
      .setDescription(
        `คุณได้รับยศ **${shopRole.name}** เรียบร้อยแล้ว\nราคา: ฿${shopRole.price.toLocaleString("th-TH")} • อ้างอิง: \`${transaction.id.slice(-8)}\``
      )
      .setFooter({ text: "LynnBot" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
