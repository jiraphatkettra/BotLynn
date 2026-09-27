export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // OPEN, CLAIMED, CLOSED, ALL
    const search = searchParams.get("search");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { ticketId: { contains: search, mode: "insensitive" } },
        { creatorName: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    const [tickets, totalCount, openCount, claimedCount, closedCount] =
      await Promise.all([
        prisma.ticket.findMany({
          where,
          include: {
            claimedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.ticket.count(),
        prisma.ticket.count({ where: { status: "OPEN" } }),
        prisma.ticket.count({ where: { status: "CLAIMED" } }),
        prisma.ticket.count({ where: { status: "CLOSED" } }),
      ]);

    return NextResponse.json({
      tickets,
      stats: {
        total: totalCount,
        open: openCount,
        claimed: claimedCount,
        closed: closedCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
