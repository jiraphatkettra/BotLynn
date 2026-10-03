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

    const giveaways = await prisma.giveaway.findMany({
      include: {
        _count: {
          select: { entries: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ giveaways });
  } catch (error: any) {
    console.error("Error in GET /api/giveaways:", error);
    return NextResponse.json({ error: error.message || "Failed to load giveaways" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.giveaway.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/giveaways:", error);
    return NextResponse.json({ error: error.message || "Failed to delete giveaway" }, { status: 500 });
  }
}
