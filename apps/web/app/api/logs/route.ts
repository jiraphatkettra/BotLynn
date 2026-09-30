export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

const VALID_CATEGORIES = [
  "AUTH",
  "ATTENDANCE",
  "SHOP",
  "ADMIN",
  "SYSTEM",
  "BOT",
  "PERMISSION",
  "VOICE",
  "TICKET",
  "BACKUP",
  "WALLET",
  "ANNOUNCEMENT",
  "LEAVE",
  "SLIP",
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25)
    );
    const skip = (page - 1) * limit;

    const categoryParam = searchParams.get("category")?.toUpperCase().trim();
    const searchParam = searchParams.get("search")?.trim();
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const where: any = {};

    if (categoryParam && VALID_CATEGORIES.includes(categoryParam)) {
      where.category = categoryParam;
    }

    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (searchParam) {
      where.OR = [
        { action: { contains: searchParam, mode: "insensitive" } },
        { details: { contains: searchParam, mode: "insensitive" } },
        { user: { username: { contains: searchParam, mode: "insensitive" } } },
        { user: { displayName: { contains: searchParam, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              discordId: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages,
      limit,
    });
  } catch (error: any) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
