export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Top 10 by Work Hours
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
      },
      select: {
        id: true,
        discordId: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
        attendances: {
          where: { clockOut: { not: null } },
          select: { duration: true, clockIn: true },
        },
        claimedTickets: {
          where: { status: "CLOSED" },
          select: { id: true },
        },
        userBadges: {
          include: {
            badge: true,
          },
        },
      },
    });

    // 2. Default Badges Initialization if not present in DB
    const badgeCount = await prisma.badge.count();
    if (badgeCount === 0) {
      await prisma.badge.createMany({
        data: [
          {
            name: "🔥 ผู้รักษาเวลาดีเด่น (Streak 7)",
            description: "ตอกบัตรเข้างานต่อเนื่องครบ 7 วัน",
            icon: "🔥",
            criteria: "attendance_streak_7",
            tier: "BRONZE",
          },
          {
            name: "⚡ มือปราบเคส (10 Tickets)",
            description: "ปิดทิกเก็ตและช่วยเหลือสมาชิกครบ 10 เคส",
            icon: "⚡",
            criteria: "tickets_closed_10",
            tier: "SILVER",
          },
          {
            name: "🛡️ เสาหลักคอมมูนิตี้ (50h Work)",
            description: "สะสมชั่วโมงการทำงานมากกว่า 50 ชั่วโมง",
            icon: "🛡️",
            criteria: "hours_worked_50",
            tier: "GOLD",
          },
          {
            name: "💎 แอดมินระดับตำนาน (Top Tier)",
            description: "ได้รับคะแนนประเมินและความไว้วางใจสูงสุดจากทีมงาน",
            icon: "💎",
            criteria: "admin_legendary",
            tier: "DIAMOND",
          },
        ],
      });
    }

    // Calculate aggregated statistics
    const staffLeaderboard = users.map((u) => {
      const totalMinutes = u.attendances.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
      const closedTicketsCount = u.claimedTickets.length;
      const attendanceCount = u.attendances.length;

      return {
        id: u.id,
        discordId: u.discordId,
        username: u.username,
        displayName: u.displayName || u.username,
        avatar: u.avatar,
        role: u.role,
        totalHours,
        closedTicketsCount,
        attendanceCount,
        badges: u.userBadges.map((ub) => ub.badge),
      };
    });

    // Sort by hours
    const topByHours = [...staffLeaderboard]
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 10);

    // Sort by tickets closed
    const topByTickets = [...staffLeaderboard]
      .sort((a, b) => b.closedTicketsCount - a.closedTicketsCount)
      .slice(0, 10);

    // Sort by attendance count
    const topByAttendance = [...staffLeaderboard]
      .sort((a, b) => b.attendanceCount - a.attendanceCount)
      .slice(0, 10);

    const allBadges = await prisma.badge.findMany({
      include: {
        _count: {
          select: { userBadges: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      topByHours,
      topByTickets,
      topByAttendance,
      badges: allBadges,
    });
  } catch (error: any) {
    console.error("Error in GET /api/leaderboard:", error);
    return NextResponse.json({ error: error.message || "Failed to load leaderboard" }, { status: 500 });
  }
}
