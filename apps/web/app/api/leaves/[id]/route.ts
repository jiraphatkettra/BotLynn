export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRole = (session.user as any).role;
    if (currentRole !== "OWNER" && currentRole !== "MANAGER") {
      return NextResponse.json(
        { error: "เฉพาะ Owner หรือ Manager เท่านั้นที่มีสิทธิ์อนุมัติการลา" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, note } = body; // action: "APPROVE" | "REJECT"

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!leave) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        reviewedById: (session.user as any).id,
        reviewNote: note || undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: action === "APPROVE" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
        category: "LEAVE",
        details: `${action === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ"}การลาของ ${leave.user.username} (ID: ${leave.id})`,
      },
    });

    // Try sending DM to the user via Discord bot REST
    const token = process.env.DISCORD_TOKEN;
    if (token && leave.user.discordId) {
      try {
        const dmChannelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient_id: leave.user.discordId }),
        });

        if (dmChannelRes.ok) {
          const dmChannel = await dmChannelRes.json();
          await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bot ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content:
                action === "APPROVE"
                  ? `✅ **คำขอลางานของคุณได้รับการอนุมัติแล้ว**\n• ประเภท: ${leave.leaveType}\n• จำนวน: ${leave.days} วัน\n• วันที่: ${new Date(leave.startDate).toLocaleDateString("th-TH")}`
                  : `❌ **คำขอลางานของคุณไม่ได้รับการอนุมัติ**\n• เหตุผล: ${note || "ไม่ระบุ"}`,
            }),
          });
        }
      } catch (e) {
        // Continue
      }
    }

    return NextResponse.json({ success: true, leave: updated });
  } catch (error: any) {
    console.error("PATCH /api/leaves/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
