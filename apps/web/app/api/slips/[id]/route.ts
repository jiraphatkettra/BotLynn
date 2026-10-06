import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

// Helper to notify Discord (either channel or DM)
async function notifyDiscordUser(
  token: string,
  discordId: string,
  channelId: string | null,
  embed: any
) {
  try {
    let sent = false;

    // 1. Try sending to ticket/submission channel if present
    if (channelId) {
      const channelRes = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: `<@${discordId}>`,
            embeds: [embed],
          }),
        }
      );
      if (channelRes.ok) sent = true;
    }

    // 2. If not sent to channel or no channel, attempt Direct Message
    if (!sent && discordId) {
      const dmRes = await fetch(
        "https://discord.com/api/v10/users/@me/channels",
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient_id: discordId }),
        }
      );

      if (dmRes.ok) {
        const dmData = await dmRes.json();
        await fetch(
          `https://discord.com/api/v10/channels/${dmData.id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ embeds: [embed] }),
          }
        );
      }
    }
  } catch (err) {
    console.error("Failed to send Discord notification for slip:", err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json();
  const { action, amount, note } = body;

  try {
    const slip = await prisma.slip.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!slip) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสลิปนี้" }, { status: 404 });
    }

    if (slip.status !== "PENDING") {
      return NextResponse.json(
        { error: "สลิปนี้ถูกตรวจสอบไปแล้วโดยแอดมินท่านอื่น" },
        { status: 409 }
      );
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (!reviewer) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ตรวจสอบ" }, { status: 403 });
    }

    const token = process.env.DISCORD_TOKEN;

    if (action === "approve") {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: "กรุณาระบุจำนวนเงินเป็นตัวเลขที่ถูกต้อง (> 0)" },
          { status: 400 }
        );
      }
      if (parsedAmount > 10_000_000) {
        return NextResponse.json(
          { error: "จำนวนเงินเกินขีดจำกัดที่อนุญาต (สูงสุดไม่เกิน 10,000,000)" },
          { status: 400 }
        );
      }

      // Ensure submitter user exists
      let targetUserId = slip.userId;
      if (!targetUserId) {
        const u = await prisma.user.upsert({
          where: { discordId: slip.discordId },
          update: { username: slip.discordName },
          create: {
            discordId: slip.discordId,
            username: slip.discordName,
            displayName: slip.discordName,
            role: "ADMIN",
          },
        });
        targetUserId = u.id;
      }

      await prisma.$transaction([
        prisma.slip.update({
          where: { id },
          data: {
            userId: targetUserId,
            status: "APPROVED",
            amount: parsedAmount,
            note: note || "อนุมัติผ่าน Web Dashboard",
            reviewedById: reviewer.id,
            reviewedByName: reviewer.displayName || reviewer.username,
            reviewedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: targetUserId },
          data: {
            balance: { increment: parsedAmount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            userId: targetUserId,
            amount: parsedAmount,
            type: "TOPUP",
            note: `อนุมัติสลิป #${slip.id.slice(-6).toUpperCase()} (${note || "Web Dashboard"})`,
            createdBy: `WEB:${reviewer.username}`,
          },
        }),
        prisma.auditLog.create({
          data: {
            userId: reviewer.id,
            action: "อนุมัติสลิปโอนเงิน (Web)",
            category: "SLIP",
            details: `${reviewer.username} อนุมัติสลิป #${slip.id.slice(-6).toUpperCase()} ของ ${slip.discordName} จำนวน ฿${parsedAmount}`,
          },
        }),
      ]);

      // Notify Discord user
      if (token) {
        const approveEmbed = {
          title: "🎉  PAYMENT APPROVED • สลิปได้รับการอนุมัติแล้ว",
          description:
            `สลิปโอนเงินของคุณได้รับการตรวจสอบและอนุมัติผ่าน Web Dashboard เรียบร้อยแล้ว!\n\n` +
            `• **ยอดเงินที่ได้รับ:** **+฿${parsedAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` +
            `• **รหัสอ้างอิง:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
            `• **ผู้อนุมัติ:** ${reviewer.displayName || reviewer.username}\n` +
            `• **เวลาอนุมัติ:** <t:${Math.floor(Date.now() / 1000)}:f>\n` +
            (note ? `• **หมายเหตุ:** ${note}\n\n` : `\n`) +
            `> ยอดเงินถูกเติมเข้ากระเป๋าของคุณเรียบร้อยแล้ว สามารถนำไปซื้อยศได้ทันทีครับ ✨`,
          color: 0x30d158,
          timestamp: new Date().toISOString(),
          footer: { text: "LynnBot Slip Verification • Web Dashboard" },
        };
        // Fire and don't await to keep response instant
        notifyDiscordUser(token, slip.discordId, slip.channelId, approveEmbed);
      }

      return NextResponse.json({ success: true, message: "อนุมัติสลิปสำเร็จ" });
    } else if (action === "reject") {
      const rejectNote = note?.trim() || "ไม่ระบุสาเหตุ";

      await prisma.$transaction([
        prisma.slip.update({
          where: { id },
          data: {
            status: "REJECTED",
            note: rejectNote,
            reviewedById: reviewer.id,
            reviewedByName: reviewer.displayName || reviewer.username,
            reviewedAt: new Date(),
          },
        }),
        prisma.auditLog.create({
          data: {
            userId: reviewer.id,
            action: "ปฏิเสธสลิปโอนเงิน (Web)",
            category: "SLIP",
            details: `${reviewer.username} ปฏิเสธสลิป #${slip.id.slice(-6).toUpperCase()} ของ ${slip.discordName} (สาเหตุ: ${rejectNote})`,
          },
        }),
      ]);

      // Notify Discord user
      if (token) {
        const rejectEmbed = {
          title: "❌  SLIP REJECTED • สลิปโอนเงินถูกปฏิเสธ",
          description:
            `สลิปโอนเงินของคุณไม่ผ่านการอนุมัติจากการตรวจสอบผ่าน Web Dashboard\n\n` +
            `• **รหัสอ้างอิง:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
            `• **สาเหตุที่ปฏิเสธ:** **${rejectNote}**\n` +
            `• **ผู้ตรวจสอบ:** ${reviewer.displayName || reviewer.username}\n` +
            `• **เวลาตรวจสอบ:** <t:${Math.floor(Date.now() / 1000)}:f>\n\n` +
            `> หากมีข้อสงสัยหรือต้องการส่งสลิปใหม่ สามารถเปิดทิกเก็ตหรือติดต่อแอดมินได้ครับ`,
          color: 0xff453a,
          timestamp: new Date().toISOString(),
          footer: { text: "LynnBot Slip Verification • Web Dashboard" },
        };
        notifyDiscordUser(token, slip.discordId, slip.channelId, rejectEmbed);
      }

      return NextResponse.json({ success: true, message: "ปฏิเสธสลิปเรียบร้อยแล้ว" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error updating slip:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
