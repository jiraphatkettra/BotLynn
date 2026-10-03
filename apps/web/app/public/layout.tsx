import Link from "next/link";
import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#000000" }}>
      {/* Public Navbar */}
      <header
        style={{
          height: "64px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 10, 14, 0.8)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #2997ff, #0077ed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "14px",
              }}
            >
              L
            </div>
            <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>
              LynnBot <span style={{ color: "#2997ff", fontSize: "12px", fontWeight: 600 }}>Portal</span>
            </span>
          </Link>

          {/* Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Link
              href="/public/shop"
              style={{
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
            >
              🛒 ร้านค้ายศ
            </Link>
            <Link
              href="/public/staff"
              style={{
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
            >
              👥 ทำเนียบทีมงาน
            </Link>
            <Link
              href="/public/status"
              style={{
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
            >
              ⚡ สถานะเซิร์ฟเวอร์
            </Link>
            <Link
              href="/rules"
              style={{
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
            >
              📜 กฎระเบียบ
            </Link>
            <Link
              href="/login"
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              สำหรับทีมงาน →
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>{children}</main>

      {/* Public Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          padding: "32px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "12px",
        }}
      >
        <p>LynnBot Community Management System • สงวนลิขสิทธิ์</p>
      </footer>
    </div>
  );
}
