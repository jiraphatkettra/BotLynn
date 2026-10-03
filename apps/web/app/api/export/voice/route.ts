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

    const sessions = await prisma.voiceSession.findMany({
      orderBy: { joinedAt: "desc" },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            discordId: true,
          },
        },
      },
      take: 2000,
    });

    const headers = [
      "ลำดับ",
      "ชื่อผู้ใช้",
      "ชื่อที่แสดง",
      "Discord ID",
      "ห้องเสียง",
      "วันที่เข้า",
      "เวลาเข้า",
      "เวลาออก",
      "ระยะเวลา (นาที)",
      "ระยะเวลา (ชั่วโมง)",
      "สถานะ",
    ];

    const rows = sessions.map((s, idx) => {
      const joinDate = new Date(s.joinedAt);
      const leaveDate = s.leftAt ? new Date(s.leftAt) : null;
      const durationMins = s.duration ? Math.round(s.duration / 60) : 0;
      const durationHours = s.duration ? (s.duration / 3600).toFixed(2) : "0";
      const statusTh = s.leftAt ? "ออกแล้ว" : "กำลังใช้งาน";

      return [
        idx + 1,
        `"${s.user?.username || "-"}"`,
        `"${s.user?.displayName || s.user?.username || "-"}"`,
        `"'${s.user?.discordId || "-"}"`,
        `"${s.channelName || s.channelId || "-"}"`,
        `"${joinDate.toLocaleDateString("th-TH")}"`,
        `"${joinDate.toLocaleTimeString("th-TH")}"`,
        leaveDate ? `"${leaveDate.toLocaleTimeString("th-TH")}"` : '"ยังไม่ออก"',
        durationMins,
        durationHours,
        `"${statusTh}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="voice-log-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export voice error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
