"use client";

import { useState, useEffect } from "react";
import { formatDate, getDiscordAvatarUrl } from "@/lib/utils";

interface LeaveItem {
  id: string;
  leaveType: "SICK" | "PERSONAL" | "VACATION" | "OTHER";
  days: number;
  reason: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewNote: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    discordId: string;
  };
  reviewedBy?: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
}

export default function LeaveManager() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    activeToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Form states
  const [formType, setFormType] = useState("SICK");
  const [formDays, setFormDays] = useState(1);
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [formReason, setFormReason] = useState("");
  const [formError, setFormError] = useState("");

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.set("status", statusFilter);

      const res = await fetch(`/api/leaves?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Error fetching leaves:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReason.trim()) {
      setFormError("กรุณาระบุเหตุผลการลา");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType: formType,
          days: formDays,
          startDate: formStartDate,
          reason: formReason.trim(),
        }),
      });

      if (res.ok) {
        setIsSubmitModalOpen(false);
        setFormReason("");
        setFormDays(1);
        await fetchLeaves();
      } else {
        const data = await res.json();
        setFormError(data.error || "เกิดข้อผิดพลาดในการยื่นขอลางาน");
      }
    } catch (e) {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewLeave = async (leaveId: string, action: "APPROVE" | "REJECT") => {
    try {
      setReviewingId(leaveId);
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        await fetchLeaves();
      } else {
        const data = await res.json();
        alert(data.error || "ไม่สามารถดำเนินการได้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setReviewingId(null);
    }
  };

  const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
    SICK: { label: "ลาป่วย", color: "#ff453a", bg: "rgba(255,69,58,0.12)" },
    PERSONAL: { label: "ลากิจ", color: "#ff9500", bg: "rgba(255,149,0,0.12)" },
    VACATION: { label: "ลาพักร้อน", color: "#34c759", bg: "rgba(52,199,89,0.12)" },
    OTHER: { label: "อื่นๆ", color: "#86868b", bg: "rgba(255,255,255,0.06)" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 4-Metric Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderColor: "rgba(255,149,0,0.2)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(255,149,0,0.1)", color: "#ff9500" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#ff9500" }}>
            {stats.pending}
          </div>
          <div className="stat-card-label">รอพิจารณา (Pending)</div>
        </div>

        <div className="stat-card" style={{ borderColor: "rgba(52,199,89,0.2)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(52,199,89,0.1)", color: "#34c759" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#34c759" }}>
            {stats.approved}
          </div>
          <div className="stat-card-label">อนุมัติแล้ว (Approved)</div>
        </div>

        <div className="stat-card" style={{ borderColor: "rgba(41,151,255,0.2)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(41,151,255,0.1)", color: "#2997ff" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#2997ff" }}>
            {stats.activeToday} คน
          </div>
          <div className="stat-card-label">ลางานวันนี้ (Active Today)</div>
        </div>

        <div className="stat-card" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-label">คำขอลาทั้งหมด</div>
        </div>
      </div>

      {/* Control Bar */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "#080808",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "ทั้งหมด" },
            { id: "PENDING", label: "รอพิจารณา" },
            { id: "APPROVED", label: "อนุมัติแล้ว" },
            { id: "REJECTED", label: "ไม่อนุมัติ" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                border: "1px solid",
                borderColor:
                  statusFilter === tab.id
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.06)",
                background:
                  statusFilter === tab.id ? "#ffffff" : "rgba(255,255,255,0.03)",
                color: statusFilter === tab.id ? "#000000" : "#86868b",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="btn btn-primary"
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          ยื่นคำขอลางาน
        </button>
      </div>

      {/* Leave Requests Table */}
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
            รายการคำขอลางาน ({leaves.length})
          </h3>
          <span style={{ fontSize: "12px", color: "#86868b" }}>
            จัดการและอนุมัติวันลาของทีมงาน
          </span>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ผู้ขอลา
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ประเภทการลา
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ช่วงวันที่ลา
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  จำนวนวัน
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  เหตุผล
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  สถานะ
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ผู้พิจารณา
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "right" }}>
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#86868b" }}>
                    กำลังโหลดข้อมูลการลา...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#86868b" }}>
                    ไม่พบคำขอลางานในระบบ
                  </td>
                </tr>
              ) : (
                leaves.map((l) => {
                  const typeBadge = typeLabels[l.leaveType] || typeLabels.OTHER;
                  return (
                    <tr
                      key={l.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <img
                            src={getDiscordAvatarUrl(l.user.discordId, l.user.avatar)}
                            alt={l.user.displayName || l.user.username}
                            style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                            }}
                          />
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff" }}>
                              {l.user.displayName || l.user.username}
                            </div>
                            <div style={{ fontSize: "11px", color: "#86868b" }}>
                              @{l.user.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 20px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: typeBadge.bg,
                            color: typeBadge.color,
                          }}
                        >
                          {typeBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: "12px 20px", fontSize: "13px", color: "#e5e5e7" }}>
                        {formatDate(l.startDate)} - {formatDate(l.endDate)}
                      </td>

                      <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                        {l.days} วัน
                      </td>

                      <td style={{ padding: "12px 20px", fontSize: "13px", color: "#86868b", maxWidth: "200px" }}>
                        {l.reason}
                      </td>

                      <td style={{ padding: "12px 20px" }}>
                        {l.status === "PENDING" && (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "rgba(255,149,0,0.12)",
                              color: "#ff9500",
                              border: "1px solid rgba(255,149,0,0.2)",
                            }}
                          >
                            รอพิจารณา
                          </span>
                        )}
                        {l.status === "APPROVED" && (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "rgba(52,199,89,0.12)",
                              color: "#34c759",
                              border: "1px solid rgba(52,199,89,0.2)",
                            }}
                          >
                            อนุมัติแล้ว
                          </span>
                        )}
                        {l.status === "REJECTED" && (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 500,
                              background: "rgba(255,59,48,0.12)",
                              color: "#ff453a",
                              border: "1px solid rgba(255,59,48,0.2)",
                            }}
                          >
                            ไม่อนุมัติ
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 20px", fontSize: "13px", color: "#86868b" }}>
                        {l.reviewedBy ? l.reviewedBy.displayName || l.reviewedBy.username : "—"}
                      </td>

                      <td style={{ padding: "12px 20px", textAlign: "right" }}>
                        {l.status === "PENDING" ? (
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => handleReviewLeave(l.id, "APPROVE")}
                              disabled={reviewingId === l.id}
                              style={{
                                padding: "4px 10px",
                                fontSize: "12px",
                                borderRadius: "6px",
                                background: "#34c759",
                                color: "#000000",
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              อนุมัติ
                            </button>
                            <button
                              onClick={() => handleReviewLeave(l.id, "REJECT")}
                              disabled={reviewingId === l.id}
                              style={{
                                padding: "4px 10px",
                                fontSize: "12px",
                                borderRadius: "6px",
                                background: "rgba(255,59,48,0.1)",
                                color: "#ff453a",
                                border: "1px solid rgba(255,59,48,0.2)",
                                cursor: "pointer",
                              }}
                            >
                              ปฏิเสธ
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#48484a" }}>เรียบร้อย</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Leave Modal */}
      {isSubmitModalOpen && (
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
          onClick={() => setIsSubmitModalOpen(false)}
        >
          <div
            style={{
              background: "#0c0c0c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                ยื่นคำขอลางาน (Submit Leave Request)
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#86868b", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
                  ประเภทการลา
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "13px",
                  }}
                >
                  <option value="SICK">🤒 ลาป่วย (Sick Leave)</option>
                  <option value="PERSONAL">💼 ลากิจ (Personal Leave)</option>
                  <option value="VACATION">🏖️ ลาพักร้อน (Vacation)</option>
                  <option value="OTHER">📝 อื่นๆ (Other)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
                    วันที่เริ่มลา
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
                    จำนวนวัน
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formDays}
                    onChange={(e) => setFormDays(parseInt(e.target.value) || 1)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
                  เหตุผลการลา
                </label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="ระบุเหตุผลการลา หรือรายละเอียด..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "13px",
                    resize: "vertical",
                  }}
                />
              </div>

              {formError && (
                <div style={{ color: "#ff453a", fontSize: "12px" }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                >
                  {submitting ? "กำลังส่งคำขอ..." : "ยื่นขอลางาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
