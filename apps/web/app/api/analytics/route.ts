export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export interface DailySalesData {
  date: string;       // e.g. "2026-09-04"
  label: string;      // e.g. "4 ก.ย."
  amount: number;     // THB
  count: number;      // transactions count
}

export interface DailyWorkHoursData {
  dayName: string;    // e.g. "จันทร์", "อังคาร"
  shortDay: string;   // e.g. "จ.", "อ."
  date: string;       // e.g. "03/10"
  hours: number;      // Total hours (decimal)
  sessionsCount: number;
}

export interface TicketDistributionData {
  status: "OPEN" | "CLAIMED" | "CLOSED";
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AnalyticsSummary {
  sales30Days: {
    totalRevenue: number;
    totalCount: number;
    dailyData: DailySalesData[];
  };
  weeklyWorkHours: {
    totalHours: number;
    avgDailyHours: number;
    dailyData: DailyWorkHoursData[];
  };
  ticketDistribution: {
    totalTickets: number;
    items: TicketDistributionData[];
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 1. Calculate 30-day range for Sales Line Chart
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [transactions, attendances, ticketCounts] = await Promise.all([
      // Sales transactions in last 30 days
      prisma.transaction.findMany({
        where: {
          status: "COMPLETED",
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          price: true,
          createdAt: true,
        },
      }),

      // Attendance records in last 7 days
      prisma.attendance.findMany({
        where: {
          clockIn: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          clockIn: true,
          duration: true,
        },
      }),

      // Ticket counts by status
      prisma.ticket.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
      }),
    ]);

    // ==========================================
    // 1. Process 30-Day Sales Data
    // ==========================================
    const salesByDate: Record<string, { amount: number; count: number }> = {};

    // Initialize all 30 days with 0
    const thaiMonthsShort = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    const dailySalesList: DailySalesData[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      const label = `${d.getDate()} ${thaiMonthsShort[d.getMonth()]}`;
      salesByDate[key] = { amount: 0, count: 0 };
      dailySalesList.push({
        date: key,
        label,
        amount: 0,
        count: 0,
      });
    }

    let total30DayRevenue = 0;
    let total30DayCount = 0;

    for (const tx of transactions) {
      const key = tx.createdAt.toISOString().split("T")[0];
      if (salesByDate[key]) {
        salesByDate[key].amount += tx.price;
        salesByDate[key].count += 1;
        total30DayRevenue += tx.price;
        total30DayCount += 1;
      }
    }

    // Populate daily sales list
    for (const item of dailySalesList) {
      item.amount = salesByDate[item.date]?.amount || 0;
      item.count = salesByDate[item.date]?.count || 0;
    }

    // ==========================================
    // 2. Process Weekly Staff Work Hours (Last 7 Days)
    // ==========================================
    const thaiDays = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const thaiDaysShort = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

    const weeklyWorkHoursList: DailyWorkHoursData[] = [];
    let totalWeeklyHours = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayAttendances = attendances.filter((att) => {
        const attDate = new Date(att.clockIn);
        return attDate >= d && attDate < nextD;
      });

      const totalMinutes = dayAttendances.reduce((acc, curr) => {
        return acc + (curr.duration || 0);
      }, 0);

      const hours = Math.round((totalMinutes / 60) * 10) / 10;
      totalWeeklyHours += hours;

      weeklyWorkHoursList.push({
        dayName: thaiDays[d.getDay()],
        shortDay: thaiDaysShort[d.getDay()],
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        hours,
        sessionsCount: dayAttendances.length,
      });
    }

    const avgDailyHours = Math.round((totalWeeklyHours / 7) * 10) / 10;

    // ==========================================
    // 3. Process Ticket Distribution Donut Data
    // ==========================================
    const statusMap: Record<string, { count: number; label: string; color: string }> = {
      OPEN: { count: 0, label: "เปิดค้าง (Open)", color: "#2997ff" },
      CLAIMED: { count: 0, label: "กำลังดูแล (Claimed)", color: "#ff9f0a" },
      CLOSED: { count: 0, label: "ปิดสำเร็จ (Closed)", color: "#30d158" },
    };

    let totalTickets = 0;
    for (const group of ticketCounts) {
      if (statusMap[group.status]) {
        statusMap[group.status].count = group._count.id;
        totalTickets += group._count.id;
      }
    }

    const ticketDistributionItems: TicketDistributionData[] = (
      ["OPEN", "CLAIMED", "CLOSED"] as const
    ).map((status) => {
      const count = statusMap[status].count;
      const percentage = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
      return {
        status,
        label: statusMap[status].label,
        count,
        percentage,
        color: statusMap[status].color,
      };
    });

    const response: AnalyticsSummary = {
      sales30Days: {
        totalRevenue: total30DayRevenue,
        totalCount: total30DayCount,
        dailyData: dailySalesList,
      },
      weeklyWorkHours: {
        totalHours: Math.round(totalWeeklyHours * 10) / 10,
        avgDailyHours,
        dailyData: weeklyWorkHoursList,
      },
      ticketDistribution: {
        totalTickets,
        items: ticketDistributionItems,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in GET /api/analytics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate analytics" },
      { status: 500 }
    );
  }
}
