import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeId = searchParams.get("assigneeId");

  const whereClause: any = {};
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (assigneeId) whereClause.assigneeId = assigneeId;

  try {
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    const staffMembers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        discordId: true,
        role: true,
        avatar: true,
      },
      orderBy: { username: "asc" },
    });

    return NextResponse.json({ tasks, staffMembers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, assigneeId, priority, dueDate } = body;

    if (!title) {
      return NextResponse.json({ error: "กรุณาระบุชื่องาน" }, { status: 400 });
    }

    const currentUserId = (session.user as any)?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "User session invalid" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || "MEDIUM",
        status: "TODO",
        assigneeId: assigneeId || null,
        assignedById: currentUserId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: true,
        assignedBy: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        category: "TASK",
        action: "CREATE_TASK",
        userId: currentUserId,
        details: `สร้างงานใหม่: ${title} (${priority})`,
        metadata: { title, priority, assigneeId, taskId: task.id },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, priority, assigneeId, dueDate, title, description } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing task ID" }, { status: 400 });
    }

    const currentUserId = (session.user as any)?.id;
    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === "DONE") {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: true,
        assignedBy: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        category: "TASK",
        action: "UPDATE_TASK",
        userId: currentUserId,
        details: `อัปเดตงาน: ${updatedTask.title} เป็นสถานะ ${updatedTask.status}`,
        metadata: updateData,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
