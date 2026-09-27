export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRole = (session.user as any).role;
    if (currentRole !== "OWNER" && currentRole !== "MANAGER") {
      return NextResponse.json(
        { error: "เฉพาะ Owner หรือ Manager เท่านั้นที่สามารถปรับยอดเงินได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, amount, note } = body;

    if (!userId || typeof amount !== "number" || amount === 0) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง (ต้องระบุ userId และ amount)" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const newBalance = Math.max(0, user.balance + amount);

    const [updatedUser, tx] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          userId,
          amount,
          type: amount > 0 ? "WEB_TOPUP" : "WEB_DEDUCT",
          note: note || "ปรับยอดเงินผ่าน Web Dashboard",
          createdBy: (session.user as any).username || "WEB_ADMIN",
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "WALLET_BALANCE_ADJUSTED",
          category: "WALLET",
          details: `ปรับปรุงยอดเงินให้ ${user.username}: ${amount > 0 ? "+" : ""}${amount} ฿ (คงเหลือ: ${newBalance} ฿) [${note || ""}]`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      balance: updatedUser.balance,
      transaction: tx,
    });
  } catch (error: any) {
    console.error("POST /api/wallet/adjust error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to adjust balance" },
      { status: 500 }
    );
  }
}
