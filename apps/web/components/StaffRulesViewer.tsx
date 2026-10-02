"use client";

import React, { useState, useMemo } from "react";
import {
  STAFF_RULES_CHAPTERS,
  STAFF_RULES_METADATA,
  RuleChapter,
} from "@/lib/rulesData";

// Vector SVG Icon Renderer
function VectorIcon({
  name,
  size = 18,
  color = "currentColor",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  switch (name) {
    case "shield":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "user-check":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      );
    case "heart":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
    case "gavel":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L11 10" />
          <path d="m16 16 6-6" />
          <path d="m8 8 6-6" />
          <path d="m9 7 8 8" />
          <path d="m21 11-8-8" />
        </svg>
      );
    case "file-text":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      );
    case "lock":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "briefcase":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case "alert-triangle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "slash":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      );
    case "search":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "check":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "copy":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      );
    case "printer":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect width="12" height="8" x="6" y="14" />
        </svg>
      );
    case "info":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case "scale":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="M7 21h10" />
          <path d="M12 3v18" />
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export default function StaffRulesViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("all");
  const [copiedLink, setCopiedLink] = useState(false);

  // Copy share link
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Print view
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Filtered chapters based on search query and category filter
  const filteredChapters = useMemo(() => {
    let list = STAFF_RULES_CHAPTERS;

    if (selectedChapterId !== "all") {
      list = list.filter((c) => c.id === selectedChapterId);
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const q = searchQuery.toLowerCase().trim();

    return list.filter((ch) => {
      // Check chapter title or subtitle
      if (
        ch.title.toLowerCase().includes(q) ||
        ch.subtitle?.toLowerCase().includes(q)
      ) {
        return true;
      }

      // Check items
      if (ch.items?.some((item) => item.toLowerCase().includes(q))) {
        return true;
      }

      // Check subsections
      if (
        ch.subsections?.some(
          (sub) =>
            sub.title.toLowerCase().includes(q) ||
            sub.items.some((item) => item.toLowerCase().includes(q))
        )
      ) {
        return true;
      }

      // Check member penalty table
      if (
        ch.memberPenaltyTable?.some(
          (p) =>
            p.levelName.toLowerCase().includes(q) ||
            p.defaultPenalty.toLowerCase().includes(q) ||
            p.examples.some((ex) => ex.toLowerCase().includes(q))
        )
      ) {
        return true;
      }

      // Check staff penalty table
      if (
        ch.staffPenaltyTable?.some(
          (sp) =>
            sp.offense.toLowerCase().includes(q) ||
            sp.penalty.toLowerCase().includes(q) ||
            sp.reference?.toLowerCase().includes(q)
        )
      ) {
        return true;
      }

      // Check guidelines
      if (ch.guidelines?.some((g) => g.toLowerCase().includes(q))) {
        return true;
      }

      return false;
    });
  }, [searchQuery, selectedChapterId]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* 1. Header Hero Card */}
      <div
        className="card mb-24"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(20, 22, 32, 0.95), rgba(10, 12, 18, 0.98))",
          borderColor: "rgba(255, 255, 255, 0.12)",
          padding: "32px",
        }}
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 340,
            height: 340,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(41, 151, 255, 0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Metadata Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(41, 151, 255, 0.12)",
                color: "#2997ff",
                border: "1px solid rgba(41, 151, 255, 0.3)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              <VectorIcon name="shield" size={13} color="#2997ff" />
              {STAFF_RULES_METADATA.serverName}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(48, 209, 88, 0.12)",
                color: "#30d158",
                border: "1px solid rgba(48, 209, 88, 0.3)",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              <VectorIcon name="check" size={12} color="#30d158" />
              {STAFF_RULES_METADATA.version}
            </span>

            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                padding: "4px 8px",
              }}
            >
              ประกาศใช้: {STAFF_RULES_METADATA.effectiveDate}
            </span>
          </div>

          <h2 style={{ fontSize: "26px", fontWeight: 700, color: "#fff", marginBottom: 10 }}>
            {STAFF_RULES_METADATA.title}
          </h2>

          <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", maxWidth: 850, margin: 0 }}>
            {STAFF_RULES_METADATA.description}
          </p>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(41, 151, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VectorIcon name="file-text" size={18} color="#2997ff" />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>9 หมวด</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ระเบียบและมาตรฐานการปฏิบัติ</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(255, 159, 10, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VectorIcon name="gavel" size={18} color="#ff9f0a" />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>4 ระดับโทษ</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ลำดับขั้นตอนการลงโทษสมาชิก</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(48, 209, 88, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VectorIcon name="scale" size={18} color="#30d158" />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>มติผู้บริหาร 2 ท่าน</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ป้องกันการใช้อำนาจตามอารมณ์</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(255, 69, 58, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VectorIcon name="lock" size={18} color="#ff453a" />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>2FA บังคับ 100%</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ความปลอดภัยบัญชีทีมงานทุกคน</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Chapter Filter Bar */}
      <div className="card mb-24" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
            <div
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--text-muted)",
              }}
            >
              <VectorIcon name="search" size={16} />
            </div>
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: 38,
                paddingRight: searchQuery ? 32 : 12,
                fontSize: "13px",
                width: "100%",
              }}
              placeholder="ค้นหาข้อความ, หัวข้อ, หรือคีย์เวิร์ดในกฎ (เช่น นินทา, 18 ปี, ลงโทษ, อุทธรณ์)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: 4,
                }}
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Toolbar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyLink}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "12px" }}
              title="คัดลอกลิงก์หน้านี้"
            >
              <VectorIcon name={copiedLink ? "check" : "copy"} size={14} color={copiedLink ? "#30d158" : "currentColor"} />
              <span>{copiedLink ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "12px" }}
              title="พิมพ์หรือบันทึกเป็น PDF"
            >
              <VectorIcon name="printer" size={14} />
              <span>พิมพ์</span>
            </button>
          </div>
        </div>

        {/* Quick Chapter Selector Pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <button
            type="button"
            className={`apple-segmented-item ${selectedChapterId === "all" ? "active" : ""}`}
            onClick={() => setSelectedChapterId("all")}
            style={{ fontSize: "12px", whiteSpace: "nowrap", padding: "6px 12px" }}
          >
            ทั้งหมด (9 หมวด)
          </button>
          {STAFF_RULES_CHAPTERS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className={`apple-segmented-item ${selectedChapterId === ch.id ? "active" : ""}`}
              onClick={() => setSelectedChapterId(ch.id)}
              style={{
                fontSize: "12px",
                whiteSpace: "nowrap",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <VectorIcon name={ch.iconName} size={12} color={selectedChapterId === ch.id ? "#fff" : ch.accentColor} />
              หมวด {ch.chapterNumber}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Render Chapters List */}
      {filteredChapters.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: 12 }}>
            <VectorIcon name="search" size={32} />
          </div>
          <h4 style={{ color: "#fff", marginBottom: 6 }}>ไม่พบข้อกำหนดที่ตรงกับคำค้นหา "{searchQuery}"</h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            กรุณาลองค้นหาด้วยคำอื่น หรือกดปุ่ม "ทั้งหมด" ด้านบนเพื่อดูระเบียบทั้งหมด
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {filteredChapters.map((chapter) => (
            <div
              key={chapter.id}
              id={chapter.id}
              className="card"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Chapter Header */}
              <div
                style={{
                  padding: "20px 24px",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${chapter.accentColor} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${chapter.accentColor} 30%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <VectorIcon name={chapter.iconName} size={20} color={chapter.accentColor} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: chapter.accentColor,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        หมวดที่ {chapter.chapterNumber}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: "2px 0 0" }}>
                      {chapter.title}
                    </h3>
                  </div>
                </div>

                {chapter.subtitle && (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {chapter.subtitle}
                  </span>
                )}
              </div>

              {/* Chapter Body */}
              <div style={{ padding: "24px" }}>
                {/* Note / Intro */}
                {chapter.notes && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                      lineHeight: "1.6",
                      marginBottom: 20,
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ marginTop: 2, color: chapter.accentColor }}>
                      <VectorIcon name="info" size={16} color={chapter.accentColor} />
                    </div>
                    <div>{chapter.notes}</div>
                  </div>
                )}

                {/* Direct Items List (For หมวด 1, 2, 5, 6, 7, 8) */}
                {chapter.items && chapter.items.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {chapter.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: "rgba(255, 255, 255, 0.015)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                        }}
                      >
                        <span
                          style={{
                            minWidth: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.06)",
                            color: "var(--text-secondary)",
                            fontSize: "11px",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 1,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div style={{ fontSize: "13.5px", lineHeight: "1.6", color: "var(--text-primary)" }}>
                          {item}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subsections (For หมวด 3: จริยธรรมและศีลธรรม) */}
                {chapter.subsections && chapter.subsections.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {chapter.subsections.map((sub) => {
                      const isDanger = sub.alertType === "danger";
                      const isWarning = sub.alertType === "warning";

                      return (
                        <div
                          key={sub.id}
                          style={{
                            padding: "18px 20px",
                            borderRadius: 12,
                            background: isDanger
                              ? "rgba(255, 69, 58, 0.03)"
                              : isWarning
                              ? "rgba(255, 159, 10, 0.03)"
                              : "rgba(255, 255, 255, 0.02)",
                            border: `1px solid ${
                              isDanger
                                ? "rgba(255, 69, 58, 0.25)"
                                : isWarning
                                ? "rgba(255, 159, 10, 0.2)"
                                : "rgba(255, 255, 255, 0.06)"
                            }`,
                          }}
                        >
                          {/* Sub Heading */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 14,
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: isDanger ? "#ff453a" : isWarning ? "#ff9f0a" : "var(--accent)",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  background: isDanger
                                    ? "rgba(255, 69, 58, 0.15)"
                                    : isWarning
                                    ? "rgba(255, 159, 10, 0.15)"
                                    : "rgba(41, 151, 255, 0.12)",
                                }}
                              >
                                {sub.number}
                              </span>
                              <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>
                                {sub.title}
                              </h4>
                            </div>

                            {sub.highlight && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  background: "rgba(255, 69, 58, 0.18)",
                                  color: "#ff453a",
                                  border: "1px solid rgba(255, 69, 58, 0.35)",
                                }}
                              >
                                {sub.highlight}
                              </span>
                            )}
                          </div>

                          {/* Sub Items List */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {sub.items.map((item, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  alignItems: "flex-start",
                                  fontSize: "13px",
                                  lineHeight: "1.6",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <span style={{ color: isDanger ? "#ff453a" : isWarning ? "#ff9f0a" : "var(--accent)", marginTop: 4 }}>
                                  <VectorIcon name="check" size={13} />
                                </span>
                                <div>{item}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Member Penalty Table (For หมวด 4: ขั้นตอนการลงโทษ) */}
                {chapter.memberPenaltyTable && chapter.memberPenaltyTable.length > 0 && (
                  <div style={{ marginTop: 10, marginBottom: 24 }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: 12 }}>
                      ตารางระดับโทษสมาชิก 4 ระดับ (ใช้เป็นแนวทางมาตรฐาน)
                    </h4>
                    <div className="data-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: "100px" }}>ระดับโทษ</th>
                            <th>ตัวอย่างการกระทำความผิด</th>
                            <th style={{ width: "260px" }}>บทลงโทษเริ่มต้น</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chapter.memberPenaltyTable.map((p) => {
                            const badgeColor =
                              p.severity === "critical"
                                ? "#ff453a"
                                : p.severity === "high"
                                ? "#ff9f0a"
                                : p.severity === "medium"
                                ? "#ffd60a"
                                : "#30d158";

                            return (
                              <tr key={p.level}>
                                <td>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: badgeColor,
                                        background: `color-mix(in srgb, ${badgeColor} 12%, transparent)`,
                                        border: `1px solid color-mix(in srgb, ${badgeColor} 30%, transparent)`,
                                        padding: "3px 8px",
                                        borderRadius: 6,
                                        display: "inline-block",
                                        textAlign: "center",
                                      }}
                                    >
                                      ระดับ {p.level}
                                    </span>
                                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
                                      {p.levelName}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: "13px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                                    {p.examples.map((ex, exIdx) => (
                                      <li key={exIdx}>{ex}</li>
                                    ))}
                                  </ul>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600, color: badgeColor, fontSize: "13px" }}>
                                    {p.defaultPenalty}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Guidelines Checklist (For หมวด 4) */}
                {chapter.guidelines && chapter.guidelines.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: 12 }}>
                      หลักปฏิบัติที่ทีมงานทุกคนต้องยึดถือ
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10 }}>
                      {chapter.guidelines.map((g, gIdx) => (
                        <div
                          key={gIdx}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 10,
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <span style={{ color: "#30d158", marginTop: 2 }}>
                            <VectorIcon name="check" size={14} />
                          </span>
                          <span style={{ fontSize: "12.5px", lineHeight: "1.5", color: "var(--text-primary)" }}>
                            {g}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff Penalty Table (For หมวด 9: โทษของทีมงาน) */}
                {chapter.staffPenaltyTable && chapter.staffPenaltyTable.length > 0 && (
                  <div>
                    <div className="data-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>พฤติกรรมความผิดของทีมงาน</th>
                            <th style={{ width: "110px" }}>อ้างอิงหมวด</th>
                            <th style={{ width: "240px" }}>บทลงโทษทางวินัย</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chapter.staffPenaltyTable.map((sp, spIdx) => {
                            const isCrit = sp.severity === "critical";
                            const isHigh = sp.severity === "high";

                            return (
                              <tr key={spIdx}>
                                <td>
                                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                    <span
                                      style={{
                                        minWidth: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: isCrit ? "#ff453a" : isHigh ? "#ff9f0a" : "#30d158",
                                        marginTop: 6,
                                      }}
                                    />
                                    <span style={{ fontSize: "13px", fontWeight: isCrit ? 600 : 400, color: "var(--text-primary)" }}>
                                      {sp.offense}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  {sp.reference ? (
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "var(--accent)",
                                        background: "rgba(41, 151, 255, 0.12)",
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        display: "inline-block",
                                      }}
                                    >
                                      {sp.reference}
                                    </span>
                                  ) : (
                                    <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>—</span>
                                  )}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      fontSize: "12.5px",
                                      fontWeight: 600,
                                      color: isCrit ? "#ff453a" : isHigh ? "#ff9f0a" : "#30d158",
                                    }}
                                  >
                                    {sp.penalty}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Disclaimer Footer Card */}
      <div
        className="card"
        style={{
          marginTop: 32,
          padding: "20px 24px",
          background: "rgba(255, 255, 255, 0.015)",
          border: "1px dashed rgba(255, 255, 255, 0.12)",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div style={{ marginTop: 2, color: "var(--accent)" }}>
          <VectorIcon name="shield" size={20} color="var(--accent)" />
        </div>
        <div>
          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            ข้อสงวนสิทธิ์และการบังคับใช้
          </h4>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: "1.6", margin: 0 }}>
            {STAFF_RULES_METADATA.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
