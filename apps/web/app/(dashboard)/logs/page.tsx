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

import React from "react";
import {
  Lock,
  Clock,
  Tag,
  User,
  Settings,
  Bot,
  Key,
  Mic,
  Ticket,
  Database,
  Wallet,
  Megaphone,
  Calendar,
  Receipt,
  FileText,
} from "lucide-react";

const categoryIconMap: Record<string, React.ReactNode> = {
  AUTH: <Lock className="w-3.5 h-3.5 text-sky-400" />,
  ATTENDANCE: <Clock className="w-3.5 h-3.5 text-emerald-400" />,
  SHOP: <Tag className="w-3.5 h-3.5 text-purple-400" />,
  ADMIN: <User className="w-3.5 h-3.5 text-indigo-400" />,
  SYSTEM: <Settings className="w-3.5 h-3.5 text-neutral-400" />,
  BOT: <Bot className="w-3.5 h-3.5 text-amber-400" />,
  PERMISSION: <Key className="w-3.5 h-3.5 text-rose-400" />,
  VOICE: <Mic className="w-3.5 h-3.5 text-cyan-400" />,
  TICKET: <Ticket className="w-3.5 h-3.5 text-violet-400" />,
  BACKUP: <Database className="w-3.5 h-3.5 text-yellow-400" />,
  WALLET: <Wallet className="w-3.5 h-3.5 text-emerald-400" />,
  ANNOUNCEMENT: <Megaphone className="w-3.5 h-3.5 text-pink-400" />,
  LEAVE: <Calendar className="w-3.5 h-3.5 text-teal-400" />,
  SLIP: <Receipt className="w-3.5 h-3.5 text-blue-400" />,
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
              <span>{categoryIconMap[cat.category] || <FileText className="w-3.5 h-3.5 text-neutral-400" />}</span>
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
