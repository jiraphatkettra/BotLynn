import {
  type Interaction,
  type Collection,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import type { BotCommand } from "../index.js";
import {
  handleTicketCreate,
  handleTicketClaim,
  handleTicketClose,
} from "../services/ticketService.js";

export async function handleInteraction(
  interaction: Interaction,
  commands: Collection<string, BotCommand>
) {
  // Handle button interactions
  if (interaction.isButton()) {
    const btn = interaction as ButtonInteraction;
    if (btn.customId === "ticket_create") {
      await handleTicketCreate(btn);
      return;
    }
    if (btn.customId === "ticket_claim") {
      await handleTicketClaim(btn);
      return;
    }
    if (btn.customId === "ticket_close") {
      await handleTicketClose(btn);
      return;
    }
    if (btn.customId.startsWith("leave_approve:") || btn.customId.startsWith("leave_reject:")) {
      const isApprove = btn.customId.startsWith("leave_approve:");
      const leaveId = btn.customId.split(":")[1];

      try {
        const reviewer = await (await import("@lynnbot/database")).prisma.user.upsert({
          where: { discordId: btn.user.id },
          update: { username: btn.user.username },
          create: { discordId: btn.user.id, username: btn.user.username, role: "ADMIN" },
        });

        await (await import("@lynnbot/database")).prisma.leaveRequest.update({
          where: { id: leaveId },
          data: {
            status: isApprove ? "APPROVED" : "REJECTED",
            reviewedById: reviewer.id,
          },
        });

        await btn.reply({
          content: isApprove
            ? `✅ <@${btn.user.id}> ได้**อนุมัติ**คำขอลางานนี้เรียบร้อยแล้ว`
            : `❌ <@${btn.user.id}> ได้**ปฏิเสธ**คำขอลางานนี้`,
        });
      } catch (err: any) {
        await btn.reply({ content: `❌ เกิดข้อผิดพลาด: ${err.message}`, ephemeral: true });
      }
      return;
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (command && (command as any).autocomplete) {
      try {
        await (command as any).autocomplete(interaction);
      } catch (err) {
        console.error(`❌ Autocomplete error for ${interaction.commandName}:`, err);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.warn(`⚠️ Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);

    const errorMessage = "❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาลองใหม่อีกครั้ง";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: errorMessage,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}
