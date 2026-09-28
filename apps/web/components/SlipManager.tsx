"use client";

import { useState, useEffect } from "react";
import { formatDate, formatCurrency, getDiscordAvatarUrl } from "@/lib/utils";

interface Slip {
  id: string;
  userId: string | null;
  discordId: string;
  discordName: string;
  channelId: string | null;
  ticketId: string | null;
  imageUrl: string;
  r2Key: string | null;
  originalName: string | null;
  amount: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  } | null;
  reviewedBy?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  } | null;
}

interface SlipStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalApprovedAmount: number;
}

export default function SlipManager() {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [stats, setStats] = useState<SlipStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalApprovedAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  // Modals
  const [previewSlip, setPreviewSlip] = useState<Slip | null>(null);
  const [approvingSlip, setApprovingSlip] = useState<Slip | null>(null);
  const [rejectingSlip, setRejectingSlip] = useState<Slip | null>(null);
  const [approveAmount, setApproveAmount] = useState<string>("");
  const [approveNote, setApproveNote] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (activeTab !== "ALL") query.set("status", activeTab);
      if (search.trim()) query.set("search", search.trim());

      const res = await fetch(`/api/slips?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSlips(data.slips || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching slips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSlips();
  };

  const handleOpenApprove = (slip: Slip) => {
    setApprovingSlip(slip);
    setApproveAmount(slip.amount ? String(slip.amount) : "100");
    setApproveNote("");
  };

  const handleOpenReject = (slip: Slip) => {
    setRejectingSlip(slip);
    setRejectReason("");
  };

  const handleConfirmApprove = async () => {
    if (!approvingSlip) return;
    const amountVal = parseFloat(approveAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("กรุณากรอกจำนวนเงินเป็นตัวเลขที่มากกว่า 0");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/slips/${approvingSlip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          amount: amountVal,
          note: approveNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setApprovingSlip(null);
        if (previewSlip?.id === approvingSlip.id) {
          setPreviewSlip(null);
        }
        await fetchSlips();
      } else {
        const data = await res.json();
        alert(`เกิดข้อผิดพลาด: ${data.error || "ไม่สามารถอนุมัติได้"}`);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingSlip) return;
    if (!rejectReason.trim()) {
      alert("กรุณาระบุสาเหตุที่ปฏิเสธสลิป");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/slips/${rejectingSlip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          note: rejectReason.trim(),
        }),
      });

      if (res.ok) {
        setRejectingSlip(null);
        if (previewSlip?.id === rejectingSlip.id) {
          setPreviewSlip(null);
        }
        await fetchSlips();
      } else {
        const data = await res.json();
        alert(`เกิดข้อผิดพลาด: ${data.error || "ไม่สามารถปฏิเสธได้"}`);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* 1. Summary Metrics */}
      <div className="stats-grid mb-24">
        <div className="stat-card" style={{ borderColor: stats.pending > 0 ? "rgba(255, 159, 10, 0.4)" : undefined }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(255, 159, 10, 0.15)", color: "#ff9f0a" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            {stats.pending > 0 && (
              <span className="badge badge-warning" style={{ fontSize: "11px", fontWeight: "600" }}>
                ต้องดำเนินการ
              </span>
            )}
          </div>
          <div className="stat-card-value" style={{ color: stats.pending > 0 ? "#ff9f0a" : undefined }}>
            {stats.pending}
          </div>
          <div className="stat-card-label">รอตรวจสอบ (Pending)</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(48, 209, 88, 0.15)", color: "#30d158" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <span className="badge badge-success">สำเร็จ</span>
          </div>
          <div className="stat-card-value">{stats.approved}</div>
          <div className="stat-card-label">อนุมัติแล้ว (Approved)</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(255, 69, 58, 0.15)", color: "#ff453a" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{stats.rejected}</div>
          <div className="stat-card-label">ปฏิเสธแล้ว (Rejected)</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(0, 113, 227, 0.15)", color: "#2997ff" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{formatCurrency(stats.totalApprovedAmount)}</div>
          <div className="stat-card-label">ยอดเงินอนุมัติรวม</div>
        </div>
      </div>

      {/* 2. Controls & Tabs */}
      <div className="card mb-24">
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Tab Buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              className={`btn btn-sm ${activeTab === "ALL" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("ALL")}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              className={`btn btn-sm ${activeTab === "PENDING" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("PENDING")}
              style={{
                background: activeTab === "PENDING" ? "#ff9f0a" : undefined,
                borderColor: activeTab === "PENDING" ? "#ff9f0a" : undefined,
                color: activeTab === "PENDING" ? "#000" : undefined,
              }}
            >
              ⏳ รอตรวจสอบ ({stats.pending})
            </button>
            <button
              className={`btn btn-sm ${activeTab === "APPROVED" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("APPROVED")}
            >
              ✅ อนุมัติแล้ว ({stats.approved})
            </button>
            <button
              className={`btn btn-sm ${activeTab === "REJECTED" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("REJECTED")}
            >
              ❌ ปฏิเสธ ({stats.rejected})
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", minWidth: 260 }}>
            <input
              type="text"
              className="form-input"
              placeholder="ค้นหาชื่อผู้ใช้, Discord ID, รหัสทิกเก็ต..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: "13px" }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              ค้นหา
            </button>
          </form>
        </div>
      </div>

      {/* 3. Slips List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span className="card-title-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </span>
            รายการสลิปโอนเงินทั้งหมด ({slips.length})
          </h3>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
              กำลังโหลดข้อมูลสลิป...
            </div>
          ) : slips.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">ไม่พบรายการสลิปโอนเงิน</p>
              <p className="empty-state-text">
                เมื่อมีลูกค้าส่งสลิปผ่านห้องทิกเก็ตหรือช่องทางส่งสลิปในดิสคอร์ด รายการจะแสดงที่นี่อัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ภาพสลิป</th>
                    <th>ผู้ส่งสลิป</th>
                    <th>ยอดเงิน</th>
                    <th>ที่มา / ทิกเก็ต</th>
                    <th>สถานะ</th>
                    <th>วันที่ส่ง</th>
                    <th>ผู้ตรวจสอบ</th>
                    <th style={{ textAlign: "right" }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {slips.map((slip) => (
                    <tr key={slip.id}>
                      {/* Image Thumbnail */}
                      <td style={{ width: "90px" }}>
                        <div
                          style={{
                            width: "72px",
                            height: "72px",
                            borderRadius: "10px",
                            overflow: "hidden",
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            cursor: "pointer",
                            position: "relative",
                          }}
                          onClick={() => setPreviewSlip(slip)}
                          title="คลิกเพื่อดูรูปภาพสลิปขนาดเต็ม"
                        >
                          <img
                            src={slip.imageUrl}
                            alt="Slip"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              transition: "transform 0.2s",
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,0.25)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0,
                              transition: "opacity 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                              <circle cx="11" cy="11" r="8"/>
                              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                          </div>
                        </div>
                      </td>

                      {/* Submitter */}
                      <td>
                        <div className="table-user">
                          <div className="table-avatar">
                            <img
                              src={getDiscordAvatarUrl(slip.discordId, slip.user?.avatar || null)}
                              alt={slip.discordName}
                            />
                          </div>
                          <div>
                            <div className="table-user-name" style={{ fontWeight: 600 }}>
                              {slip.user?.displayName || slip.discordName}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              ID: {slip.discordId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td>
                        {slip.amount ? (
                          <span style={{ fontWeight: 700, color: "#30d158", fontSize: "14px" }}>
                            {formatCurrency(slip.amount)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>— ไม่ระบุ —</span>
                        )}
                      </td>

                      {/* Origin / Ticket */}
                      <td>
                        {slip.ticketId ? (
                          <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}>
                            🎫 #{slip.ticketId}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>ส่งตรง</span>
                        )}
                        {slip.r2Key && (
                          <div style={{ fontSize: "10px", color: "#2997ff", marginTop: "3px" }}>
                            ☁️ Cloudflare R2
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge ${
                            slip.status === "APPROVED"
                              ? "badge-success"
                              : slip.status === "PENDING"
                                ? "badge-warning"
                                : "badge-error"
                          }`}
                        >
                          {slip.status === "APPROVED"
                            ? "อนุมัติแล้ว"
                            : slip.status === "PENDING"
                              ? "รอตรวจสอบ"
                              : "ปฏิเสธ"}
                        </span>
                      </td>

                      {/* Created At */}
                      <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                        {formatDate(slip.createdAt)}
                      </td>

                      {/* Reviewer & Note */}
                      <td>
                        {slip.reviewedByName ? (
                          <div>
                            <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
                              {slip.reviewedByName}
                            </div>
                            {slip.note && (
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                {slip.note}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>— ยังไม่ตรวจ —</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPreviewSlip(slip)}
                            title="ดูรูปภาพ"
                          >
                            ดูรูป
                          </button>
                          {slip.status === "PENDING" && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ background: "#30d158", borderColor: "#30d158", color: "#000" }}
                                onClick={() => handleOpenApprove(slip)}
                              >
                                อนุมัติ
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleOpenReject(slip)}
                              >
                                ปฏิเสธ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. Full Lightbox Image Preview Modal                     */}
      {/* ======================================================== */}
      {previewSlip && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setPreviewSlip(null)}
        >
          <div
            style={{
              background: "#16161c",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 32px 64px rgba(0,0,0,0.8)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#fff" }}>
                  ภาพสลิปโอนเงิน • #{previewSlip.id.slice(-6).toUpperCase()}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                  ผู้ส่ง: {previewSlip.discordName} ({previewSlip.discordId}) • {formatDate(previewSlip.createdAt)}
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <a
                  href={previewSlip.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: "none" }}
                >
                  เปิดภาพต้นฉบับ ↗
                </a>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPreviewSlip(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body / Image */}
            <div
              style={{
                padding: "20px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.6)",
              }}
            >
              <img
                src={previewSlip.imageUrl}
                alt="Full Slip Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "65vh",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              />
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#1c1c24",
              }}
            >
              <div>
                <span
                  className={`badge ${
                    previewSlip.status === "APPROVED"
                      ? "badge-success"
                      : previewSlip.status === "PENDING"
                        ? "badge-warning"
                        : "badge-error"
                  }`}
                >
                  {previewSlip.status === "APPROVED"
                    ? `อนุมัติแล้ว (฿${previewSlip.amount?.toLocaleString("th-TH") || 0})`
                    : previewSlip.status === "PENDING"
                      ? "รอการตรวจสอบ"
                      : "ปฏิเสธ"}
                </span>
                {previewSlip.note && (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>
                    ({previewSlip.note})
                  </span>
                )}
              </div>

              {previewSlip.status === "PENDING" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn btn-primary"
                    style={{ background: "#30d158", borderColor: "#30d158", color: "#000" }}
                    onClick={() => handleOpenApprove(previewSlip)}
                  >
                    ✅ อนุมัติ & เติมเงิน
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleOpenReject(previewSlip)}
                  >
                    ❌ ปฏิเสธสลิป
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. Approve Dialog Modal                                  */}
      {/* ======================================================== */}
      {approvingSlip && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => !submitting && setApprovingSlip(null)}
        >
          <div
            style={{
              background: "#16161c",
              border: "1px solid rgba(48, 209, 88, 0.3)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "600", color: "#30d158" }}>
                ✅ อนุมัติสลิปโอนเงิน & ปรับยอดเงินเข้ากระเป๋า
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                สลิปของ: {approvingSlip.discordName} ({approvingSlip.discordId})
              </p>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
                  จำนวนเงินที่ต้องการเติมเข้ากระเป๋า (THB) <span style={{ color: "#ff453a" }}>*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="เช่น 100, 300, 500"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  style={{ width: "100%", fontSize: "15px", fontWeight: 600 }}
                  min="1"
                  step="0.01"
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น ตรวจสอบยอดเงินเรียบร้อยผ่าน PromptPay"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div
                style={{
                  background: "rgba(48, 209, 88, 0.08)",
                  border: "1px solid rgba(48, 209, 88, 0.2)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontSize: "12px",
                  color: "#30d158",
                  lineHeight: "1.5",
                }}
              >
                เมื่อกดยืนยัน ระบบจะเพิ่มยอดเงินเข้ากระเป๋า Wallet ของสมาชิกในระบบดิสคอร์ดทันที พร้อมบันทึกประวัติการเงิน
              </div>
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                background: "#1c1c24",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => setApprovingSlip(null)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "#30d158", borderColor: "#30d158", color: "#000", fontWeight: 600 }}
                disabled={submitting}
                onClick={handleConfirmApprove}
              >
                {submitting ? "กำลังบันทึก..." : "ยืนยันการอนุมัติ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. Reject Dialog Modal                                   */}
      {/* ======================================================== */}
      {rejectingSlip && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => !submitting && setRejectingSlip(null)}
        >
          <div
            style={{
              background: "#16161c",
              border: "1px solid rgba(255, 69, 58, 0.3)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "600", color: "#ff453a" }}>
                ❌ ปฏิเสธสลิปโอนเงิน
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                สลิปของ: {rejectingSlip.discordName} ({rejectingSlip.discordId})
              </p>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
                  ระบุสาเหตุที่ปฏิเสธสลิป <span style={{ color: "#ff453a" }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  placeholder="เช่น ไม่พบยอดโอนเงินจริงในบัญชี, สลิปซ้ำซ้อน, ยอดเงินไม่ถูกต้อง"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: "100%", minHeight: "90px", fontSize: "13px", resize: "vertical" }}
                  autoFocus
                />
              </div>

              <div
                style={{
                  background: "rgba(255, 69, 58, 0.08)",
                  border: "1px solid rgba(255, 69, 58, 0.2)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontSize: "12px",
                  color: "#ff453a",
                  lineHeight: "1.5",
                }}
              >
                สลิปนี้จะถูกเปลี่ยนสถานะเป็นปฏิเสธ และบันทึกประวัติไว้โดยไม่มีการปรับยอดเงินเข้ากระเป๋า
              </div>
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                background: "#1c1c24",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => setRejectingSlip(null)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={submitting}
                onClick={handleConfirmReject}
              >
                {submitting ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
