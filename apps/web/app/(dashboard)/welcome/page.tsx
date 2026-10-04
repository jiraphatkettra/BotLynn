import Header from "@/components/Header";
import WelcomeManager from "@/components/WelcomeManager";
import { prisma } from "@lynnbot/database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "ระบบต้อนรับ & แจกยศ | LynnBot",
  description: "ปรับแต่งการ์ดต้อนรับสมาชิกใหม่ Embed, รูปภาพ, สีธีม, และแจกยศอัตโนมัติ",
};

export default async function WelcomePage() {
  const [settings, session] = await Promise.all([
    prisma.setting.findMany(),
    getServerSession(authOptions),
  ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  const isSuperAdmin = (session?.user as any)?.role === "OWNER";

  return (
    <>
      <Header
        title="ระบบต้อนรับ & แจกยศสมาชิก (Welcome Studio)"
        subtitle={
          isSuperAdmin
            ? "ปรับแต่งการ์ดต้อนรับแบบ Embed, ข้อความ, สีธีม, รูปภาพแบนเนอร์ และแจกยศสมาชิกใหม่อัตโนมัติ"
            : "ระบบต้อนรับสมาชิกใหม่ (โหมดดูอย่างเดียว)"
        }
      />
      <div className="page-content">
        <WelcomeManager
          initialSettings={settingsMap}
          isSuperAdmin={isSuperAdmin}
          standalone={true}
        />
      </div>
    </>
  );
}
