"use client";

import React, { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Gift, Trash2 } from "lucide-react";

interface GiveawayItem {
  id: string;
  title: string;
  prize: string;
  channelId: string;
  hostName: string;
  maxWinners: number;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  _count: { entries: number };
}

export default function GiveawayManager() {
  const [giveaways, setGiveaways] = useState<GiveawayItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGiveaways = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/giveaways");
      if (res.ok) {
        const json = await res.json();
        setGiveaways(json.giveaways || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGiveaways();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบกิจกรรมแจกรางวัลนี้หรือไม่?")) return;
    try {
      const res = await fetch(`/api/giveaways?id=${id}`, { method: "DELETE" });
      if (res.ok) loadGiveaways();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Top Banner */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "16px",
          background: "rgba(41, 151, 255, 0.08)",
          border: "1px solid rgba(41, 151, 255, 0.2)",
          marginBottom: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            <Gift className="w-4 h-4 text-pink-400" />
            สร้างกิจกรรม Giveaway ได้โดยตรงใน Discord
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            ใช้คำสั่ง <code>/giveaway create</code> เพื่อเปิดกิจกรรมพร้อมปุ่มสุ่มรางวัลอัตโนมัติ
          </div>
        </div>

        <button
          type="button"
          onClick={loadGiveaways}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#ffffff",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          รีเฟรช
        </button>
      </div>

      {/* Giveaways List */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {giveaways.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6 text-pink-400" />
            </div>
            <p className="empty-state-title">ยังไม่มีกิจกรรม Giveaway</p>
            <p className="empty-state-text">ใช้คำสั่ง /giveaway create ใน Discord เพื่อเริ่มกิจกรรมแจกรางวัล</p>
          </div>
        ) : (
          giveaways.map((g) => {
            const isEnded = !g.isActive || new Date(g.endsAt) < new Date();
            return (
              <div
                key={g.id}
                style={{
                  padding: "24px",
                  borderRadius: "18px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${!isEnded ? "rgba(41, 151, 255, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                  boxShadow: !isEnded ? "0 8px 24px rgba(41, 151, 255, 0.1)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: !isEnded ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        color: !isEnded ? "#30d158" : "var(--text-muted)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${!isEnded ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-neutral-500"}`} />
                      {!isEnded ? "กำลังจัดกิจกรรม" : "สิ้นสุดแล้ว"}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDelete(g.id)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                      title="ลบกิจกรรม"
                    >
                      <Trash2 className="w-4 h-4 hover:text-rose-400 transition-colors" />
                    </button>
                  </div>

                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                    <Gift className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>{g.prize}</span>
                  </h3>

                  <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div>• ผู้จัด: {g.hostName}</div>
                    <div>• รางวัล: {g.maxWinners} ท่าน</div>
                    <div>• ผู้เข้าร่วม: <strong>{g._count.entries} คน</strong></div>
                    <div>• สิ้นสุด: {formatRelativeTime(g.endsAt)}</div>
                  </div>
                </div>

                <div
                  style={{
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>ID: {g.id}</span>
                  <span>สร้างเมื่อ {formatRelativeTime(g.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
