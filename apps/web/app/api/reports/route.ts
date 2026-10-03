export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month"); // "2026-10"

    const now = new Date();
    const [year, month] = monthStr
      ? monthStr.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const [
      attendances,
      transactions,
      closedTickets,
      leaves,
      staffUsers,
    ] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          clockIn: { gte: startDate, lt: endDate },
          clockOut: { not: null },
        },
        include: { user: true },
      }),
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: startDate, lt: endDate },
          status: "COMPLETED",
        },
        include: { role: true, user: true },
      }),
      prisma.ticket.findMany({
        where: {
          createdAt: { gte: startDate, lt: endDate },
          status: "CLOSED",
        },
        include: { claimedBy: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          startDate: { gte: startDate, lt: endDate },
          status: "APPROVED",
        },
        include: { user: true },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
        },
      }),
    ]);

    // Financial totals
    const totalRevenue = transactions.reduce((acc, curr) => acc + curr.price, 0);

    // Staff breakdown
    const staffSummary = staffUsers.map((staff) => {
      const userAttendances = attendances.filter((a) => a.userId === staff.id);
      const totalMinutes = userAttendances.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

      const ticketsHandled = closedTickets.filter((t) => t.claimedById === staff.id).length;
      const userLeaves = leaves.filter((l) => l.userId === staff.id);
      const leaveDays = userLeaves.reduce((acc, curr) => acc + curr.days, 0);

      return {
        id: staff.id,
        discordId: staff.discordId,
        name: staff.displayName || staff.username,
        role: staff.role,
        shiftsCount: userAttendances.length,
        totalHours,
        ticketsHandled,
        leaveDays,
      };
    });

    const report = {
      period: `${month}/${year}`,
      totalRevenue,
      transactionsCount: transactions.length,
      closedTicketsCount: closedTickets.length,
      approvedLeavesCount: leaves.length,
      staffSummary,
    };

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Error in GET /api/reports:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
