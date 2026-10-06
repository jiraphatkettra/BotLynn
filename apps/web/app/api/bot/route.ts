export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@lynnbot/database";

export async function GET() {
  try {
    const currentSession = await prisma.botSession.findFirst({
      where: { status: "ONLINE" },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({
      isOnline: !!currentSession,
      online: !!currentSession,
      latency: currentSession?.ping || null,
      session: currentSession,
    });
  } catch (error) {
    console.error("Error fetching bot status from /api/bot:", error);
    return NextResponse.json(
      { isOnline: false, online: false, latency: null, error: "Failed to fetch bot status" },
      { status: 500 }
    );
  }
}
