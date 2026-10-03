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
    const category = searchParams.get("category");

    const notes = await prisma.staffNote.findMany({
      where: category && category !== "ALL" ? { category } : {},
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error("Error in GET /api/notes:", error);
    return NextResponse.json({ error: error.message || "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, category, isPinned } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { discordId: (session.user as any)?.discordId || (session.user as any)?.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const note = await prisma.staffNote.create({
      data: {
        title,
        content,
        category: category || "GENERAL",
        isPinned: Boolean(isPinned),
        authorId: user.id,
      },
      include: { author: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "สร้างบันทึกทีมงาน",
        category: "NOTE",
        details: `${user.displayName || user.username} สร้างบันทึก "${note.title}" (${note.category})`,
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error("Error in POST /api/notes:", error);
    return NextResponse.json({ error: error.message || "Failed to create note" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, isPinned, title, content, category } = body;

    if (!id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isPinned === "boolean") updateData.isPinned = isPinned;
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category) updateData.category = category;

    const note = await prisma.staffNote.update({
      where: { id },
      data: updateData,
      include: { author: true },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error("Error in PUT /api/notes:", error);
    return NextResponse.json({ error: error.message || "Failed to update note" }, { status: 500 });
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
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const note = await prisma.staffNote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id: note.id });
  } catch (error: any) {
    console.error("Error in DELETE /api/notes:", error);
    return NextResponse.json({ error: error.message || "Failed to delete note" }, { status: 500 });
  }
}
