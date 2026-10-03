import { type Message } from "discord.js";
import { prisma } from "@lynnbot/database";
import { recordIncomingSlip } from "../services/slipService.js";
import { processAutoMod } from "../services/automodService.js";

/**
 * Handles incoming messages to automatically detect slips/images in tickets or submission channels
 */
export async function handleMessageCreate(message: Message) {
  // Ignore bot messages or DMs
  if (message.author.bot || !message.guild) return;

  // Process Auto-Moderation first
  const wasModerated = await processAutoMod(message);
  if (wasModerated) return;

  // Check if message has attachments
  if (message.attachments.size === 0) return;

  try {
    // Check if this channel is an active ticket channel
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: message.channelId },
    });

    const isTicket = !!ticket;
    const channelName =
      "name" in message.channel && typeof message.channel.name === "string"
        ? message.channel.name
        : "";
    const isTicketChannelName =
      channelName.startsWith("🎫") || channelName.includes("ticket");

    if (isTicket || isTicketChannelName) {
      for (const attachment of message.attachments.values()) {
        const isImage =
          attachment.contentType?.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif)$/i.test(attachment.name);

        if (isImage) {
          // Attempt to extract numeric amount from message content if provided (e.g. "100" or "โอนแล้ว 250")
          let detectedAmount: number | null = null;
          const match = message.content.match(/\b(\d+(?:\.\d{1,2})?)\b/);
          if (match) {
            const val = parseFloat(match[1]);
            if (!isNaN(val) && val > 0 && val < 1000000) {
              detectedAmount = val;
            }
          }

          const slip = await recordIncomingSlip({
            guild: message.guild,
            channelId: message.channelId,
            author: message.author,
            attachment,
            ticketId: ticket?.ticketId,
            amount: detectedAmount,
          });

          if (slip) {
            try {
              await message.react("🧾");
              await message.react("⏳");
            } catch (rErr) {
              // Missing reaction permission, ignore
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error in handleMessageCreate:", err);
  }
}
