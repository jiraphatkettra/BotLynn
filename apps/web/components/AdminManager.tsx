"use client";

import React, { useState } from "react";
import { getRoleInfo, getDiscordAvatarUrl } from "@/lib/utils";

interface PermissionItem {
  id: string;
  userId: string;
  permission: string;
  granted: boolean;
}

interface AdminUser {
  id: string;
  discordId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  balance?: number;
  createdAt: string | Date;
  permissions?: PermissionItem[];
  attendances?: { clockIn: string | Date }[];
  _count: {
    attendances: number;
    transactions: number;
  };
}

interface AdminManagerProps {
  initialAdmins: AdminUser[];
  isOwner: boolean;
}

const AVAILABLE_PERMISSIONS = [
  {
    key: "shop.manage",
    name: "จัดการร้านค้ายศ",
    desc: "เพิ่ม ลบ หรือแก้ไขราคาและจำนวนสต๊อกยศในร้านค้า",
  },
  {
    key: "attendance.manage",
    name: "จัดการระบบตอกบัตร",
    desc: "ตรวจสอบและจัดการบันทึกเวลาเข้า-ออกงานของแอดมิน",
  },
  {
    key: "admin.manage",
    name: "จัดการสิทธิ์ทีมงาน",
    desc: "มอบหมายบทบาทและกำหนดสิทธิ์ของสมาชิกในระบบ",
  },
  {
    key: "logs.view",
    name: "ดูประวัติกิจกรรม (Audit Logs)",
    desc: "เข้าถึงบันทึกการทำงานและตรวจสอบกิจกรรมย้อนหลัง",
  },
  {
    key: "settings.manage",
    name: "ตั้งค่าระบบบอทและห้อง Discord",
    desc: "กำหนดห้องส่งข้อความแจ้งเตือนและตั้งค่าระบบหลัก",
  },
];

export default function AdminManager({
  initialAdmins,
  isOwner,
}: AdminManagerProps) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);

  // Selected admin for modals
  const [profileTarget, setProfileTarget] = useState<AdminUser | null>(null);
  const [permTarget, setPermTarget] = useState<AdminUser | null>(null);

  // Form states for permissions modal
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [selectedIsActive, setSelectedIsActive] = useState(true);
  const [permissionsState, setPermissionsState] = useState<Record<string, boolean>>({});
  const [savingPerms, setSavingPerms] = useState(false);
  const [permError, setPermError] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Copy ID toast
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Open Permissions Modal
  function handleOpenPermissionsModal(admin: AdminUser) {
    setPermTarget(admin);
    setSelectedRole(admin.role);
    setSelectedIsActive(admin.isActive);
    setPermError("");
    setSaveSuccessMsg("");

    // Build permissions map
    const map: Record<string, boolean> = {};
    AVAILABLE_PERMISSIONS.forEach((p) => {
      // Default to true if OWNER or MANAGER, or find in admin.permissions
      const found = admin.permissions?.find((perm) => perm.permission === p.key);
      map[p.key] = found ? found.granted : admin.role === "OWNER" || admin.role === "MANAGER";
    });
    setPermissionsState(map);
  }

  // Save Permissions & Role
  async function handleSavePermissions(e: React.FormEvent) {
    e.preventDefault();
    if (!permTarget || !isOwner) return;

    setSavingPerms(true);
    setPermError("");
    setSaveSuccessMsg("");

    try {
      const permsArray = Object.entries(permissionsState).map(([permission, granted]) => ({
        permission,
        granted,
      }));

      const res = await fetch("/api/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: permTarget.id,
          role: selectedRole,
          isActive: selectedIsActive,
          permissions: permsArray,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPermError(data.error || "เกิดข้อผิดพลาดในการบันทึกสิทธิ์");
        return;
      }

      // Update state
      setAdmins((prev) =>
        prev.map((a) => (a.id === permTarget.id ? { ...a, ...data.data } : a))
      );
      setSaveSuccessMsg("บันทึกสิทธิ์และบทบาทสำเร็จแล้ว!");
      setTimeout(() => {
        setPermTarget(null);
        setSaveSuccessMsg("");
      }, 1500);
    } catch (err: any) {
      setPermError(err.message || "Failed to update permissions");
    } finally {
      setSavingPerms(false);
    }
  }

  return (
    <>
      {/* 1. Proportional Stats Row (Minimal Monochrome SVGs, Zero Emojis) */}
      <div className="stats-grid mb-24">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{admins.length}</div>
          <div className="stat-card-label">แอดมินทั้งหมด</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ color: "var(--success)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">
            {admins.filter((a) => a.isActive).length}
          </div>
          <div className="stat-card-label">เปิดใช้งานอยู่</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ color: "var(--accent)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">
            {admins.filter((a) => a.role === "OWNER" || a.role === "MANAGER").length}
          </div>
          <div className="stat-card-label">ผู้จัดการ / Owner</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">
            {admins.filter((a) => a.role === "MODERATOR").length}
          </div>
          <div className="stat-card-label">Moderator</div>
        </div>
      </div>

      {/* 2. Admin Cards Grid */}
      {admins.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {admins.map((admin) => {
            const roleInfo = getRoleInfo(admin.role);
            const lastAttendance = admin.attendances?.[0];

            return (
              <div
                key={admin.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  transition: "all 0.2s ease",
                }}
              >
                <div>
                  {/* Card Header: Avatar & User Info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid var(--border-default)",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={getDiscordAvatarUrl(admin.discordId, admin.avatar)}
                        alt={admin.displayName || admin.username}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {admin.displayName || admin.username}
                        </h4>
                        <span className={`role-badge ${roleInfo.className}`}>
                          {roleInfo.label}
                        </span>
                      </div>
                      <p
                        className="text-muted text-xs"
                        style={{ fontFamily: "var(--font-mono)", marginTop: 2 }}
                      >
                        @{admin.username}
                      </p>
                    </div>
                  </div>

                  {/* Admin Metrics Mini-Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "10px 12px",
                      marginBottom: 12,
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {admin._count.attendances}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                        ตอกบัตร
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {admin._count.transactions}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                        ขายยศ
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                        {admin.isActive ? (
                          <span style={{ color: "var(--success)" }}>ใช้งาน</span>
                        ) : (
                          <span style={{ color: "var(--danger)" }}>ระงับ</span>
                        )}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                        สถานะ
                      </div>
                    </div>
                  </div>

                  {/* Last Attendance Info */}
                  {lastAttendance ? (
                    <p className="text-xs text-muted">
                      ตอกบัตรล่าสุด:{" "}
                      {new Date(lastAttendance.clockIn).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted">ยังไม่มีประวัติตอกบัตร</p>
                  )}
                </div>

                {/* Card Action Buttons: View Profile & Manage Permissions */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: 14,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, gap: 6, fontSize: 12 }}
                    onClick={() => setProfileTarget(admin)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 1 0-16 0" />
                    </svg>
                    ดูโปรไฟล์
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, gap: 6, fontSize: 12 }}
                    onClick={() => handleOpenPermissionsModal(admin)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {isOwner ? "จัดการสิทธิ์" : "ดูสิทธิ์"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card mb-24">
          <div className="card-body">
            <div className="empty-state">
              <p className="empty-state-title">ยังไม่มีแอดมินในระบบ</p>
              <p className="empty-state-text">
                แอดมินจะปรากฏขึ้นโดยอัตโนมัติเมื่อเข้าสู่ระบบด้วย Discord
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADMIN PROFILE MODAL */}
      {/* ========================================================================= */}
      {profileTarget && (
        <div className="modal-overlay" onClick={() => setProfileTarget(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">โปรไฟล์ทีมงาน</h3>
              <button
                className="btn-ghost"
                onClick={() => setProfileTarget(null)}
                style={{ cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Profile Card Center */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "10px 0 18px",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid rgba(255, 255, 255, 0.12)",
                    marginBottom: 12,
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <img
                    src={getDiscordAvatarUrl(profileTarget.discordId, profileTarget.avatar)}
                    alt={profileTarget.displayName || profileTarget.username}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                    }}
                  />
                </div>

                <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
                  {profileTarget.displayName || profileTarget.username}
                </h3>
                <p
                  className="text-muted text-xs"
                  style={{ fontFamily: "var(--font-mono)", marginTop: 2 }}
                >
                  @{profileTarget.username}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <span className={`role-badge ${getRoleInfo(profileTarget.role).className}`}>
                    {getRoleInfo(profileTarget.role).label}
                  </span>
                  <span
                    className={`badge ${
                      profileTarget.isActive ? "badge-success" : "badge-error"
                    }`}
                  >
                    {profileTarget.isActive ? "เปิดใช้งาน" : "ระงับการใช้งาน"}
                  </span>
                </div>
              </div>

              {/* Discord ID Box */}
              <div
                onClick={() => handleCopy(profileTarget.discordId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  cursor: "pointer",
                  marginBottom: 16,
                }}
                title="คลิกเพื่อคัดลอก Discord ID"
              >
                <div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>
                    Discord User ID
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {profileTarget.discordId}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--accent)" }}>
                  {copiedId === profileTarget.discordId ? "✓ คัดลอกแล้ว" : "คัดลอก"}
                </span>
              </div>

              {/* Work Metrics Breakdown */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 14px",
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    บันทึกการตอกบัตร
                  </span>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginTop: 4,
                    }}
                  >
                    {profileTarget._count.attendances} ครั้ง
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 14px",
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    รายการขายยศ
                  </span>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginTop: 4,
                    }}
                  >
                    {profileTarget._count.transactions} ครั้ง
                  </div>
                </div>
              </div>


              {/* Dates Info */}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>เข้าร่วมระบบเมื่อ:</span>
                <span>
                  {new Date(profileTarget.createdAt).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProfileTarget(null)}
              >
                ปิด
              </button>
              {isOwner && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const target = profileTarget;
                    setProfileTarget(null);
                    handleOpenPermissionsModal(target);
                  }}
                >
                  จัดการสิทธิ์
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PERMISSIONS & ROLE MANAGEMENT MODAL (Owner Only) */}
      {/* ========================================================================= */}
      {permTarget && (
        <div className="modal-overlay" onClick={() => setPermTarget(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                จัดการสิทธิ์: {permTarget.displayName || permTarget.username}
              </h3>
              <button
                className="btn-ghost"
                onClick={() => setPermTarget(null)}
                style={{ cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePermissions}>
              <div className="modal-body">
                {permError && (
                  <div
                    style={{
                      color: "var(--danger)",
                      fontSize: 12,
                      background: "var(--danger-subtle)",
                      padding: "8px 12px",
                      borderRadius: 8,
                    }}
                  >
                    {permError}
                  </div>
                )}

                {saveSuccessMsg && (
                  <div
                    style={{
                      color: "var(--success)",
                      fontSize: 12,
                      background: "var(--success-subtle)",
                      padding: "8px 12px",
                      borderRadius: 8,
                    }}
                  >
                    {saveSuccessMsg}
                  </div>
                )}

                {!isOwner && (
                  <div
                    style={{
                      color: "var(--warning)",
                      fontSize: 12,
                      background: "var(--warning-subtle)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  >
                    โหมดดูอย่างเดียว: เฉพาะระดับ Owner เท่านั้นที่สามารถแก้ไขสิทธิ์ได้
                  </div>
                )}

                {/* Role Level Selector */}
                <div className="form-group">
                  <label className="form-label">ระดับบทบาท (Role Level)</label>
                  <select
                    className="form-select"
                    value={selectedRole}
                    disabled={!isOwner || savingPerms}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    style={{ height: 40 }}
                  >
                    <option value="OWNER">Owner (สิทธิ์สูงสุดทุกระบบ)</option>
                    <option value="MANAGER">Manager (ผู้จัดการระบบ)</option>
                    <option value="ADMIN">Admin (ผู้ดูแลทั่วไป)</option>
                    <option value="MODERATOR">Moderator (ผู้ช่วยดูแล)</option>
                  </select>
                </div>

                {/* Account Status Switch */}
                <div className="form-group">
                  <label className="form-label">สถานะการเข้าใช้งานระบบ</label>
                  <label
                    className="flex items-center gap-8"
                    style={{ fontSize: 13, cursor: isOwner ? "pointer" : "default" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIsActive}
                      disabled={!isOwner || savingPerms}
                      onChange={(e) => setSelectedIsActive(e.target.checked)}
                    />
                    <span>เปิดให้เข้าใช้งานระบบ Dashboard</span>
                  </label>
                </div>

                {/* Granular Permissions Checkboxes */}
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label" style={{ marginBottom: 10 }}>
                    สิทธิ์การเข้าถึงรายฟังก์ชัน (Granular Permissions)
                  </label>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const isGranted = Boolean(permissionsState[perm.key]);
                      return (
                        <div
                          key={perm.key}
                          style={{
                            background: isGranted
                              ? "rgba(41, 151, 255, 0.04)"
                              : "rgba(255, 255, 255, 0.02)",
                            border: `1px solid ${
                              isGranted
                                ? "rgba(41, 151, 255, 0.25)"
                                : "var(--border-subtle)"
                            }`,
                            borderRadius: "var(--radius-md)",
                            padding: "10px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--text-primary)",
                              }}
                            >
                              {perm.name}
                            </div>
                            <div
                              className="text-muted"
                              style={{ fontSize: 11, marginTop: 2 }}
                            >
                              {perm.desc}
                            </div>
                          </div>

                          <label
                            style={{
                              position: "relative",
                              display: "inline-flex",
                              cursor: isOwner ? "pointer" : "default",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isGranted}
                              disabled={!isOwner || savingPerms}
                              onChange={(e) =>
                                setPermissionsState({
                                  ...permissionsState,
                                  [perm.key]: e.target.checked,
                                })
                              }
                              style={{ width: 18, height: 18 }}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPermTarget(null)}
                >
                  ปิด
                </button>
                {isOwner && (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingPerms}
                  >
                    {savingPerms ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
