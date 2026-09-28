import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

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

    const reviewer = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (!reviewer) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ตรวจสอบ" }, { status: 403 });
    }

    if (action === "approve") {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: "กรุณาระบุจำนวนเงินเป็นตัวเลขที่ถูกต้อง (> 0)" },
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

      return NextResponse.json({ success: true, message: "อนุมัติสลิปสำเร็จ" });
    } else if (action === "reject") {
      await prisma.$transaction([
        prisma.slip.update({
          where: { id },
          data: {
            status: "REJECTED",
            note: note || "ปฏิเสธผ่าน Web Dashboard",
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
            details: `${reviewer.username} ปฏิเสธสลิป #${slip.id.slice(-6).toUpperCase()} ของ ${slip.discordName} (สาเหตุ: ${note || "ไม่ระบุ"})`,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: "ปฏิเสธสลิปเรียบร้อยแล้ว" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error updating slip:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
