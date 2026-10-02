import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, FinanceType, LogCategory } from "@lynnbot/database";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const timeframe = searchParams.get("timeframe");
  const search = searchParams.get("search");

  const where: any = {};

  if (type && type !== "ALL" && (type === "INCOME" || type === "EXPENSE")) {
    where.type = type as FinanceType;
  }

  if (category && category !== "ALL") {
    where.category = category;
  }

  // Timeframe filter
  const now = new Date();
  if (timeframe === "TODAY") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    where.date = { gte: startOfToday, lte: endOfToday };
  } else if (timeframe === "THIS_MONTH") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    where.date = { gte: startOfMonth, lte: endOfMonth };
  } else if (timeframe === "THIS_YEAR") {
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    where.date = { gte: startOfYear, lte: endOfYear };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { recordedBy: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
      { paymentMethod: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [records, allIncomeSum, allExpenseSum, monthIncomeSum, monthExpenseSum, categoryStats] = await Promise.all([
      prisma.financeRecord.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      prisma.financeRecord.aggregate({
        where: { type: "INCOME" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.financeRecord.aggregate({
        where: { type: "EXPENSE" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.financeRecord.aggregate({
        where: {
          type: "INCOME",
          date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
        },
        _sum: { amount: true },
      }),
      prisma.financeRecord.aggregate({
        where: {
          type: "EXPENSE",
          date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
        },
        _sum: { amount: true },
      }),
      prisma.financeRecord.groupBy({
        by: ["category", "type"],
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalIncome = allIncomeSum._sum.amount || 0;
    const totalExpense = allExpenseSum._sum.amount || 0;
    const netBalance = totalIncome - totalExpense;

    const monthlyIncome = monthIncomeSum._sum.amount || 0;
    const monthlyExpense = monthExpenseSum._sum.amount || 0;
    const monthlyNet = monthlyIncome - monthlyExpense;

    const totalRecords = (allIncomeSum._count.id || 0) + (allExpenseSum._count.id || 0);

    return NextResponse.json({
      records,
      stats: {
        totalIncome,
        totalExpense,
        netBalance,
        monthlyIncome,
        monthlyExpense,
        monthlyNet,
        totalRecords,
        categoryStats,
      },
    });
  } catch (error) {
    console.error("Error fetching finance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance records" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  try {
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

    if (!type || (type !== "INCOME" && type !== "EXPENSE")) {
      return NextResponse.json(
        { error: "กรุณาระบุประเภทรายการเป็น 'รายรับ (INCOME)' หรือ 'รายจ่าย (EXPENSE)'" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อรายการ" },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "กรุณาระบุจำนวนเงินที่ถูกต้องและมากกว่า 0" },
        { status: 400 }
      );
    }

    const parsedDate = date ? new Date(date) : new Date();

    const record = await prisma.financeRecord.create({
      data: {
        type,
        title: title.trim(),
        description: description ? description.trim() : null,
        amount: parsedAmount,
        category: category ? category.trim() : "OTHER",
        date: parsedDate,
        recordedById: user.id || user.discordId,
        recordedBy: user.displayName || user.name || user.username || "Admin",
        paymentMethod: paymentMethod ? paymentMethod.trim() : null,
        reference: reference ? reference.trim() : null,
        attachmentUrl: attachmentUrl ? attachmentUrl.trim() : null,
      },
    });

    // Write to Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE_FINANCE_RECORD",
          category: LogCategory.FINANCE,
          details: `สร้างบันทึก${type === "INCOME" ? "รายรับ" : "รายจ่าย"}: ${title.trim()} จำนวน ${parsedAmount.toLocaleString()} บาท`,
          metadata: {
            recordId: record.id,
            type,
            amount: parsedAmount,
            category: record.category,
            recordedBy: record.recordedBy,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to create audit log for finance entry:", auditErr);
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating finance record:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" },
      { status: 500 }
    );
  }
}
