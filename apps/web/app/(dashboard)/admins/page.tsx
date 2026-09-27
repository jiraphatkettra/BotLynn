import Header from "@/components/Header";
import AdminManager from "@/components/AdminManager";
import { prisma } from "@lynnbot/database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getAdminsData() {
  const admins = await prisma.user.findMany({
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

  const isOwner = (session?.user as any)?.role === "OWNER";

  return (
    <>
      <Header
        title="จัดการแอดมินและสิทธิ์"
        subtitle={`รายชื่อทีมงานทั้งหมด ${data.admins.length} คน • สิทธิ์การแก้ไขเฉพาะระดับ Owner`}
      />

      <div className="page-content">
        <AdminManager initialAdmins={data.admins} isOwner={isOwner} />
      </div>
    </>
  );
}
