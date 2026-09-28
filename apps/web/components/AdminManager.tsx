"use client";

import React, { useState, useEffect } from "react";
import { getRoleInfo, getDiscordAvatarUrl } from "@/lib/utils";
import CustomSelect from "@/components/CustomSelect";

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

interface DiscordRoleItem {
  id: string;
  name: string;
  color?: string;
  position: number;
}

interface AdminManagerProps {
  initialAdmins: AdminUser[];
  isOwner: boolean;
  currentUserId?: string;
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
  currentUserId,
}: AdminManagerProps) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");

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

  // Role Mapping states (Owner only)
  const [showRoleMappingModal, setShowRoleMappingModal] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [discordRoles, setDiscordRoles] = useState<DiscordRoleItem[]>([]);
  const [roleMappings, setRoleMappings] = useState({
    owner: "",
    manager: "",
    admin: "",
    moderator: "",
  });
  const [cleanUnmatchedOnSync, setCleanUnmatchedOnSync] = useState(true);
  const [savingMappings, setSavingMappings] = useState(false);
  const [mappingMsg, setMappingMsg] = useState("");
  const [mappingError, setMappingError] = useState("");

  // Quick Sync state
  const [syncingStaff, setSyncingStaff] = useState(false);

  // Delete Admin states
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Global Toast Message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Copy ID toast
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Fetch Discord Roles and current mappings when opening modal
  async function handleOpenRoleMappingModal() {
    setShowRoleMappingModal(true);
    setLoadingRoles(true);
    setMappingMsg("");
    setMappingError("");

    try {
      const res = await fetch("/api/admins/roles");
      const data = await res.json();
      if (res.ok) {
        if (data.roles) setDiscordRoles(data.roles);
        if (data.mappings) setRoleMappings(data.mappings);
      } else {
        setMappingError(data.error || "ไม่สามารถดึงข้อมูลยศจาก Discord ได้");
      }
    } catch (err: any) {
      setMappingError(err.message || "Failed to load Discord roles");
    } finally {
      setLoadingRoles(false);
    }
  }

  // Save role mappings and optionally sync staff members immediately
  async function handleSaveRoleMappings(andSync = false) {
    if (!isOwner) return;
    setSavingMappings(true);
    setMappingMsg("");
    setMappingError("");

    try {
      // 1. Save mappings
      const saveRes = await fetch("/api/admins/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleMappings),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setMappingError(saveData.error || "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า");
        setSavingMappings(false);
        return;
      }

      if (andSync) {
        setMappingMsg("บันทึกยศสำเร็จ กำลังดึงสมาชิกจาก Discord...");
        // 2. Trigger Sync
        const syncRes = await fetch("/api/admins/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cleanUnmatched: cleanUnmatchedOnSync }),
        });

        const syncData = await syncRes.json();
        if (syncRes.ok) {
          if (syncData.data) setAdmins(syncData.data);
          setMappingMsg(syncData.message || "ซิงค์สมาชิกสำเร็จเรียบร้อยแล้ว!");
          showToast(syncData.message || "ซิงค์สมาชิกสำเร็จ!");
          setTimeout(() => setShowRoleMappingModal(false), 1500);
        } else {
          setMappingError(syncData.error || "เกิดข้อผิดพลาดในการซิงค์สมาชิก");
        }
      } else {
        setMappingMsg("บันทึกการตั้งค่ายศเรียบร้อยแล้ว!");
        showToast("บันทึกการตั้งค่ายศเรียบร้อยแล้ว");
        setTimeout(() => setShowRoleMappingModal(false), 1200);
      }
    } catch (err: any) {
      setMappingError(err.message || "Operation failed");
    } finally {
      setSavingMappings(false);
    }
  }

  // Quick 1-click Sync from Discord
  async function handleQuickSync() {
    if (!isOwner) return;
    setSyncingStaff(true);
    try {
      const res = await fetch("/api/admins/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleanUnmatched: true }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.data) setAdmins(data.data);
        showToast(data.message || `ซิงค์สำเร็จ! อัปเดตทีมงาน ${data.data.length} ท่าน`, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Sync failed", "error");
    } finally {
      setSyncingStaff(false);
    }
  }

  // Delete Admin
  async function handleConfirmDeleteAdmin() {
    if (!deleteTarget || !isOwner) return;
    setDeletingAdmin(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/admins?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "เกิดข้อผิดพลาดในการลบแอดมิน");
        return;
      }

      // Remove from local list
      setAdmins((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      showToast(`ลบแอดมิน @${deleteTarget.username} ออกจากระบบเรียบร้อยแล้ว`, "success");
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete admin");
    } finally {
      setDeletingAdmin(false);
    }
  }

  // Open Permissions Modal
  function handleOpenPermissionsModal(admin: AdminUser) {
    setPermTarget(admin);
    setSelectedRole(admin.role);
    setSelectedIsActive(admin.isActive);
    setPermError("");
    setSaveSuccessMsg("");

    const map: Record<string, boolean> = {};
    AVAILABLE_PERMISSIONS.forEach((p) => {
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

      setAdmins((prev) =>
        prev.map((a) => (a.id === permTarget.id ? { ...a, ...data.data } : a))
      );
      setSaveSuccessMsg("บันทึกสิทธิ์และบทบาทสำเร็จแล้ว!");
      showToast("บันทึกสิทธิ์เรียบร้อยแล้ว", "success");
      setTimeout(() => {
        setPermTarget(null);
        setSaveSuccessMsg("");
      }, 1200);
    } catch (err: any) {
      setPermError(err.message || "Failed to update permissions");
    } finally {
      setSavingPerms(false);
    }
  }

  // Filtered Admins by Search Query & Role Filter
  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (admin.displayName && admin.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      admin.discordId.includes(searchQuery);

    const matchesRole = filterRole === "ALL" || admin.role === filterRole;

    return matchesSearch && matchesRole;
  });

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: "12px 20px",
            background: toastMessage.type === "success" ? "var(--bg-elevated)" : "#2c1515",
            border: `1px solid ${
              toastMessage.type === "success" ? "rgba(48, 209, 88, 0.4)" : "rgba(255, 69, 58, 0.4)"
            }`,
            borderRadius: "var(--radius-md)",
            color: toastMessage.type === "success" ? "var(--success)" : "var(--danger)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toastMessage.type === "success" ? "✓" : "✕"} {toastMessage.text}
        </div>
      )}

      {/* 1. Proportional Stats Row */}
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
            <div className="stat-card-icon" style={{ color: "var(--purple, #8b5cf6)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">
            {admins.filter((a) => a.role === "ADMIN" || a.role === "MODERATOR").length}
          </div>
          <div className="stat-card-label">Admin / Mod</div>
        </div>
      </div>

      {/* 2. Management & Filter Bar */}
      <div
        className="card mb-24"
        style={{
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Left: Search & Filter Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flex: 1 }}>
          <div style={{ position: "relative", minWidth: 220, maxWidth: 300, width: "100%" }}>
            <input
              type="text"
              className="form-input"
              placeholder="ค้นหาชื่อ, @username, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                height: 38,
                paddingLeft: 36,
                fontSize: 13,
                width: "100%",
              }}
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: "ทั้งหมด" },
              { id: "OWNER", label: "Owner" },
              { id: "MANAGER", label: "Manager" },
              { id: "ADMIN", label: "Admin" },
              { id: "MODERATOR", label: "Mod" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${filterRole === tab.id ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: 12, padding: "6px 12px", height: 38 }}
                onClick={() => setFilterRole(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Role Mapping and Sync Buttons */}
        {isOwner && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: 38, fontSize: 13, gap: 8 }}
              disabled={syncingStaff}
              onClick={handleQuickSync}
              title="ดึงข้อมูลสมาชิก Discord ที่มียศแอดมินเข้ามาในระบบทันที"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: syncingStaff ? "spin 1s linear infinite" : "none",
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {syncingStaff ? "กำลังซิงค์..." : "ซิงค์จาก Discord"}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ height: 38, fontSize: 13, gap: 8 }}
              onClick={handleOpenRoleMappingModal}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              ตั้งค่ายศแอดมิน (Role Mapping)
            </button>
          </div>
        )}
      </div>

      {/* 3. Admin Cards Grid */}
      {filteredAdmins.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {filteredAdmins.map((admin) => {
            const roleInfo = getRoleInfo(admin.role);
            const lastAttendance = admin.attendances?.[0];
            const isSelf = admin.id === currentUserId;

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

                {/* Card Action Buttons: View Profile, Manage Permissions, and Delete Admin */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: 14,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, gap: 5, fontSize: 12, padding: "0 8px" }}
                    onClick={() => setProfileTarget(admin)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 1 0-16 0" />
                    </svg>
                    โปรไฟล์
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, gap: 5, fontSize: 12, padding: "0 8px" }}
                    onClick={() => handleOpenPermissionsModal(admin)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {isOwner ? "สิทธิ์" : "ดูสิทธิ์"}
                  </button>

                  {/* Delete Admin Button (Owner only) */}
                  {isOwner && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: "0 10px",
                        fontSize: 12,
                        color: isSelf ? "var(--text-disabled)" : "var(--danger)",
                        borderColor: isSelf ? "transparent" : "rgba(255, 69, 58, 0.25)",
                        background: isSelf ? "transparent" : "rgba(255, 69, 58, 0.06)",
                      }}
                      disabled={isSelf}
                      title={isSelf ? "ไม่สามารถลบบัญชีของตนเองได้" : "ลบแอดมินออกจากระบบ"}
                      onClick={() => {
                        setDeleteError("");
                        setDeleteTarget(admin);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card mb-24">
          <div className="card-body">
            <div className="empty-state">
              <p className="empty-state-title">ไม่พบแอดมินที่ตรงกับเงื่อนไข</p>
              <p className="empty-state-text">
                {searchQuery || filterRole !== "ALL"
                  ? "ลองปรับคำค้นหาหรือตัวกรองบทบาทใหม่"
                  : "กรุณากด 'ตั้งค่ายศแอดมิน' หรือ 'ซิงค์จาก Discord' เพื่อดึงสมาชิกทีมงานเข้าสู่ระบบ"}
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

              {/* ID info */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div className="text-muted text-xs">Discord ID</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, marginTop: 2 }}>
                    {profileTarget.discordId}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => handleCopy(profileTarget.discordId)}
                >
                  {copiedId === profileTarget.discordId ? "คัดลอกแล้ว" : "คัดลอก"}
                </button>
              </div>

              {/* Attendance & Sales Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    การตอกบัตรทั้งหมด
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
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    ยอดขายยศในระบบ
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
                      marginBottom: 12,
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
                      marginBottom: 12,
                    }}
                  >
                    {saveSuccessMsg}
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
                                daylight: true,
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

      {/* ========================================================================= */}
      {/* MODAL 3: DISCORD ROLE MAPPING MODAL (Owner Only) */}
      {/* ========================================================================= */}
      {showRoleMappingModal && (
        <div className="modal-overlay" onClick={() => setShowRoleMappingModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                ⚙️ กำหนดยศ Discord สำหรับตำแหน่งแอดมิน
              </h3>
              <button
                className="btn-ghost"
                onClick={() => setShowRoleMappingModal(false)}
                style={{ cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="text-muted text-xs" style={{ marginBottom: 16, lineHeight: 1.6 }}>
                เลือกยศจากเซิร์ฟเวอร์ Discord สำหรับแต่ละตำแหน่ง เมื่อบันทึกแล้ว ระบบจะดึงสมาชิกที่มียศดังกล่าวเข้ามาเป็นทีมงานแอดมินใน Dashboard โดยอัตโนมัติ
              </p>

              {mappingError && (
                <div
                  style={{
                    color: "var(--danger)",
                    fontSize: 12,
                    background: "var(--danger-subtle)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  {mappingError}
                </div>
              )}

              {mappingMsg && (
                <div
                  style={{
                    color: "var(--success)",
                    fontSize: 12,
                    background: "var(--success-subtle)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  {mappingMsg}
                </div>
              )}

              {loadingRoles ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                  กำลังโหลดรายการยศจากเซิร์ฟเวอร์ Discord...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* 1. Owner Role */}
                  <div>
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>👑 ยศระดับ Owner (ผู้ดูแลสูงสุด)</span>
                    </label>
                    <CustomSelect
                      value={roleMappings.owner}
                      onChange={(val) => setRoleMappings((prev) => ({ ...prev, owner: val }))}
                      placeholder="— ไม่กำหนดยศนี้ —"
                      searchPlaceholder="ค้นหายศ Discord..."
                      options={[
                        { value: "", label: "— ไม่กำหนดยศนี้ —" },
                        ...discordRoles.map((r) => ({
                          value: r.id,
                          label: `@${r.name}`,
                          sub: `ID: ${r.id}`,
                          color: r.color,
                        })),
                      ]}
                    />
                  </div>

                  {/* 2. Manager Role */}
                  <div>
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>💼 ยศระดับ Manager (ผู้จัดการ)</span>
                    </label>
                    <CustomSelect
                      value={roleMappings.manager}
                      onChange={(val) => setRoleMappings((prev) => ({ ...prev, manager: val }))}
                      placeholder="— ไม่กำหนดยศนี้ —"
                      searchPlaceholder="ค้นหายศ Discord..."
                      options={[
                        { value: "", label: "— ไม่กำหนดยศนี้ —" },
                        ...discordRoles.map((r) => ({
                          value: r.id,
                          label: `@${r.name}`,
                          sub: `ID: ${r.id}`,
                          color: r.color,
                        })),
                      ]}
                    />
                  </div>

                  {/* 3. Admin Role */}
                  <div>
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🛡️ ยศระดับ Admin (ผู้ดูแลระบบ)</span>
                    </label>
                    <CustomSelect
                      value={roleMappings.admin}
                      onChange={(val) => setRoleMappings((prev) => ({ ...prev, admin: val }))}
                      placeholder="— ไม่กำหนดยศนี้ —"
                      searchPlaceholder="ค้นหายศ Discord..."
                      options={[
                        { value: "", label: "— ไม่กำหนดยศนี้ —" },
                        ...discordRoles.map((r) => ({
                          value: r.id,
                          label: `@${r.name}`,
                          sub: `ID: ${r.id}`,
                          color: r.color,
                        })),
                      ]}
                    />
                  </div>

                  {/* 4. Moderator Role */}
                  <div>
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🔰 ยศระดับ Moderator (ผู้ช่วยแอดมิน)</span>
                    </label>
                    <CustomSelect
                      value={roleMappings.moderator}
                      onChange={(val) => setRoleMappings((prev) => ({ ...prev, moderator: val }))}
                      placeholder="— ไม่กำหนดยศนี้ —"
                      searchPlaceholder="ค้นหายศ Discord..."
                      options={[
                        { value: "", label: "— ไม่กำหนดยศนี้ —" },
                        ...discordRoles.map((r) => ({
                          value: r.id,
                          label: `@${r.name}`,
                          sub: `ID: ${r.id}`,
                          color: r.color,
                        })),
                      ]}
                    />
                  </div>

                  {/* Clean unassigned checkbox */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 14px",
                      marginTop: 4,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={cleanUnmatchedOnSync}
                        onChange={(e) => setCleanUnmatchedOnSync(e.target.checked)}
                        style={{ marginTop: 2, width: 16, height: 16 }}
                      />
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          ล้างสมาชิกที่ไม่ได้มียศแอดมินเหล่านี้ออกจากระบบแอดมินอัตโนมัติ
                        </div>
                        <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                          แนะนำ: ช่วยคัดกรองสมาชิกทั่วไปที่เคยใช้คำสั่งบอทออก ให้เหลือเฉพาะทีมงานที่มียศจริง
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={savingMappings}
                onClick={() => setShowRoleMappingModal(false)}
              >
                ปิด
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={savingMappings || loadingRoles}
                  onClick={() => handleSaveRoleMappings(false)}
                >
                  บันทึกอย่างเดียว
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={savingMappings || loadingRoles}
                  onClick={() => handleSaveRoleMappings(true)}
                >
                  {savingMappings ? "กำลังดำเนินการ..." : "บันทึกและดึงสมาชิกทันที"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE ADMIN CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deletingAdmin && setDeleteTarget(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "var(--danger)" }}>
                🗑️ ยืนยันการลบแอดมินออกจากระบบ
              </h3>
              <button
                className="btn-ghost"
                disabled={deletingAdmin}
                onClick={() => setDeleteTarget(null)}
                style={{ cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 12 }}>
                คุณต้องการลบแอดมิน{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {deleteTarget.displayName || deleteTarget.username} (@{deleteTarget.username})
                </strong>{" "}
                ออกจากระบบ LynnBot ใช่หรือไม่?
              </p>

              <div
                style={{
                  background: "rgba(255, 69, 58, 0.08)",
                  border: "1px solid rgba(255, 69, 58, 0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                ⚠️ <strong>ผลกระทบ:</strong> สิทธิ์การเข้าใช้งานระบบแอดมินทั้งหมดของผู้ใช้นี้จะถูกนำออกทันที (แต่ประวัติการตอกบัตรและกิจกรรมเดิมจะยังคงอยู่)
              </div>

              {deleteError && (
                <div
                  style={{
                    color: "var(--danger)",
                    fontSize: 12,
                    background: "var(--danger-subtle)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    marginTop: 12,
                  }}
                >
                  {deleteError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deletingAdmin}
                onClick={() => setDeleteTarget(null)}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                className="btn btn-danger"
                style={{
                  background: "var(--danger)",
                  color: "#fff",
                  fontWeight: 500,
                }}
                disabled={deletingAdmin}
                onClick={handleConfirmDeleteAdmin}
              >
                {deletingAdmin ? "กำลังลบ..." : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
