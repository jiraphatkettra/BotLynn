import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { executeFandayMatching } from "@/lib/fandayMatching";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const event = await prisma.fandayEvent.findFirst({
      where: { status: { notIn: ["ENDED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      include: {
        players: {
          orderBy: { joinedAt: "desc" },
        },
        pairs: {
          orderBy: { createdAt: "desc" },
          include: {
            gameSessions: true,
            letters: true,
          },
        },
      },
    });

    const totalRegistered = event ? event.players.filter((p) => p.status !== "WITHDRAWN").length : 0;
    const maleCount = event ? event.players.filter((p) => p.gender === "MALE" && p.status !== "WITHDRAWN").length : 0;
    const femaleCount = event ? event.players.filter((p) => p.gender === "FEMALE" && p.status !== "WITHDRAWN").length : 0;
    const lockedCount = event ? event.players.filter((p) => p.hasPartner && p.status !== "WITHDRAWN").length : 0;

    return NextResponse.json({
      event,
      stats: {
        total: totalRegistered,
        male: maleCount,
        female: femaleCount,
        locked: lockedCount,
        pairs: event?.pairs.length || 0,
      },
    });
  } catch (err: any) {
    console.error("GET /api/fanday error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, eventId, status, dryRun } = body;

    const event = eventId
      ? await prisma.fandayEvent.findUnique({ where: { id: eventId } })
      : await prisma.fandayEvent.findFirst({
          where: { status: { notIn: ["ENDED", "CANCELLED"] } },
          orderBy: { createdAt: "desc" },
        });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 1. Update status
    if (action === "update_status") {
      const updated = await prisma.fandayEvent.update({
        where: { id: event.id },
        data: { status },
      });

      await prisma.auditLog.create({
        data: {
          action: `Fanday: Status Updated to ${status}`,
          category: "FANDAY",
          details: `Admin ${(session.user as any)?.name} updated event status`,
        },
      });

      return NextResponse.json({ success: true, event: updated });
    }

    // 2. Matching Run (Dry run or commit)
    if (action === "run_matching") {
      const players = await prisma.fandayPlayer.findMany({
        where: {
          eventId: event.id,
          status: "REGISTERED",
          hasPartner: false,
        },
      });

      const blocks = await prisma.fandayBlock.findMany();

      const result = executeFandayMatching({
        players: players as any,
        blocks,
      });

      if (!dryRun) {
        // Commit matching to database
        const createdPairs = await prisma.$transaction(
          result.pairs.map((p) =>
            prisma.fandayPair.create({
              data: {
                eventId: event.id,
                playerAId: p.playerAId,
                playerBId: p.playerBId,
                source: p.source,
                compatibility: p.compatibility,
                reason: p.reason,
                status: "ACTIVE",
              },
            })
          )
        );

        // Update player statuses to MATCHED
        const matchedIds = result.pairs.flatMap((p) => [p.playerAId, p.playerBId]);
        await prisma.fandayPlayer.updateMany({
          where: {
            eventId: event.id,
            discordId: { in: matchedIds },
          },
          data: { status: "MATCHED" },
        });

        // Save match log for transparency
        await prisma.fandayMatchLog.create({
          data: {
            eventId: event.id,
            mode: event.pairingMode,
            seed: result.seed,
            snapshot: result as any,
          },
        });

        await prisma.fandayEvent.update({
          where: { id: event.id },
          data: { status: "ACTIVE" },
        });

        return NextResponse.json({ success: true, committed: true, pairs: createdPairs });
      }

      return NextResponse.json({ success: true, dryRun: true, preview: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/fanday error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
