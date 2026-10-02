import Header from "@/components/Header";
import AdminManager from "@/components/AdminManager";
import { prisma } from "@lynnbot/database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { isRootOwner } from "@/lib/utils";

async function getAdminsData() {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      permissions: true,
      attendances: {
        take: 1,
        orderBy: { clockIn: "desc" },
      },
      _count: {
        select: {
          attendances: true,
          transactions: true,
        },
      },
    },
  });

  return { admins };
}

export default async function AdminsPage() {
  const [data, session] = await Promise.all([
    getAdminsData(),
    getServerSession(authOptions),
  ]);

  const sessionUser = session?.user as any;
  const isOwner =
    sessionUser?.role === "OWNER" || isRootOwner(sessionUser?.discordId);
  const currentUserId = sessionUser?.id;

  return (
    <>
      <Header
        title="จัดการแอดมินและสิทธิ์"
        subtitle={`รายชื่อทีมงานทั้งหมด ${data.admins.length} คน • สิทธิ์การแก้ไขเฉพาะระดับ Owner`}
      />

      <div className="page-content">
        <AdminManager initialAdmins={data.admins} isOwner={isOwner} currentUserId={currentUserId} />
      </div>
    </>
  );
}
