"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

interface Backup {
  id: string;
  name: string;
  guildId: string;
  totalRoles: number;
  totalMembers: number;
  rolesData: Array<{
    id: string;
    name: string;
    color: number;
    hoist: boolean;
    position: number;
  }>;
  membersData: Record<string, string[]>;
  createdBy: string;
  createdAt: string;
}

export default function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [inspectBackup, setInspectBackup] = useState<Backup | null>(null);
  const [confirmRestoreBackup, setConfirmRestoreBackup] = useState<Backup | null>(
    null
  );

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/discord/backups");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (e) {
      console.error("Error fetching backups:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/discord/backups", { method: "POST" });
      if (res.ok) {
        await fetchBackups();
      } else {
        const data = await res.json();
        alert(data.error || "ไม่สามารถสร้างจุดสำรองได้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setCreating(false);
    }
  };

  const handleExecuteRestore = async (backup: Backup) => {
    try {
      setRestoringId(backup.id);
      const res = await fetch(`/api/discord/backups/${backup.id}/restore`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        alert(
          `✅ กู้คืนยศสำเร็จ!\n• สร้างยศใหม่: ${data.rolesRecreated} ยศ\n• อัปเดตสมาชิก: ${data.membersRestored} คน`
        );
        setConfirmRestoreBackup(null);
      } else {
        const data = await res.json();
        alert(data.error || "การกู้คืนล้มเหลว");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (backup: Backup) => {
    if (!confirm(`คุณต้องการลบจุดสำรอง "${backup.name}" ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/discord/backups/${backup.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBackups((prev) => prev.filter((b) => b.id !== backup.id));
      } else {
        alert("ไม่สามารถลบจุดสำรองได้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner & Trigger */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "linear-gradient(180deg, #111111 0%, #080808 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "24px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: "0 0 4px 0" }}>
            ระบบสำรองและกู้คืนยศเซิร์ฟเวอร์ (Auto Role Backup & Restore)
          </h2>
          <p style={{ fontSize: "13px", color: "#86868b", margin: 0 }}>
            บันทึก snapshot โครงสร้างยศ สียศ สิทธิ์ และการถือครองยศของสมาชิกทั้งหมด เพื่อกู้คืนได้ทันทีเมื่อเกิดเหตุฉุกเฉิน
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="btn btn-primary"
          style={{
            padding: "10px 18px",
            fontSize: "13px",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {creating ? "กำลังบันทึก Snapshot..." : "สำรองข้อมูลยศทันที"}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{backups.length}</div>
          <div className="stat-card-label">จุดสำรองทั้งหมด</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ fontSize: "16px", paddingTop: "8px" }}>
            {backups.length > 0 ? formatDate(backups[0].createdAt) : "—"}
          </div>
          <div className="stat-card-label">สำรองล่าสุด</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#34c759" }}>
            พร้อมกู้คืน
          </div>
          <div className="stat-card-label">สถานะความปลอดภัย</div>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="card" style={{ padding: "0px", overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
            รายการจุดสำรองข้อมูล ({backups.length})
          </h3>
          <span style={{ fontSize: "12px", color: "#86868b" }}>
            สามารถกู้คืนยศทั้งหมดได้ภายใน 1 คลิก
          </span>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ชื่อจุดสำรอง
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  จำนวนยศ
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  สมาชิกที่มีการบันทึก
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ผู้สร้าง
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  วันที่และเวลา
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "right" }}>
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#86868b" }}>
                    กำลังโหลดข้อมูลจุดสำรอง...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#86868b" }}>
                    ยังไม่มีจุดสำรองข้อมูลยศ กดปุ่ม "สำรองข้อมูลยศทันที" เพื่อสร้างจุดสำรองแรก
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#34c759" }}>●</span>
                        {b.name}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "#e5e5e7" }}>
                      {b.totalRoles} ยศ
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "#86868b" }}>
                      {b.totalMembers} คน
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "#86868b" }}>
                      {b.createdBy || "ระบบ"}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#86868b" }}>
                      {formatDate(b.createdAt)}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <button
                          onClick={() => setInspectBackup(b)}
                          className="btn btn-secondary"
                          style={{ padding: "5px 10px", fontSize: "12px" }}
                        >
                          ตรวจดูยศ
                        </button>
                        <button
                          onClick={() => setConfirmRestoreBackup(b)}
                          disabled={restoringId === b.id}
                          style={{
                            padding: "5px 12px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            background: "rgba(52,199,89,0.12)",
                            color: "#34c759",
                            border: "1px solid rgba(52,199,89,0.25)",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          {restoringId === b.id ? "กำลังกู้คืน..." : "กู้คืนยศ"}
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b)}
                          style={{
                            padding: "5px 8px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            background: "transparent",
                            color: "#ff453a",
                            border: "1px solid rgba(255,69,58,0.2)",
                            cursor: "pointer",
                          }}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Roles Modal */}
      {inspectBackup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setInspectBackup(null)}
        >
          <div
            style={{
              background: "#0c0c0c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                  รายการยศที่บันทึก ({inspectBackup.rolesData?.length || 0})
                </h3>
                <span style={{ fontSize: "12px", color: "#86868b" }}>
                  {inspectBackup.name}
                </span>
              </div>
              <button
                onClick={() => setInspectBackup(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#86868b",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: "20px 24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {inspectBackup.rolesData?.map((r, i) => {
                const hexColor =
                  r.color > 0 ? `#${r.color.toString(16).padStart(6, "0")}` : "#99aab5";
                return (
                  <div
                    key={r.id || i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: hexColor,
                          boxShadow: `0 0 8px ${hexColor}40`,
                        }}
                      />
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff" }}>
                        {r.name}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#86868b", fontFamily: "monospace" }}>
                      ID: {r.id}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Restore Modal */}
      {confirmRestoreBackup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setConfirmRestoreBackup(null)}
        >
          <div
            style={{
              background: "#0c0c0c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: "0 0 8px 0" }}>
                ยืนยันการกู้คืนยศทั้งหมด?
              </h3>
              <p style={{ fontSize: "13px", color: "#86868b", lineHeight: "1.5", margin: 0 }}>
                คุณกำลังจะกู้คืนยศจากจุดสำรอง: <strong style={{ color: "#ffffff" }}>{confirmRestoreBackup.name}</strong>
                <br /><br />
                ระบบจะตรวจสอบยศที่สูญหาย Recreate ยศขึ้นมาใหม่ และมอบยศคืนให้กับสมาชิกทั้งหมด {confirmRestoreBackup.totalMembers} คนในดิสคอร์ดตามประวัติที่บันทึกไว้
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmRestoreBackup(null)}
                className="btn btn-secondary"
                style={{ padding: "8px 16px", fontSize: "13px" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleExecuteRestore(confirmRestoreBackup)}
                disabled={restoringId === confirmRestoreBackup.id}
                style={{
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  background: "#34c759",
                  color: "#000000",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {restoringId === confirmRestoreBackup.id ? "กำลังกู้คืนยศ..." : "ยืนยันกู้คืนยศทันที"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
