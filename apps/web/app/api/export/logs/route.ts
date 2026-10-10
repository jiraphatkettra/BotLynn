export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

const CATEGORY_MAP: Record<string, string> = {
  AUTH: "การเข้าสู่ระบบ",
  ATTENDANCE: "ตอกบัตร",
  SHOP: "ร้านค้า",
  ADMIN: "แอดมิน",
  SYSTEM: "ระบบ",
  BOT: "บอท",
  PERMISSION: "สิทธิ์",
  VOICE: "ห้องเสียง",
  TICKET: "ทิกเก็ต",
  BACKUP: "สำรองข้อมูล",
  WALLET: "กระเป๋าเงิน",
  ANNOUNCEMENT: "ประกาศ",
  LEAVE: "ลาหยุด",
  SLIP: "สลิป",
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { details: { contains: search } },
        { user: { username: { contains: search } } },
        { user: { displayName: { contains: search } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            discordId: true,
          },
        },
      },
    });

    const headers = [
      "ลำดับ",
      "วันเวลา",
      "ผู้ใช้งาน",
      "ชื่อ Discord",
      "Discord ID",
      "หมวดหมู่",
      "กิจกรรม (Action)",
      "รายละเอียด",
    ];

    const rows = logs.map((log, idx) => {
      const dt = new Date(log.createdAt);
      const dateStr = dt.toLocaleDateString("th-TH") + " " + dt.toLocaleTimeString("th-TH");
      const categoryTh = CATEGORY_MAP[log.category] || log.category;
      const cleanDetails = (log.details || "").replace(/"/g, '""').replace(/\r?\n/g, " ");

      return [
        idx + 1,
        `"${dateStr}"`,
        `"${log.user?.displayName || log.user?.username || "ระบบ"}"`,
        `"${log.user?.username || "-"}"`,
        `"'${log.user?.discordId || "-"}"`,
        `"${categoryTh}"`,
        `"${log.action.replace(/"/g, '""')}"`,
        `"${cleanDetails}"`,
      ].join(",");
    });

    // Add UTF-8 BOM so Microsoft Excel renders Thai correctly
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export audit logs error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
