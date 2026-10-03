import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import GiveawayManager from "@/components/GiveawayManager";

export const metadata = {
  title: "กิจกรรมแจกรางวัล • LynnBot",
  description: "จัดการและติดตามกิจกรรม Giveaways ในเซิร์ฟเวอร์ดิสคอร์ด",
};

export default async function GiveawaysPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="page-content" style={{ padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto 28px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#2997ff",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          COMMUNITY EVENTS
        </div>
        <h1
          style={{
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.025em",
            margin: "0 0 8px",
          }}
        >
          กิจกรรมแจกรางวัล & Giveaways
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          ติดตามผู้เข้าร่วมกิจกรรม สุ่มผู้ชนะ และดูประวัติกิจกรรมของเซิร์ฟเวอร์
        </p>
      </div>

      <GiveawayManager />
    </div>
  );
}
