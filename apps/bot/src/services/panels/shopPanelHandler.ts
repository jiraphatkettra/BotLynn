import {
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../../utils/theme.js";
import { ensureUser } from "./common.js";

/**
 * ============================================================================
 * SHOP PANEL HANDLERS
 * ============================================================================
 */
export async function handleShopBrowse(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const roles = await prisma.shopRole.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 25,
  });

  if (roles.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.warning)
      .setTitle("🛒  SERVER SHOP • ร้านค้ายศ")
      .setDescription("ขณะนี้ยังไม่มียศเปิดจำหน่ายในระบบ")
      .setFooter({ text: "LynnBot Operations System" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const selectOptions = roles.map((r) => ({
    label: `${r.name} — ฿${r.price.toLocaleString("th-TH")}`,
    description: (r.description?.slice(0, 50) || "สิทธิพิเศษประจำยศ") + (r.stock !== null ? ` (เหลือ ${r.stock})` : ""),
    value: r.id,
    emoji: "🏷️",
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("shop_select_role")
    .setPlaceholder("คลิกเลือกยศที่ต้องการสั่งซื้อ (Select a Role)...")
    .addOptions(selectOptions);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("🛒  AVAILABLE ROLES • รายการยศที่เปิดจำหน่าย")
    .setDescription(
      `พบยศที่เปิดจำหน่ายทั้งหมด **${roles.length} รายการ**\n` +
      `กรุณาคลิกเลือกยศจากเมนูด้านล่าง เพื่อดูข้อมูลและยืนยันการสั่งซื้อ\n\n` +
      "> ระบบจะตรวจสอบยอดเงินในกระเป๋าของคุณก่อนยืนยันการชำระเงิน"
    )
    .setFooter({ text: "LynnBot Operations System • Role Shop" });

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleShopSelectRole(interaction: StringSelectMenuInteraction) {
  await interaction.deferUpdate();

  const roleId = interaction.values[0];
  const user = await ensureUser(interaction.user);

  const shopRole = await prisma.shopRole.findUnique({
    where: { id: roleId },
  });

  if (!shopRole || !shopRole.isActive) {
    await interaction.editReply({
      content: "❌ ไม่พบยศดังกล่าว หรือยศนี้ถูกปิดจำหน่ายแล้ว",
      embeds: [],
      components: [],
    });
    return;
  }

  const hasEnough = user.balance >= shopRole.price;
  const balanceAfter = user.balance - shopRole.price;

  const embed = new EmbedBuilder()
    .setColor(hasEnough ? THEME_COLORS.accent : THEME_COLORS.warning)
    .setTitle("💳  ORDER CHECKOUT • สรุปรายการสั่งซื้อยศ")
    .setDescription(
      `คุณได้เลือกยศ: **${shopRole.name}**\n\n` +
      `• **ราคายศ:** ฿${shopRole.price.toLocaleString("th-TH")}\n` +
      `• **ยอดเงินปัจจุบันของคุณ:** ฿${user.balance.toLocaleString("th-TH")}\n` +
      `• **ยอดคงเหลือหลังชำระเงิน:** ฿${balanceAfter.toLocaleString("th-TH")}\n` +
      (shopRole.description ? `• **รายละเอียดสิทธิ์:** ${shopRole.description}\n\n` : "\n") +
      (hasEnough
        ? `> ระบบจะทำการหักยอดเงินและมอบยศ Discord ให้อัตโนมัติทันทีหลังยืนยัน\n\n`
        : `> ⚠️ **ยอดเงินของคุณไม่เพียงพอ** กรุณาเติมเงินเข้าระบบก่อนทำรายการสั่งซื้อ\n\n`) +
      `-# กรุณากดยืนยันเพื่อชำระเงิน หรือกดยกเลิกเพื่อเปลี่ยนรายการ`
    )
    .setFooter({ text: "LynnBot Operations System • Checkout Confirmation" });

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>();

  if (hasEnough) {
    buttonsRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_confirm_buy:${shopRole.id}`)
        .setLabel("ยืนยันการสั่งซื้อ • Confirm Buy")
        .setEmoji("💳")
        .setStyle(ButtonStyle.Success)
    );
  } else {
    buttonsRow.addComponents(
      new ButtonBuilder()
        .setCustomId("panel_wallet_topup")
        .setLabel("วิธีเติมเงิน • Top Up")
        .setEmoji("💸")
        .setStyle(ButtonStyle.Primary)
    );
  }

  buttonsRow.addComponents(
    new ButtonBuilder()
      .setCustomId("shop_cancel_checkout")
      .setLabel("ยกเลิก • Cancel")
      .setEmoji("✕")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [embed], components: [buttonsRow] });
}

export async function handleShopConfirmBuy(interaction: ButtonInteraction, roleId: string) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const shopRole = await prisma.shopRole.findUnique({
    where: { id: roleId },
  });

  if (!shopRole || !shopRole.isActive) {
    await interaction.editReply({ content: "❌ ไม่พบยศดังกล่าว หรือยศนี้ถูกปิดจำหน่ายแล้ว" });
    return;
  }

  if (user.balance < shopRole.price) {
    await interaction.editReply({
      content: `❌ ยอดเงินของคุณไม่เพียงพอ (ต้องการ ฿${shopRole.price} แต่มี ฿${user.balance})`,
    });
    return;
  }

  // Deduct balance and record transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: shopRole.price } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        roleId: shopRole.id,
        price: shopRole.price,
        status: "COMPLETED",
        note: "สั่งซื้อผ่าน Interactive Panel",
      },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: user.id,
        amount: -shopRole.price,
        type: "PURCHASE",
        note: `สั่งซื้อยศ ${shopRole.name}`,
        createdBy: "SYSTEM",
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ซื้อยศ (Panel)",
        category: "SHOP",
        details: `${user.displayName || user.username} ซื้อยศ ${shopRole.name} ราคา ฿${shopRole.price}`,
      },
    }),
  ]);

  // Assign Discord Role
  let roleAssigned = false;
  if (interaction.guild && interaction.member) {
    try {
      const member = interaction.member as GuildMember;
      await member.roles.add(shopRole.discordRoleId);
      roleAssigned = true;
    } catch (roleErr) {
      console.error("Failed to assign role to member:", roleErr);
    }
  }

  // Notify log channel if set
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "shop_notify_channel" } });
    if (setting?.value && interaction.guild) {
      const logChannel = interaction.guild.channels.cache.get(setting.value) as TextChannel | undefined;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.accent)
          .setTitle("🎉  NEW SHOP PURCHASE • มีการสั่งซื้อยศใหม่")
          .setDescription(
            `<@${interaction.user.id}> ได้สั่งซื้อยศ **${shopRole.name}**\n` +
            `• ราคา: ฿${shopRole.price.toLocaleString("th-TH")}\n` +
            `• วันที่ทำรายการ: <t:${Math.floor(Date.now() / 1000)}:f>`
          )
          .setFooter({ text: "LynnBot Shop System" })
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    console.error("Shop log notify error:", err);
  }

  const receiptEmbed = new EmbedBuilder()
    .setColor(THEME_COLORS.success)
    .setTitle("🎉  PURCHASE SUCCESSFUL • สั่งซื้อยศสำเร็จ")
    .setDescription(
      `ขอบคุณสำหรับการสนับสนุนเซิร์ฟเวอร์!\n\n` +
      `• **ยศที่ได้รับ:** **${shopRole.name}** (<@&${shopRole.discordRoleId}>)\n` +
      `• **หักยอดเงิน:** ฿${shopRole.price.toLocaleString("th-TH")}\n` +
      `• **ยอดเงินคงเหลือ:** ฿${(user.balance - shopRole.price).toLocaleString("th-TH")}\n\n` +
      (roleAssigned
        ? `> ระบบได้ทำการมอบยศ Discord ให้กับคุณเรียบร้อยแล้ว\n\n`
        : `> ⚠️ ไม่สามารถมอบยศ Discord ได้อัตโนมัติ (กรุณาแจ้งแอดมินเพื่อรับยศ)\n\n`) +
      `-# LynnBot Operations System • ขอให้สนุกกับการใช้งานเซิร์ฟเวอร์ครับ`
    )
    .setFooter({ text: "LynnBot Operations System • Purchase Receipt" })
    .setTimestamp();

  await interaction.editReply({ embeds: [receiptEmbed] });
}
