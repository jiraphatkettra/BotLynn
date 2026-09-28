import {
  type Interaction,
  type Collection,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { BotCommand } from "../index.js";
import {
  handleTicketCreate,
  handleTicketClaim,
  handleTicketClose,
} from "../services/ticketService.js";
import {
  handleAttendanceClockIn,
  handleAttendanceClockOut,
  handleAttendanceStatus,
  showLeaveRequestModal,
  handleLeaveModalSubmit,
  handleMyLeavesStatus,
  handleLeaveCancel,
  handleLeaveDecisionWithDM,
  handleShopBrowse,
  handleShopSelectRole,
  handleShopConfirmBuy,
  handleWalletBalance,
  handleWalletTopupInfo,
  showPromptPayModal,
  handlePromptPayModalSubmit,
  showTrueMoneyModal,
  handleTrueMoneyModalSubmit,
  handleAdminStaffList,
  handleAdminPendingLeaves,
  handleAdminBackupServer,
} from "../services/panelInteractionService.js";
import {
  handleSlipApproveClick,
  handleSlipRejectClick,
  handleSlipApproveModalSubmit,
  handleSlipRejectModalSubmit,
} from "../services/slipService.js";

export async function handleInteraction(
  interaction: Interaction,
  commands: Collection<string, BotCommand>
) {
  // 1. Handle Button Interactions
  if (interaction.isButton()) {
    const btn = interaction as ButtonInteraction;

    // Attendance Panel Buttons
    if (btn.customId === "panel_att_in") {
      await handleAttendanceClockIn(btn);
      return;
    }
    if (btn.customId === "panel_att_out") {
      await handleAttendanceClockOut(btn);
      return;
    }
    if (btn.customId === "panel_att_status") {
      await handleAttendanceStatus(btn);
      return;
    }

    // Leave Panel Buttons
    if (btn.customId === "panel_leave_request") {
      await showLeaveRequestModal(btn);
      return;
    }
    if (btn.customId === "panel_leave_status") {
      await handleMyLeavesStatus(btn);
      return;
    }
    if (btn.customId.startsWith("leave_cancel:")) {
      const leaveId = btn.customId.split(":")[1];
      await handleLeaveCancel(btn, leaveId);
      return;
    }
    if (btn.customId.startsWith("leave_approve:") || btn.customId.startsWith("leave_reject:")) {
      const isApprove = btn.customId.startsWith("leave_approve:");
      const leaveId = btn.customId.split(":")[1];
      await handleLeaveDecisionWithDM(btn, leaveId, isApprove);
      return;
    }

    // Shop & Wallet Panel Buttons
    if (btn.customId === "panel_shop_browse") {
      await handleShopBrowse(btn);
      return;
    }
    if (btn.customId.startsWith("shop_confirm_buy:")) {
      const roleId = btn.customId.split(":")[1];
      await handleShopConfirmBuy(btn, roleId);
      return;
    }
    if (btn.customId === "shop_cancel_checkout") {
      await btn.update({
        content: "⚪ ยกเลิกรายการสั่งซื้อเรียบร้อยแล้ว",
        embeds: [],
        components: [],
      });
      return;
    }
    if (btn.customId === "panel_wallet_balance") {
      await handleWalletBalance(btn);
      return;
    }
    if (btn.customId === "panel_wallet_topup") {
      await handleWalletTopupInfo(btn);
      return;
    }
    if (btn.customId === "panel_topup_qr") {
      await showPromptPayModal(btn);
      return;
    }
    if (btn.customId === "panel_topup_truemoney") {
      await showTrueMoneyModal(btn);
      return;
    }

    // Admin Hub Panel Buttons
    if (btn.customId === "panel_admin_staff") {
      await handleAdminStaffList(btn);
      return;
    }
    if (btn.customId === "panel_admin_leaves") {
      await handleAdminPendingLeaves(btn);
      return;
    }
    if (btn.customId === "panel_admin_backup") {
      await handleAdminBackupServer(btn);
      return;
    }

    // Ticket System Buttons
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

    // Slip Review Buttons
    if (btn.customId.startsWith("slip_approve_")) {
      const slipId = btn.customId.replace("slip_approve_", "");
      await handleSlipApproveClick(btn, slipId);
      return;
    }
    if (btn.customId.startsWith("slip_reject_")) {
      const slipId = btn.customId.replace("slip_reject_", "");
      await handleSlipRejectClick(btn, slipId);
      return;
    }

    return;
  }

  // 2. Handle String Select Menus (Dropdown)
  if (interaction.isStringSelectMenu()) {
    const select = interaction as StringSelectMenuInteraction;
    if (select.customId === "shop_select_role") {
      await handleShopSelectRole(select);
      return;
    }
    return;
  }

  // 3. Handle Modal Submits
  if (interaction.isModalSubmit()) {
    const modal = interaction as ModalSubmitInteraction;
    if (modal.customId === "modal_leave_request") {
      await handleLeaveModalSubmit(modal);
      return;
    }
    if (modal.customId === "modal_topup_promptpay") {
      await handlePromptPayModalSubmit(modal);
      return;
    }
    if (modal.customId === "modal_topup_truemoney") {
      await handleTrueMoneyModalSubmit(modal);
      return;
    }
    if (modal.customId.startsWith("modal_slip_approve_")) {
      const slipId = modal.customId.replace("modal_slip_approve_", "");
      await handleSlipApproveModalSubmit(modal, slipId);
      return;
    }
    if (modal.customId.startsWith("modal_slip_reject_")) {
      const slipId = modal.customId.replace("modal_slip_reject_", "");
      await handleSlipRejectModalSubmit(modal, slipId);
      return;
    }
    return;
  }

  // 4. Handle Autocomplete
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

  // 5. Handle Chat Input Commands
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
