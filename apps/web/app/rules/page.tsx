import { Metadata } from "next";
import CyberBackground from "@/components/CyberBackground";
import PublicRulesNavbar from "@/components/PublicRulesNavbar";
import PublicRulesFooter from "@/components/PublicRulesFooter";
import StaffRulesViewer from "@/components/StaffRulesViewer";

export const metadata: Metadata = {
  title: "กฎทีมงานและระเบียบปฏิบัติ | 753 BC DISCORD SERVER",
  description:
    "คู่มือระเบียบปฏิบัติ จริยธรรม และมาตรฐานการทำงานของทีมงาน 753 BC DISCORD SERVER ฉบับที่ 1.0 (มีผลบังคับใช้วันที่ 2 ตุลาคม 2569)",
  openGraph: {
    title: "กฎทีมงานและระเบียบปฏิบัติ | 753 BC DISCORD SERVER",
    description:
      "คู่มือระเบียบปฏิบัติ จริยธรรม และมาตรฐานการทำงานของทีมงาน 753 BC DISCORD SERVER ฉบับทางการ",
    images: ["/logo.png"],
  },
};

export default function PublicRulesPage() {
  return (
    <div className="public-rules-page-wrapper">
      {/* Sci-Fi Ambient Aurora Background */}
      <CyberBackground />

      {/* Standalone Public Header with Community Branding & Staff Portal Entrance */}
      <PublicRulesNavbar />

      {/* Main Document Body */}
      <main className="public-rules-main">
        {/* Hero Section */}
        <section className="public-rules-hero">
          <div className="public-hero-badge-row">
            <span className="public-hero-tag">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              เอกสารระเบียบปฏิบัติทางการ
            </span>
            <span className="public-doc-badge">ฉบับที่ 1.0 (Official)</span>
          </div>

          <h1 className="public-hero-title">
            กฎทีมงานและระเบียบปฏิบัติ คณะผู้ดูแลระบบ
          </h1>

          <p className="public-hero-subtitle">
            753 BC DISCORD SERVER — คู่มือกำหนดหน้าที่ ความประพฤติ จริยธรรม และขั้นตอนการทำงานของทีมงานทุกฝ่าย
            เพื่อให้การตัดสินใจและการดูแลคอมมูนิตี้เป็นไปในแนวทางเดียวกัน โปร่งใส และตรวจสอบได้
          </p>

          <div className="public-hero-meta-row">
            <div className="public-hero-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <span>มีผลบังคับใช้: 2 ตุลาคม 2569</span>
            </div>

            <div className="public-hero-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              <span>สถานะ: มีผลบังคับใช้ตามกฎหมายเซิร์ฟเวอร์</span>
            </div>

            <div className="public-hero-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>กลุ่มเป้าหมาย: ทีมงาน Staff และ Admin ทุกระดับ</span>
            </div>
          </div>

          {/* Member Transparency Notice Banner */}
          <div className="public-notice-banner">
            <div className="public-notice-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div className="public-notice-content">
              <div className="public-notice-title">
                คำชี้แจงสำหรับสมาชิกทั่วไป (Community Transparency Notice)
              </div>
              <div className="public-notice-desc">
                หน้านี้เปิดเผยต่อสาธารณะเพื่อให้สมาชิกทุกคนรับทราบข้อกำหนด มาตรฐานการปฏิบัติหน้าที่ และแนวทางการลงโทษของทีมงานอย่างโปร่งใส
                หากสมาชิกพบเห็นทีมงานปฏิบัติหน้าที่ขัดต่อระเบียบ ใช้อำนาจในทางมิชอบ หรือเลือกปฏิบัติ
                สามารถบันทึกหลักฐานและติดต่อผู้บริหารระดับสูงผ่านระบบทิกเก็ตได้ทันที
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Rules Viewer Component */}
        <StaffRulesViewer />
      </main>

      {/* Standalone Public Footer */}
      <PublicRulesFooter />
    </div>
  );
}
