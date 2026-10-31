"use client";

import React, { useState, useEffect } from "react";
import { getDiscordAvatarUrl } from "@/lib/utils";
import BadgeShowcase from "./BadgeShowcase";
import { Clock, Ticket, Calendar, Trophy, Crown, Medal } from "lucide-react";

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
          background: "#070809",
          padding: "4px",
          borderRadius: "0px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          width: "fit-content",
        }}
      >
        {[
          { id: "hours", label: "ชั่วโมงทำงานสะสม", icon: <Clock className="w-3.5 h-3.5" /> },
          { id: "tickets", label: "จัดการทิกเก็ต", icon: <Ticket className="w-3.5 h-3.5" /> },
          { id: "attendance", label: "กะการเข้างาน", icon: <Calendar className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "8px 18px",
              borderRadius: "0px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === tab.id ? "rgba(41, 151, 255, 0.15)" : "transparent",
              color: activeTab === tab.id ? "#2997ff" : "var(--text-secondary)",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {!loading && currentList.length === 0 && (
        <div className="empty-state" style={{ margin: "40px auto" }}>
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
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
                borderRadius: "0px",
                background: "#070809",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderTop: "2px solid #c0c0c0",
                boxShadow: "none",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div className="w-8 h-8 bg-slate-300/10 border border-slate-300/30 flex items-center justify-center mb-2">
                <Medal className="w-4 h-4 text-slate-300" />
              </div>
              <img
                src={getDiscordAvatarUrl(top2.discordId, top2.avatar)}
                alt={top2.displayName}
                loading="lazy"
                decoding="async"
                style={{ width: "64px", height: "64px", borderRadius: "0px", marginBottom: "12px", border: "1px solid #c0c0c0" }}
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
                borderRadius: "0px",
                background: "#070809",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderTop: "2px solid #ffd700",
                boxShadow: "none",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div className="w-10 h-10 bg-amber-400/10 border border-amber-400/40 flex items-center justify-center mb-2">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <img
                src={getDiscordAvatarUrl(top1.discordId, top1.avatar)}
                alt={top1.displayName}
                loading="lazy"
                decoding="async"
                style={{ width: "76px", height: "76px", borderRadius: "0px", marginBottom: "12px", border: "2px solid #ffd700" }}
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
                borderRadius: "0px",
                background: "#070809",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderTop: "2px solid #cd7f32",
                boxShadow: "none",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div className="w-8 h-8 bg-amber-700/10 border border-amber-700/30 flex items-center justify-center mb-2">
                <Medal className="w-4 h-4 text-amber-600" />
              </div>
              <img
                src={getDiscordAvatarUrl(top3.discordId, top3.avatar)}
                alt={top3.displayName}
                loading="lazy"
                decoding="async"
                style={{ width: "64px", height: "64px", borderRadius: "0px", marginBottom: "12px", border: "1px solid #cd7f32" }}
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
            background: "#070809",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "0px",
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
              background: "#0a0c0e",
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
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", width: "24px", fontFamily: "var(--font-mono, monospace)" }}>
                    #{idx + 4}
                  </span>
                  <img
                    src={getDiscordAvatarUrl(item.discordId, item.avatar)}
                    alt={item.displayName}
                    loading="lazy"
                    decoding="async"
                    style={{ width: "36px", height: "36px", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>{item.displayName}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>@{item.username}</div>
                  </div>
                </div>

                <div style={{ fontSize: "14px", fontWeight: 700, color: "#2997ff", fontFamily: "var(--font-mono, monospace)" }}>
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
