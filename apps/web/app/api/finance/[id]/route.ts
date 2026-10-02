import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, FinanceType, LogCategory } from "@lynnbot/database";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { id } = params;

  try {
    const existing = await prisma.financeRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ไม่พบรายการที่ต้องการแก้ไข" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      type,
      title,
      description,
      amount,
      category,
      date,
      paymentMethod,
      reference,
      attachmentUrl,
    } = body;

    const dataToUpdate: any = {};

    if (type && (type === "INCOME" || type === "EXPENSE")) {
      dataToUpdate.type = type as FinanceType;
    }
    if (title && typeof title === "string") {
      dataToUpdate.title = title.trim();
    }
    if (description !== undefined) {
      dataToUpdate.description = description ? description.trim() : null;
    }
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: "จำนวนเงินต้องเป็นตัวเลขที่มากกว่า 0" },
          { status: 400 }
        );
      }
      dataToUpdate.amount = parsedAmount;
    }
    if (category !== undefined) {
      dataToUpdate.category = category ? category.trim() : "OTHER";
    }
    if (date) {
      dataToUpdate.date = new Date(date);
    }
    if (paymentMethod !== undefined) {
      dataToUpdate.paymentMethod = paymentMethod ? paymentMethod.trim() : null;
    }
    if (reference !== undefined) {
      dataToUpdate.reference = reference ? reference.trim() : null;
    }
    if (attachmentUrl !== undefined) {
      dataToUpdate.attachmentUrl = attachmentUrl ? attachmentUrl.trim() : null;
    }

    const updated = await prisma.financeRecord.update({
      where: { id },
      data: dataToUpdate,
    });

    // Write to Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_FINANCE_RECORD",
          category: LogCategory.FINANCE,
          details: `แก้ไขรายการการเงิน: ${updated.title} (${updated.type === "INCOME" ? "รายรับ" : "รายจ่าย"} ${updated.amount.toLocaleString()} บาท)`,
          metadata: {
            recordId: id,
            updatedFields: Object.keys(dataToUpdate),
            by: user.displayName || user.name || "Admin",
          },
        },
      });
    } catch {}

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating finance record:", error);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกการแก้ไขได้" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { id } = params;

  try {
    const existing = await prisma.financeRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ไม่พบรายการที่ต้องการลบ" },
        { status: 404 }
      );
    }

    await prisma.financeRecord.delete({
      where: { id },
    });

    // Write to Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE_FINANCE_RECORD",
          category: LogCategory.FINANCE,
          details: `ลบรายการการเงิน: ${existing.title} (${existing.type === "INCOME" ? "รายรับ" : "รายจ่าย"} ${existing.amount.toLocaleString()} บาท)`,
          metadata: {
            recordId: id,
            title: existing.title,
            amount: existing.amount,
            type: existing.type,
            by: user.displayName || user.name || "Admin",
          },
        },
      });
    } catch {}

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error deleting finance record:", error);
    return NextResponse.json(
      { error: "ไม่สามารถลบรายการได้" },
      { status: 500 }
    );
  }
}
