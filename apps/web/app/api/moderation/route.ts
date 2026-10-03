export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const severity = searchParams.get("severity");

    const warnings = await prisma.warning.findMany({
      where: severity && severity !== "ALL" ? { severity } : {},
      orderBy: { createdAt: "desc" },
    });

    const totalActive = warnings.filter((w) => w.isActive).length;

    return NextResponse.json({
      warnings,
      totalActive,
      totalCount: warnings.length,
    });
  } catch (error: any) {
    console.error("Error in GET /api/moderation:", error);
    return NextResponse.json({ error: error.message || "Failed to load warnings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Warning ID required" }, { status: 400 });
    }

    const updated = await prisma.warning.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({ success: true, warning: updated });
  } catch (error: any) {
    console.error("Error in PUT /api/moderation:", error);
    return NextResponse.json({ error: error.message || "Failed to update warning" }, { status: 500 });
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

    await prisma.warning.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/moderation:", error);
    return NextResponse.json({ error: error.message || "Failed to delete warning" }, { status: 500 });
  }
}
