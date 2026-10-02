"use client";

import { useState, useEffect } from "react";
import { formatDate, formatCurrency, getDiscordAvatarUrl } from "@/lib/utils";
import { triggerCelebration } from "@/lib/confetti";

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
  transRef?: string | null;
  isAutoVerified?: boolean;
  senderName?: string | null;
  senderBank?: string | null;
  receiverName?: string | null;
  receiverBank?: string | null;
  transDate?: string | null;
  rawSlipData?: any;
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
  autoVerified: number;
  totalApprovedAmount: number;
}

export default function SlipManager() {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [stats, setStats] = useState<SlipStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    autoVerified: 0,
    totalApprovedAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  // Modals & Actions
  const [previewSlip, setPreviewSlip] = useState<Slip | null>(null);
  const [approvingSlip, setApprovingSlip] = useState<Slip | null>(null);
  const [rejectingSlip, setRejectingSlip] = useState<Slip | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [approveAmount, setApproveAmount] = useState<string>("");
  const [approveNote, setApproveNote] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [isLaserScanning, setIsLaserScanning] = useState(true);
  const [showApprovalCelebration, setShowApprovalCelebration] = useState<{ id: string; amount: number; user: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Tab Title Badge
  useEffect(() => {
    if (stats.pending > 0) {
      document.title = `(${stats.pending}) ตรวจสลิป | LynnBot`;
    } else {
      document.title = "ตรวจสลิป | LynnBot";
    }
  }, [stats.pending]);

  // Auto-poll every 25s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSlips();
    }, 25000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, search]);

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
        // Trigger metallic & neon celebration confetti!
        triggerCelebration({
          particleCount: 150,
          spread: 85,
          colors: ["#FFD700", "#00F0FF", "#30D158", "#FFFFFF", "#FF9F0A"],
        });

        setShowApprovalCelebration({
          id: approvingSlip.id,
          amount: amountVal,
          user: approvingSlip.discordName,
        });
        setTimeout(() => setShowApprovalCelebration(null), 4500);

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

  const handleVerifyWithAPI = async (slip: Slip) => {
    try {
      setVerifyingId(slip.id);
      const res = await fetch(`/api/slips/${slip.id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.approved) {
        triggerCelebration();
        setShowApprovalCelebration({
          id: slip.id,
          amount: data.verification?.amount || slip.amount || 0,
          user: slip.user?.displayName || slip.discordName,
        });
        if (previewSlip?.id === slip.id) {
          setPreviewSlip(null);
        }
        await fetchSlips();
      } else if (data.rejected) {
        alert(`❌ สลิปถูกปฏิเสธ: ${data.message}`);
        await fetchSlips();
      } else {
        alert(`⚠️ ผลการตรวจสแกน: ${data.message || "ไม่สามารถอนุมัติอัตโนมัติได้ ต้องให้แอดมินตรวจด้วยตนเอง"}`);
        await fetchSlips();
      }
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`);
    } finally {
      setVerifyingId(null);
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
            <div className="stat-card-icon" style={{ background: "rgba(10, 132, 255, 0.15)", color: "#0A84FF" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </div>
            <span className="badge" style={{ background: "rgba(10, 132, 255, 0.15)", color: "#0A84FF" }}>AUTO</span>
          </div>
          <div className="stat-card-value">{stats.autoVerified}</div>
          <div className="stat-card-label">ตรวจอัตโนมัติ (SlipOK)</div>
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
          {/* Tab Buttons with Apple Segmented Control */}
          <div className="apple-segmented">
            <button
              type="button"
              className={`apple-segmented-item ${activeTab === "ALL" ? "active" : ""}`}
              onClick={() => setActiveTab("ALL")}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              type="button"
              className={`apple-segmented-item ${activeTab === "PENDING" ? "active" : ""}`}
              onClick={() => setActiveTab("PENDING")}
              style={activeTab === "PENDING" ? { background: "#ff9f0a", color: "#000" } : undefined}
            >
              ⏳ รอตรวจสอบ ({stats.pending})
            </button>
            <button
              type="button"
              className={`apple-segmented-item ${activeTab === "APPROVED" ? "active" : ""}`}
              onClick={() => setActiveTab("APPROVED")}
            >
              ✓ อนุมัติแล้ว ({stats.approved})
            </button>
            <button
              type="button"
              className={`apple-segmented-item ${activeTab === "REJECTED" ? "active" : ""}`}
              onClick={() => setActiveTab("REJECTED")}
            >
              ✕ ปฏิเสธ ({stats.rejected})
            </button>
          </div>

          {/* Controls Right Side: Auto-refresh + Search */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="btn btn-secondary btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderColor: autoRefresh ? "rgba(48, 209, 88, 0.4)" : "rgba(255, 255, 255, 0.1)",
                color: autoRefresh ? "#30d158" : "var(--text-muted)",
                fontSize: "12px",
              }}
              title="เปิด/ปิดการดึงข้อมูลสลิปใหม่อัตโนมัติทุก 25 วินาที"
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: autoRefresh ? "#30d158" : "#86868b",
                  boxShadow: autoRefresh ? "0 0 6px #30d158" : "none",
                }}
              />
              Auto Sync {autoRefresh ? "เปิด" : "ปิด"}
            </button>

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
                          {imageErrors[slip.id] ? (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255, 69, 58, 0.1)",
                                color: "#ff453a",
                                padding: "4px",
                                textAlign: "center",
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <span style={{ fontSize: "9px", marginTop: "3px", fontWeight: 600, lineHeight: 1.1 }}>ภาพหมดอายุ</span>
                            </div>
                          ) : (
                            <img
                              src={slip.imageUrl}
                              alt="Slip"
                              onError={() => setImageErrors((prev) => ({ ...prev, [slip.id]: true }))}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                transition: "transform 0.2s",
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                            />
                          )}
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
                          <div>
                            <span style={{ fontWeight: 700, color: "#30d158", fontSize: "14px" }}>
                              {formatCurrency(slip.amount)}
                            </span>
                            {slip.transRef && (
                              <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2 }}>
                                Ref: {slip.transRef}
                              </div>
                            )}
                            {slip.senderBank && (
                              <div style={{ fontSize: "10px", color: "var(--accent)", marginTop: 1 }}>
                                🏦 {slip.senderBank}
                              </div>
                            )}
                          </div>
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
                        {slip.r2Key ? (
                          <div style={{ fontSize: "10px", color: "#30d158", marginTop: "3px" }}>
                            ☁️ Cloudflare R2
                          </div>
                        ) : (
                          <div style={{ fontSize: "10px", color: "#ff9f0a", marginTop: "3px" }} title="ภาพถูกบันทึกผ่านลิงก์ Discord ชั่วคราว">
                            ⚡ Discord Link
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
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
                          {slip.isAutoVerified && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "rgba(48, 209, 88, 0.15)",
                                color: "#30d158",
                                border: "1px solid rgba(48, 209, 88, 0.3)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              ⚡ AUTO-VERIFIED
                            </span>
                          )}
                        </div>
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
                                className="btn btn-sm"
                                disabled={verifyingId === slip.id}
                                style={{
                                  background: "rgba(10, 132, 255, 0.15)",
                                  borderColor: "rgba(10, 132, 255, 0.4)",
                                  color: "#0A84FF",
                                  fontWeight: 600,
                                }}
                                onClick={() => handleVerifyWithAPI(slip)}
                                title="สแกนและตรวจสอบด้วย SlipOK / EasySlip API"
                              >
                                {verifyingId === slip.id ? "⏳ กำลังสแกน..." : "⚡ สแกน AI"}
                              </button>
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

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: isLaserScanning ? "rgba(0, 240, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    borderColor: isLaserScanning ? "rgba(0, 240, 255, 0.45)" : "rgba(255, 255, 255, 0.12)",
                    color: isLaserScanning ? "#00f0ff" : "rgba(255, 255, 255, 0.7)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: isLaserScanning ? "0 0 12px rgba(0, 240, 255, 0.25)" : "none",
                  }}
                  onClick={() => setIsLaserScanning(!isLaserScanning)}
                >
                  <span style={{ fontSize: "12px" }}>🛰️</span>
                  <span>{isLaserScanning ? "ปิดเลเซอร์สแกน" : "เปิดเลเซอร์สแกน"}</span>
                </button>

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

            {/* Body / Image with Laser Scan Line */}
            <div
              style={{
                padding: "20px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.75)",
              }}
            >
              {imageErrors[previewSlip.id] ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", maxWidth: 500 }}>
                  <div style={{ fontSize: "44px", marginBottom: "16px" }}>⚠️</div>
                  <h4 style={{ color: "#fff", fontSize: "17px", fontWeight: 600, marginBottom: "8px" }}>
                    ไฟล์ภาพสลิปหมดอายุหรือถูกลบจาก Discord
                  </h4>
                  <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "20px" }}>
                    สลิปนี้ถูกส่งผ่านห้องทิกเก็ตใน Discord ก่อนการเชื่อมต่อ Cloudflare R2 จะทำงานสมบูรณ์ เมื่อห้องทิกเก็ตถูกปิดลง ลิงก์ Discord ชั่วคราวจะถูกลบออกจาก CDN ถาวร
                  </p>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "left",
                      fontSize: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>ช่องทางที่มา:</span>
                      <span style={{ color: "#fff", fontWeight: 500 }}>{previewSlip.ticketId ? `#${previewSlip.ticketId}` : "ส่งตรง"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>วันที่ส่ง:</span>
                      <span style={{ color: "#fff" }}>{formatDate(previewSlip.createdAt)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>สถานะ:</span>
                      <span style={{ color: previewSlip.status === "APPROVED" ? "#30d158" : previewSlip.status === "REJECTED" ? "#ff453a" : "#ff9f0a", fontWeight: 600 }}>
                        {previewSlip.status === "APPROVED" ? "อนุมัติแล้ว" : previewSlip.status === "REJECTED" ? "ปฏิเสธแล้ว" : "รอตรวจสอบ"}
                      </span>
                    </div>
                    {previewSlip.amount && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>ยอดเงิน:</span>
                        <span style={{ color: "#30d158", fontWeight: 700 }}>{formatCurrency(previewSlip.amount)}</span>
                      </div>
                    )}
                    {previewSlip.note && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px", color: "var(--text-muted)" }}>
                        หมายเหตุ: {previewSlip.note}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", maxHeight: "65vh" }}>
                  <img
                    src={previewSlip.imageUrl}
                    alt="Full Slip Preview"
                    onError={() => setImageErrors((prev) => ({ ...prev, [previewSlip.id]: true }))}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "65vh",
                      objectFit: "contain",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                      display: "block",
                    }}
                  />

                  {/* Laser Scanning Beam */}
                  {isLaserScanning && (
                    <>
                      <div className="slip-laser-scanner" />
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          background: "rgba(10, 15, 25, 0.85)",
                          border: "1px solid rgba(0, 240, 255, 0.45)",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#00f0ff",
                          fontFamily: "var(--font-mono, monospace)",
                          letterSpacing: "0.06em",
                          boxShadow: "0 0 10px rgba(0, 240, 255, 0.3)",
                          pointerEvents: "none",
                          zIndex: 11,
                        }}
                      >
                        AI SCANNING // OCR ACTIVE
                      </div>
                    </>
                  )}
                </div>
              )}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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

                  {previewSlip.isAutoVerified && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(48, 209, 88, 0.15)",
                        color: "#30d158",
                        border: "1px solid rgba(48, 209, 88, 0.3)",
                      }}
                    >
                      ⚡ AUTO-VERIFIED
                    </span>
                  )}

                  {previewSlip.transRef && (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      Ref: {previewSlip.transRef}
                    </span>
                  )}
                </div>

                {previewSlip.senderName && (
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    ผู้โอน: {previewSlip.senderName} ({previewSlip.senderBank || "-"}) ➔ ผู้รับ: {previewSlip.receiverName || "-"} ({previewSlip.receiverBank || "-"})
                  </div>
                )}

                {previewSlip.note && (
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    หมายเหตุ: {previewSlip.note}
                  </div>
                )}
              </div>

              {previewSlip.status === "PENDING" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn btn-secondary"
                    disabled={verifyingId === previewSlip.id}
                    style={{
                      background: "rgba(10, 132, 255, 0.15)",
                      borderColor: "rgba(10, 132, 255, 0.4)",
                      color: "#0A84FF",
                      fontWeight: 600,
                    }}
                    onClick={() => handleVerifyWithAPI(previewSlip)}
                    title="สแกนผ่าน SlipOK / EasySlip API"
                  >
                    {verifyingId === previewSlip.id ? "⏳ กำลังสแกน..." : "⚡ สแกนด้วย AI/API"}
                  </button>
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
                {/* Apple Quick Amount Preset Pills */}
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {[50, 100, 200, 300, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setApproveAmount(String(amt))}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "var(--radius-pill)",
                        background: approveAmount === String(amt) ? "rgba(48, 209, 88, 0.2)" : "rgba(255, 255, 255, 0.05)",
                        border: `1px solid ${approveAmount === String(amt) ? "rgba(48, 209, 88, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
                        color: approveAmount === String(amt) ? "#30d158" : "var(--text-secondary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {amt.toLocaleString()} ฿
                    </button>
                  ))}
                </div>
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
                  style={{ width: "100%", minHeight: "80px", fontSize: "13px", resize: "vertical" }}
                  autoFocus
                />
                {/* Quick Reject Presets */}
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {[
                    "ไม่พบยอดโอนเงินจริงในบัญชี",
                    "สลิปซ้ำ / เคยถูกใช้งานไปแล้ว",
                    "ยอดเงินไม่ตรงกับรายการ",
                    "โอนผิดบัญชีปลายทาง",
                    "รูปภาพไม่ชัดเจน / ไม่มี QR",
                    "เวลาในสลิปไม่ถูกต้อง",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReason(preset)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "var(--radius-pill)",
                        background:
                          rejectReason === preset
                            ? "rgba(255, 69, 58, 0.25)"
                            : "rgba(255, 255, 255, 0.05)",
                        border: `1px solid ${
                          rejectReason === preset
                            ? "rgba(255, 69, 58, 0.6)"
                            : "rgba(255, 255, 255, 0.08)"
                        }`,
                        color:
                          rejectReason === preset
                            ? "#ff453a"
                            : "var(--text-secondary)",
                        fontSize: "11px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
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

      {/* Holographic Approval Celebration Popup */}
      {showApprovalCelebration && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            right: "32px",
            background: "linear-gradient(135deg, rgba(14, 20, 32, 0.96), rgba(8, 12, 22, 0.96))",
            border: "1px solid rgba(0, 240, 255, 0.45)",
            borderRadius: "18px",
            padding: "16px 22px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 240, 255, 0.3)",
            backdropFilter: "blur(24px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: "16px",
            animation: "delayedSkeletonFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(48, 209, 88, 0.15)",
              border: "1.5px solid rgba(48, 209, 88, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#30d158",
              fontSize: "22px",
              boxShadow: "0 0 16px rgba(48, 209, 88, 0.3)",
            }}
          >
            ✓
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#00F0FF",
                letterSpacing: "0.06em",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              TRANSACTION VERIFIED // SLIP APPROVED
            </div>
            <div style={{ fontSize: "14.5px", fontWeight: 600, color: "#ffffff", marginTop: "2px" }}>
              อนุมัติยอด ฿{formatCurrency(showApprovalCelebration.amount)} สำเร็จ
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
              สมาชิก: {showApprovalCelebration.user}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
