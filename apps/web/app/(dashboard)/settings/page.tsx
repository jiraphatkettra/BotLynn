import Header from "@/components/Header";
import SettingsManager from "@/components/SettingsManager";
import { prisma } from "@lynnbot/database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getSettingsData() {
  const settings = await prisma.setting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }
  return settingsMap;
}

export default async function SettingsPage() {
  const [settingsMap, session] = await Promise.all([
    getSettingsData(),
    getServerSession(authOptions),
  ]);

  const isSuperAdmin = (session?.user as any)?.role === "OWNER";

  return (
    <>
      <Header
        title="ตั้งค่าระบบ"
        subtitle={
          isSuperAdmin
            ? "กำหนดการทำงานของบอทและห้องแจ้งเตือนใน Discord (สิทธิ์ SuperAdmin)"
            : "การตั้งค่าระบบและบอท (โหมดดูอย่างเดียว)"
        }
      />

      <div className="page-content">
        <SettingsManager
          initialSettings={settingsMap}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </>
  );
}
