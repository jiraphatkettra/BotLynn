import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { executeSlipVerification } from "@/lib/slipVerification";

// Helper to notify Discord (channel or DM)
async function notifyDiscord(token: string, channelId: string | null, discordId: string, embed: any) {
  try {
    let sent = false;
    if (channelId) {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `<@${discordId}>`,
          embeds: [embed],
        }),
      });
      if (res.ok) sent = true;
    }

    if (!sent && discordId) {
      const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_id: discordId }),
      });

      if (dmRes.ok) {
        const dmData = await dmRes.json();
        await fetch(`https://discord.com/api/v10/channels/${dmData.id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ embeds: [embed] }),
        });
      }
    }
  } catch (err) {
    console.error("Failed to send Discord notification:", err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const slip = await prisma.slip.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!slip) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสลิปนี้" }, { status: 404 });
    }

    if (slip.status === "APPROVED") {
      return NextResponse.json({ error: "สลิปนี้ได้รับการอนุมัติไปแล้ว" }, { status: 400 });
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    // Run verification
    const outcome = await executeSlipVerification(slip.imageUrl, slip.id);
    const token = process.env.DISCORD_TOKEN;

    if (outcome.approved && outcome.data) {
      const v = outcome.data;
      const amount = v.amount || 0;

      let targetUserId = slip.userId;
      if (!targetUserId) {
        const targetDbUser = await prisma.user.upsert({
          where: { discordId: slip.discordId },
          update: {},
          create: {
            discordId: slip.discordId,
            username: slip.discordName,
            displayName: slip.discordName,
            role: "MEMBER",
          },
        });
        targetUserId = targetDbUser.id;
      }

      // 1. Transaction update
      const [updatedSlip, updatedUser] = await prisma.$transaction([
        prisma.slip.update({
          where: { id: slip.id },
          data: {
            status: "APPROVED",
            isAutoVerified: true,
            amount,
            transRef: v.transRef,
            senderName: v.senderName,
            senderBank: v.senderBank,
            receiverName: v.receiverName,
            receiverBank: v.receiverBank,
            transDate: v.transDate,
            rawSlipData: v.raw,
            note: "ตรวจสอบผ่าน API อัตโนมัติ",
            reviewedById: reviewer?.id,
            reviewedByName: `${reviewer?.displayName || reviewer?.username || "แอดมิน"} (ผ่าน API)`,
            reviewedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { discordId: slip.discordId },
          data: {
            balance: { increment: amount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            userId: targetUserId,
            amount,
            type: "TOPUP",
            note: `เติมเงินอัตโนมัติจากสลิป #${slip.id.slice(-6).toUpperCase()} (${v.transRef || "API"})`,
            createdBy: `ADMIN_API:${reviewer?.username || "web"}`,
          },
        }),
        prisma.auditLog.create({
          data: {
            userId: reviewer?.id,
            action: "ตรวจสอบสลิปผ่าน API สำเร็จ",
            category: "SLIP",
            details: `สลิป #${slip.id.slice(-6).toUpperCase()} ยอด ฿${amount} ผ่านการตรวจสอบผ่าน API (Ref: ${v.transRef})`,
          },
        }),
      ]);

      // 2. Grant Auto Role if configured
      const autoRoleSetting = await prisma.setting.findUnique({
        where: { key: "slip_auto_role_id" },
      });
      const guildId = process.env.DISCORD_GUILD_ID;
      if (autoRoleSetting?.value && token && guildId) {
        try {
          await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${slip.discordId}/roles/${autoRoleSetting.value}`,
            {
              method: "PUT",
              headers: { Authorization: `Bot ${token}` },
            }
          );
        } catch (rErr) {
          console.error("Failed to grant auto role:", rErr);
        }
      }

      // 3. Notify Discord
      if (token) {
        const embed = {
          color: 0x30d158, // Green
          title: "✅ อนุมัติสลิปโอนเงินเรียบร้อยแล้ว (Verified)",
          description:
            `สลิปการโอนเงินของคุณได้รับการตรวจสอบความถูกต้องเรียบร้อยแล้ว\n\n` +
            `• **รหัสสลิป:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
            (v.transRef ? `• **รหัสอ้างอิงธนาคาร:** \`${v.transRef}\`\n` : "") +
            `• **จำนวนเงิน:** **฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` +
            (v.senderName ? `• **ผู้โอน:** \`${v.senderName}\` (${v.senderBank || "-"})\n` : "") +
            (v.receiverName ? `• **ผู้รับ:** \`${v.receiverName}\` (${v.receiverBank || "-"})\n` : "") +
            `• **ยอดเงินคงเหลือในกระเป๋า:** **฿${(updatedUser.balance).toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` +
            `• **ผู้ตรวจสอบ:** 🤖 ระบบอัตโนมัติ (API Verification)\n\n` +
            `> ยอดเงินถูกเติมเข้ากระเป๋าเรียบร้อยแล้ว สามารถนำไปซื้อยศหรือใช้บริการได้ทันที ขอบคุณครับ! 🙏`,
          footer: { text: "LynnBot Operations System • Automatic Verification" },
          timestamp: new Date().toISOString(),
        };

        await notifyDiscord(token, slip.channelId, slip.discordId, embed);
      }

      return NextResponse.json({
        success: true,
        approved: true,
        message: `ตรวจสอบผ่านเรียบร้อย! ยอดเงิน ฿${amount} เติมเข้ากระเป๋าแล้ว`,
        slip: updatedSlip,
        verification: v,
      });
    }

    if (outcome.rejectReason) {
      // Marked as rejected (e.g. duplicate slip)
      const updatedSlip = await prisma.slip.update({
        where: { id: slip.id },
        data: {
          status: "REJECTED",
          note: outcome.rejectReason,
          transRef: outcome.data?.transRef,
          reviewedById: reviewer?.id,
          reviewedByName: `${reviewer?.displayName || reviewer?.username || "แอดมิน"} (ผ่าน API)`,
          reviewedAt: new Date(),
        },
      });

      if (token) {
        const embed = {
          color: 0xff453a, // Red
          title: "❌ ปฏิเสธสลิปโอนเงิน (Verification Rejected)",
          description:
            `สลิปการโอนเงินของคุณไม่ผ่านการตรวจสอบ\n\n` +
            `• **รหัสสลิป:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
            `• **เหตุผล:** **${outcome.rejectReason}**\n\n` +
            `> หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อทีมงานเพื่อทำการตรวจสอบเพิ่มเติมครับ`,
          footer: { text: "LynnBot Operations System • Slip Verification" },
          timestamp: new Date().toISOString(),
        };

        await notifyDiscord(token, slip.channelId, slip.discordId, embed);
      }

      return NextResponse.json({
        success: true,
        approved: false,
        rejected: true,
        message: outcome.rejectReason,
        slip: updatedSlip,
      });
    }

    // Pending reason (e.g., mismatch or couldn't read QR)
    const updatedSlip = await prisma.slip.update({
      where: { id: slip.id },
      data: {
        note: outcome.pendingReason,
        rawSlipData: outcome.data?.raw || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      approved: false,
      pending: true,
      message: outcome.pendingReason || "ไม่สามารถอนุมัติอัตโนมัติได้ ต้องให้แอดมินตรวจด้วยตนเอง",
      slip: updatedSlip,
      verification: outcome.data,
    });
  } catch (error: any) {
    console.error("Error verifying slip:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป" },
      { status: 500 }
    );
  }
}
