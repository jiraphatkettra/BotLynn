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

    const [pendingSlips, openTickets] = await Promise.all([
      prisma.slip.count({ where: { status: "PENDING" } }),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "CLAIMED"] } } }),
    ]);

    return NextResponse.json({
      pendingSlips,
      openTickets,
    });
  } catch (error: any) {
    console.error("Error fetching badges:", error);
    return NextResponse.json({ pendingSlips: 0, openTickets: 0 });
  }
}
