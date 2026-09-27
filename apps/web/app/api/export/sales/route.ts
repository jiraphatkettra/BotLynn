export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        role: true,
      },
    });

    const headers = [
      "ลำดับ",
      "รหัสธุรกรรม",
      "ผู้ซื้อ",
      "ชื่อที่แสดง",
      "Discord ID",
      "ยศที่ซื้อ",
      "Role ID",
      "ราคา (บาท)",
      "สถานะ",
      "วันที่สั่งซื้อ",
      "เวลาสั่งซื้อ",
    ];

    const rows = transactions.map((tx, idx) => {
      const date = new Date(tx.createdAt);
      return [
        idx + 1,
        `"${tx.id}"`,
        `"${tx.user.username}"`,
        `"${tx.user.displayName || tx.user.username}"`,
        `"'${tx.user.discordId}"`,
        `"${tx.role.name}"`,
        `"'${tx.role.discordRoleId}"`,
        tx.price,
        `"${tx.status}"`,
        `"${date.toLocaleDateString("th-TH")}"`,
        `"${date.toLocaleTimeString("th-TH")}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const filename = `sales_report_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export sales error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
