export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@lynnbot/database";

// POST - Update bot session status (called by bot)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, guilds, users, ping, reason } = body;

    if (action === "start") {
      // Create new session
      const session = await prisma.botSession.create({
        data: {
          startedAt: new Date(),
          status: "ONLINE",
          guilds: guilds || 0,
          users: users || 0,
          ping: ping || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "บอทเริ่มทำงาน",
          category: "BOT",
          details: `Bot online - ${guilds} guilds, ${users} users`,
        },
      });

      return NextResponse.json({ data: session }, { status: 201 });
    }

    if (action === "stop") {
      // Update current session
      const currentSession = await prisma.botSession.findFirst({
        where: { status: "ONLINE" },
        orderBy: { startedAt: "desc" },
      });

      if (currentSession) {
        const stoppedAt = new Date();
        const duration = Math.floor(
          (stoppedAt.getTime() - currentSession.startedAt.getTime()) / 1000
        );

        await prisma.botSession.update({
          where: { id: currentSession.id },
          data: {
            stoppedAt,
            duration,
            status: reason === "error" ? "ERROR" : "OFFLINE",
            reason,
          },
        });

        await prisma.auditLog.create({
          data: {
            action: "บอทหยุดทำงาน",
            category: "BOT",
            details: `Bot offline - duration: ${duration}s${reason ? `, reason: ${reason}` : ""}`,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "heartbeat") {
      // Update current session stats
      const currentSession = await prisma.botSession.findFirst({
        where: { status: "ONLINE" },
        orderBy: { startedAt: "desc" },
      });

      if (currentSession) {
        await prisma.botSession.update({
          where: { id: currentSession.id },
          data: {
            guilds: guilds || currentSession.guilds,
            users: users || currentSession.users,
            ping: ping || currentSession.ping,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing bot status:", error);
    return NextResponse.json(
      { error: "Failed to manage bot status" },
      { status: 500 }
    );
  }
}

// GET - Get current bot status
export async function GET() {
  try {
    const currentSession = await prisma.botSession.findFirst({
      where: { status: "ONLINE" },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({
      online: !!currentSession,
      session: currentSession,
    });
  } catch (error) {
    console.error("Error fetching bot status:", error);
    return NextResponse.json(
      { error: "Failed to fetch bot status" },
      { status: 500 }
    );
  }
}
