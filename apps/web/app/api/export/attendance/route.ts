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

    const attendances = await prisma.attendance.findMany({
      orderBy: { clockIn: "desc" },
      include: { user: true },
    });

    const headers = [
      "ลำดับ",
      "ชื่อผู้ใช้",
      "ชื่อที่แสดง",
      "Discord ID",
      "วันที่",
      "เวลาเข้างาน",
      "เวลาออกงาน",
      "ระยะเวลา (นาที)",
      "ระยะเวลา (ชั่วโมง)",
      "สถานะ",
      "หมายเหตุ",
    ];

    const rows = attendances.map((att, idx) => {
      const clockInDate = new Date(att.clockIn);
      const clockOutDate = att.clockOut ? new Date(att.clockOut) : null;
      const durationHours = att.duration ? (att.duration / 60).toFixed(2) : "0";

      const statusTh =
        att.status === "ON_TIME"
          ? "ตรงเวลา"
          : att.status === "LATE"
            ? "มาสาย"
            : att.status === "EARLY_LEAVE"
              ? "ออกก่อนเวลา"
              : "ขาดงาน";

      return [
        idx + 1,
        `"${att.user.username}"`,
        `"${att.user.displayName || att.user.username}"`,
        `"'${att.user.discordId}"`,
        `"${clockInDate.toLocaleDateString("th-TH")}"`,
        `"${clockInDate.toLocaleTimeString("th-TH")}"`,
        clockOutDate ? `"${clockOutDate.toLocaleTimeString("th-TH")}"` : '"ยังไม่ออก"',
        att.duration || 0,
        durationHours,
        `"${statusTh}"`,
        `"${att.note || ""}"`,
      ].join(",");
    });

    // Add UTF-8 BOM so Microsoft Excel renders Thai text correctly
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    const filename = `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export attendance error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
