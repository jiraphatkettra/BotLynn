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
  const search = searchParams.get("search");

  const where: any = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { discordName: { contains: search, mode: "insensitive" } },
      { discordId: { contains: search } },
      { ticketId: { contains: search, mode: "insensitive" } },
      { note: { contains: search, mode: "insensitive" } },
      { transRef: { contains: search, mode: "insensitive" } },
      { senderName: { contains: search, mode: "insensitive" } },
      { receiverName: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [slips, statsData, autoVerifiedCount] = await Promise.all([
      prisma.slip.findMany({
        where,
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
          reviewedBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.slip.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.slip.count({
        where: { isAutoVerified: true },
      }),
    ]);

    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      autoVerified: autoVerifiedCount,
      totalApprovedAmount: 0,
    };

    statsData.forEach((s) => {
      stats.total += s._count.id;
      if (s.status === "PENDING") stats.pending = s._count.id;
      if (s.status === "APPROVED") {
        stats.approved = s._count.id;
        stats.totalApprovedAmount = s._sum.amount || 0;
      }
      if (s.status === "REJECTED") stats.rejected = s._count.id;
    });

    return NextResponse.json({ slips, stats });
  } catch (err: any) {
    console.error("Error fetching slips:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
