import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Fetch voice sessions within timeframe
    const sessions = await prisma.voiceSession.findMany({
      where: {
        joinedAt: { gte: fromDate },
      },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            username: true,
            displayName: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 100,
    });

    // Currently active sessions (leftAt is null)
    const activeSessions = await prisma.voiceSession.findMany({
      where: {
        leftAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            username: true,
            displayName: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    // Calculate aggregated stats per user
    const userStatsMap = new Map<
      string,
      {
        user: any;
        totalSeconds: number;
        sessionCount: number;
        isCurrentlyInVoice: boolean;
        currentChannel?: string;
      }
    >();

    const activeUserIds = new Set(activeSessions.map((s) => s.userId));

    for (const s of sessions) {
      const existing = userStatsMap.get(s.userId) || {
        user: s.user,
        totalSeconds: 0,
        sessionCount: 0,
        isCurrentlyInVoice: activeUserIds.has(s.userId),
      };

      const duration = s.duration || (s.leftAt ? 0 : Math.floor((Date.now() - s.joinedAt.getTime()) / 1000));
      existing.totalSeconds += duration;
      existing.sessionCount += 1;
      userStatsMap.set(s.userId, existing);
    }

    // Add any active user not in the recent sessions
    for (const a of activeSessions) {
      if (!userStatsMap.has(a.userId)) {
        const duration = Math.floor((Date.now() - a.joinedAt.getTime()) / 1000);
        userStatsMap.set(a.userId, {
          user: a.user,
          totalSeconds: duration,
          sessionCount: 1,
          isCurrentlyInVoice: true,
          currentChannel: a.channelName || undefined,
        });
      } else {
        const u = userStatsMap.get(a.userId)!;
        u.isCurrentlyInVoice = true;
        u.currentChannel = a.channelName || undefined;
      }
    }

    const leaderboard = Array.from(userStatsMap.values()).sort(
      (a, b) => b.totalSeconds - a.totalSeconds
    );

    const totalSecondsOverall = leaderboard.reduce(
      (acc, curr) => acc + curr.totalSeconds,
      0
    );

    return NextResponse.json({
      activeNow: activeSessions.length,
      activeSessions,
      totalHours: Number((totalSecondsOverall / 3600).toFixed(1)),
      leaderboard,
      recentSessions: sessions.slice(0, 30),
    });
  } catch (error: any) {
    console.error("GET /api/voice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
