"use client";

import React, { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";

interface WarningItem {
  id: string;
  discordId: string;
  discordName: string;
  issuedById: string;
  issuedBy: string;
  reason: string;
  severity: string;
  isActive: boolean;
  createdAt: string;
}

const SEVERITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: "ระดับเบา", color: "#2997ff", bg: "rgba(41, 151, 255, 0.15)" },
  MEDIUM: { label: "ปานกลาง", color: "#ff9f0a", bg: "rgba(255, 159, 10, 0.15)" },
  HIGH: { label: "ร้ายแรง", color: "#ff6b00", bg: "rgba(255, 107, 0, 0.15)" },
  CRITICAL: { label: "วิกฤต", color: "#ff453a", bg: "rgba(255, 69, 58, 0.15)" },
};

export default function ModerationManager() {
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadWarnings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/moderation");
      if (res.ok) {
        const json = await res.json();
        setWarnings(json.warnings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarnings();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/moderation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      if (res.ok) loadWarnings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบประวัติการเตือนนี้หรือไม่?")) return;
    try {
      const res = await fetch(`/api/moderation?id=${id}`, { method: "DELETE" });
      if (res.ok) loadWarnings();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredWarnings = warnings.filter((w) => {
    if (selectedSeverity === "ALL") return true;
    return w.severity === selectedSeverity;
  });

  const activeCount = warnings.filter((w) => w.isActive).length;
  const criticalCount = warnings.filter((w) => w.severity === "CRITICAL" && w.isActive).length;

  return (
    <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>การเตือนทั้งหมด</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", marginTop: "4px" }}>
            {warnings.length} ครั้ง
          </div>
        </div>

        <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 159, 10, 0.3)" }}>
          <div style={{ fontSize: "12px", color: "#ff9f0a" }}>กำลังมีผลบังคับใช้</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#ff9f0a", marginTop: "4px" }}>
            {activeCount} ครั้ง
          </div>
        </div>

        <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 69, 58, 0.3)" }}>
          <div style={{ fontSize: "12px", color: "#ff453a" }}>ระดับวิกฤต (Critical)</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#ff453a", marginTop: "4px" }}>
            {criticalCount} ครั้ง
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", overflowX: "auto" }}>
        {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((sev) => (
          <button
            key={sev}
            type="button"
            onClick={() => setSelectedSeverity(sev)}
            style={{
              padding: "6px 14px",
              borderRadius: "9999px",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: selectedSeverity === sev ? "#2997ff" : "rgba(255, 255, 255, 0.05)",
              color: selectedSeverity === sev ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            {sev === "ALL" ? "ทั้งหมด" : SEVERITY_MAP[sev]?.label || sev}
          </button>
        ))}
      </div>

      {/* Warnings List Table */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "var(--text-secondary)" }}>สมาชิก</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "var(--text-secondary)" }}>เหตุผล</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>ความรุนแรง</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "var(--text-secondary)" }}>ผู้เตือน</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>สถานะ</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: "var(--text-secondary)" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredWarnings.map((w) => {
              const sev = SEVERITY_MAP[w.severity] || SEVERITY_MAP.LOW;
              return (
                <tr key={w.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>{w.discordName}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ID: {w.discordId}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", maxWidth: "260px" }}>
                    {w.reason}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: sev.bg, color: sev.color }}>
                      {sev.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    <div>{w.issuedBy}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{formatRelativeTime(w.createdAt)}</div>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: w.isActive ? "#30d158" : "var(--text-muted)" }}>
                      {w.isActive ? "🔴 กำลังมีผล" : "⚪ ยกเลิก"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(w.id, w.isActive)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        {w.isActive ? "ยกเลิกเตือน" : "เปิดใช้งาน"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(w.id)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "rgba(255, 69, 58, 0.1)",
                          border: "1px solid rgba(255, 69, 58, 0.2)",
                          color: "#ff453a",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
