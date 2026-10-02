import Header from "@/components/Header";
import PermissionsEditor from "@/components/PermissionsEditor";
import { prisma } from "@lynnbot/database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRootOwner } from "@/lib/utils";

export const metadata = {
  title: "สิทธิ์การใช้งาน | LynnBot",
  description: "จัดการและกำหนดสิทธิ์การใช้งานระบบของทีมงานแต่ละคน",
};

async function getPermissionsData() {
  const [users, permissions] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
      },
      orderBy: { role: "asc" },
      select: {
        id: true,
        discordId: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
      },
    }),
    prisma.permission.findMany(),
  ]);

  return { users, permissions };
}

export default async function PermissionsPage() {
  const [data, session] = await Promise.all([
    getPermissionsData(),
    getServerSession(authOptions),
  ]);

  const sessionUser = session?.user as any;
  const isOwner =
    sessionUser?.role === "OWNER" || isRootOwner(sessionUser?.discordId);

  return (
    <>
      <Header
        title="สิทธิ์การใช้งาน"
        subtitle="จัดการและกำหนดสิทธิ์ของแอดมินแต่ละคนแบบ Real-time"
      />

      <div className="page-content">
        <PermissionsEditor
          initialUsers={data.users}
          initialPermissions={data.permissions}
          isOwner={isOwner}
        />
      </div>
    </>
  );
}
