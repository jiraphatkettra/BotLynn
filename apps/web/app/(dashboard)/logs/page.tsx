import Header from "@/components/Header";
import LogsViewer from "@/components/LogsViewer";
import { prisma } from "@lynnbot/database";

async function getLogsStats() {
  const [totalLogs, categoryCounts] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({
      by: ["category"],
      _count: true,
    }),
  ]);

  return { totalLogs, categoryCounts };
}

const categoryIcons: Record<string, string> = {
  AUTH: "🔐",
  ATTENDANCE: "⏰",
  SHOP: "🏷️",
  ADMIN: "👤",
  SYSTEM: "⚙️",
  BOT: "🤖",
  PERMISSION: "🔑",
  VOICE: "🎙️",
  TICKET: "🎫",
  BACKUP: "💾",
  WALLET: "💰",
  ANNOUNCEMENT: "📢",
  LEAVE: "🏖️",
  SLIP: "🧾",
};

const categoryLabels: Record<string, string> = {
  AUTH: "การเข้าสู่ระบบ",
  ATTENDANCE: "ตอกบัตร",
  SHOP: "ร้านค้า",
  ADMIN: "แอดมิน",
  SYSTEM: "ระบบ",
  BOT: "บอท",
  PERMISSION: "สิทธิ์",
  VOICE: "ห้องเสียง",
  TICKET: "ทิกเก็ต",
  BACKUP: "สำรองข้อมูล",
  WALLET: "กระเป๋าเงิน",
  ANNOUNCEMENT: "ประกาศ",
  LEAVE: "ลาหยุด",
  SLIP: "สลิป",
};

export const metadata = {
  title: "ประวัติกิจกรรม | LynnBot",
  description: "บันทึกและตรวจสอบกิจกรรมทั้งหมดภายในระบบ พร้อมระบบค้นหาและกรอง",
};

export default async function LogsPage() {
  const data = await getLogsStats();

  return (
    <>
      <Header
        title="ประวัติกิจกรรม"
        subtitle={`บันทึกกิจกรรมทั้งหมด ${data.totalLogs.toLocaleString()} รายการ`}
      />

      <div className="page-content">
        {/* Category Stats */}
        <div
          className="flex gap-12 mb-24 stagger"
          style={{ flexWrap: "wrap" }}
        >
          {data.categoryCounts.map((cat) => (
            <div
              key={cat.category}
              className="flex items-center gap-8"
              style={{
                padding: "8px 16px",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-full)",
                fontSize: 13,
              }}
            >
              <span>{categoryIcons[cat.category] || "📋"}</span>
              <span>{categoryLabels[cat.category] || cat.category}</span>
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--primary-300)",
                }}
              >
                {cat._count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Interactive Logs Viewer */}
        <LogsViewer />
      </div>
    </>
  );
}
