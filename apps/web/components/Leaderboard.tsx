"use client";

import React, { useState, useEffect } from "react";
import { getDiscordAvatarUrl } from "@/lib/utils";
import BadgeShowcase from "./BadgeShowcase";

interface StaffRankItem {
  id: string;
  discordId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: string;
  totalHours: number;
  closedTicketsCount: number;
  attendanceCount: number;
  badges: any[];
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<"hours" | "tickets" | "attendance">("hours");
  const [data, setData] = useState<{
    topByHours: StaffRankItem[];
    topByTickets: StaffRankItem[];
    topByAttendance: StaffRankItem[];
    badges: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getActiveList = () => {
    if (!data) return [];
    if (activeTab === "hours") return data.topByHours;
    if (activeTab === "tickets") return data.topByTickets;
    return data.topByAttendance;
  };

  const getMetricValue = (item: StaffRankItem) => {
    if (activeTab === "hours") return `${item.totalHours} ชั่วโมง`;
    if (activeTab === "tickets") return `${item.closedTicketsCount} เคส`;
    return `${item.attendanceCount} กะงาน`;
  };

  const currentList = getActiveList();
  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];
  const rest = currentList.slice(3);

  return (
    <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "28px",
          background: "rgba(255, 255, 255, 0.04)",
          padding: "4px",
          borderRadius: "14px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          width: "fit-content",
        }}
      >
        {[
          { id: "hours", label: "⏱️ ชั่วโมงทำงานสะสม" },
          { id: "tickets", label: "🎫 จัดการทิกเก็ต" },
          { id: "attendance", label: "📅 กะการเข้างาน" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === tab.id ? "#2997ff" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {!loading && currentList.length === 0 && (
        <div className="empty-state" style={{ margin: "40px auto" }}>
          <div className="empty-state-icon">🏆</div>
          <p className="empty-state-title">ยังไม่มีข้อมูลอันดับทีมงาน</p>
          <p className="empty-state-text">ข้อมูลจะแสดงที่นี่เมื่อมีการบันทึกเวลาทำงาน ทิกเก็ต หรือการเข้างาน</p>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {currentList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "36px",
          }}
        >
          {/* Rank 2 */}
          {top2 && (
            <div
              style={{
                padding: "24px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(192, 192, 192, 0.3)",
                boxShadow: "0 10px 30px rgba(192, 192, 192, 0.1)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🥈</div>
              <img
                src={getDiscordAvatarUrl(top2.discordId, top2.avatar)}
                alt={top2.displayName}
                loading="lazy"
                decoding="async"
                style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "12px", border: "2px solid #c0c0c0" }}
              />
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>{top2.displayName}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>@{top2.username}</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2997ff" }}>{getMetricValue(top2)}</div>
            </div>
          )}

          {/* Rank 1 */}
          {top1 && (
            <div
              style={{
                padding: "28px 24px",
                borderRadius: "20px",
                background: "rgba(255, 215, 0, 0.05)",
                border: "1px solid rgba(255, 215, 0, 0.4)",
                boxShadow: "0 14px 40px rgba(255, 215, 0, 0.15)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: "translateY(-6px)",
              }}
            >
              <div style={{ fontSize: "30px", marginBottom: "8px" }}>👑 🥇</div>
              <img
                src={getDiscordAvatarUrl(top1.discordId, top1.avatar)}
                alt={top1.displayName}
                loading="lazy"
                decoding="async"
                style={{ width: "76px", height: "76px", borderRadius: "50%", marginBottom: "12px", border: "3px solid #ffd700", boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)" }}
              />
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>{top1.displayName}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>@{top1.username}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#ffd700" }}>{getMetricValue(top1)}</div>
            </div>
          )}

          {/* Rank 3 */}
          {top3 && (
            <div
              style={{
                padding: "24px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(205, 127, 50, 0.3)",
                boxShadow: "0 10px 30px rgba(205, 127, 50, 0.1)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🥉</div>
              <img
                src={getDiscordAvatarUrl(top3.discordId, top3.avatar)}
                alt={top3.displayName}
                loading="lazy"
                decoding="async"
                style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "12px", border: "2px solid #cd7f32" }}
              />
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>{top3.displayName}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>@{top3.username}</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2997ff" }}>{getMetricValue(top3)}</div>
            </div>
          )}
        </div>
      )}

      {/* Ranks 4-10 Table */}
      {rest.length > 0 && (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "14px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            อันดับที่ 4 - 10
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {rest.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", width: "24px" }}>
                    #{idx + 4}
                  </span>
                  <img
                    src={getDiscordAvatarUrl(item.discordId, item.avatar)}
                    alt={item.displayName}
                    loading="lazy"
                    decoding="async"
                    style={{ width: "36px", height: "36px", borderRadius: "50%" }}
                  />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>{item.displayName}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>@{item.username}</div>
                  </div>
                </div>

                <div style={{ fontSize: "15px", fontWeight: 700, color: "#2997ff" }}>
                  {getMetricValue(item)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges Section */}
      {data && data.badges && data.badges.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#2997ff",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            ACHIEVEMENTS & BADGES
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>
            เหรียญรางวัล & ผลงานทีมงาน
          </h3>
          <BadgeShowcase badges={data.badges} />
        </div>
      )}
    </div>
  );
}
