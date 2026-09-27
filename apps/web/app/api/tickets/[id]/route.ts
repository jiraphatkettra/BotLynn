export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
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
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error("GET /api/tickets/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // "close" or "claim"

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    if (action === "close") {
      const updated = await prisma.ticket.update({
        where: { id: params.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedBy: (session.user as any).name || (session.user as any).username || "Web Admin",
        },
      });

      // Attempt to delete Discord channel if bot token is present
      const token = process.env.DISCORD_TOKEN;
      if (token && ticket.channelId) {
        try {
          await fetch(`https://discord.com/api/v10/channels/${ticket.channelId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bot ${token}`,
            },
          });
        } catch (e) {
          // Channel may already be deleted
        }
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/tickets/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
