"use client";

import React, { useState } from "react";
import { getRoleInfo, getDiscordAvatarUrl, isRootOwner } from "@/lib/utils";

export interface PermissionUser {
  id: string;
  discordId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: string;
}

export interface PermissionItem {
  id?: string;
  userId: string;
  permission: string;
  granted: boolean;
}

export const PERMISSION_LIST = [
  { key: "attendance.view", label: "ดูตอกบัตร", category: "ตอกบัตร" },
  { key: "attendance.manage", label: "จัดการตอกบัตร", category: "ตอกบัตร" },
  { key: "shop.view", label: "ดูร้านค้า", category: "ร้านค้า" },
  { key: "shop.manage", label: "จัดการร้านค้า", category: "ร้านค้า" },
  { key: "shop.sell", label: "ขายยศ", category: "ร้านค้า" },
  { key: "admin.view", label: "ดูแอดมิน", category: "แอดมิน" },
  { key: "admin.manage", label: "จัดการแอดมิน", category: "แอดมิน" },
  { key: "admin.permissions", label: "จัดการสิทธิ์", category: "แอดมิน" },
  { key: "logs.view", label: "ดูประวัติ", category: "ระบบ" },
  { key: "bot.manage", label: "จัดการบอท", category: "ระบบ" },
  { key: "settings.manage", label: "จัดการตั้งค่า", category: "ระบบ" },
];

interface Props {
  initialUsers: PermissionUser[];
  initialPermissions: PermissionItem[];
  isOwner: boolean;
}

export default function PermissionsEditor({
  initialUsers,
  initialPermissions,
  isOwner,
}: Props) {
  const [users] = useState<PermissionUser[]>(initialUsers);
  const [permissions, setPermissions] = useState<PermissionItem[]>(initialPermissions);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleToggle = async (userId: string, permKey: string, currentGranted: boolean) => {
    if (!isOwner) {
      showToast("เฉพาะ Owner หรือผู้ดูแลสูงสุดเท่านั้นที่สามารถแก้ไขสิทธิ์ได้", "error");
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (targetUser.role === "OWNER" || isRootOwner(targetUser.discordId)) {
      showToast("ไม่สามารถปรับสิทธิ์ของ Owner ได้ (มีสิทธิ์ทุกอย่าง)", "error");
      return;
    }

    const nextGranted = !currentGranted;
    const keyId = `${userId}:${permKey}`;
    setUpdatingKey(keyId);

    // Optimistic UI update
    setPermissions((prev) => {
      const idx = prev.findIndex((p) => p.userId === userId && p.permission === permKey);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], granted: nextGranted };
        return copy;
      } else {
        return [...prev, { userId, permission: permKey, granted: nextGranted }];
      }
    });

    try {
      const res = await fetch("/api/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          permission: permKey,
          granted: nextGranted,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "บันทึกข้อมูลไม่สำเร็จ");
      }

      const permObj = PERMISSION_LIST.find((p) => p.key === permKey);
      showToast(
        `บันทึกสิทธิ์ "${permObj?.label || permKey}" ให้ ${targetUser.displayName || targetUser.username} เรียบร้อยแล้ว`,
        "success"
      );
    } catch (err: any) {
      // Revert optimistic update on failure
      setPermissions((prev) => {
        const idx = prev.findIndex((p) => p.userId === userId && p.permission === permKey);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], granted: currentGranted };
          return copy;
        }
        return prev;
      });
      showToast(err.message || "เกิดข้อผิดพลาดในการบันทึกสิทธิ์", "error");
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: toast.type === "success" ? "#1e2b22" : "#321619",
            border: `1px solid ${toast.type === "success" ? "#34c759" : "#ff3b30"}`,
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "scaleIn 0.2s ease-out",
          }}
        >
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Owner Restriction Notice */}
      {!isOwner && (
        <div
          style={{
            background: "rgba(255, 159, 10, 0.08)",
            border: "1px solid rgba(255, 159, 10, 0.25)",
            borderRadius: "12px",
            padding: "14px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "20px" }}>🔒</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#ff9f0a" }}>
              โหมดอ่านอย่างเดียว (Read-Only Mode)
            </div>
            <div style={{ fontSize: "12px", color: "#86868b", marginTop: "2px" }}>
              เฉพาะผู้ดูแลระดับ Owner หรือเจ้าของสูงสุดเท่านั้นที่สามารถเปิด-ปิดสิทธิ์การใช้งานของทีมงานได้
            </div>
          </div>
        </div>
      )}

      {/* Role Hierarchy Info */}
      <div className="card mb-24" id="role-hierarchy-card">
        <div className="card-header">
          <h3 className="card-title">
            <span className="card-title-icon">👑</span>
            ลำดับชั้นสิทธิ์
          </h3>
        </div>
        <div className="card-body">
          <div className="flex gap-16" style={{ flexWrap: "wrap" }}>
            {(["OWNER", "MANAGER", "ADMIN", "MODERATOR"] as const).map((role) => {
              const info = getRoleInfo(role);
              const count = users.filter((u) => u.role === role).length;

              return (
                <div
                  key={role}
                  className="flex items-center gap-12"
                  style={{
                    padding: "12px 20px",
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                    minWidth: "180px",
                  }}
                >
                  <span className={`role-badge ${info.className}`}>
                    {info.label}
                  </span>
                  <span className="text-muted text-sm">{count} คน</span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted mt-16">
            💡 Owner มีสิทธิ์ทุกอย่างโดยอัตโนมัติ • คลิกที่ปุ่ม Toggle เพื่อเปิด/ปิดสิทธิ์ของแอดมินคนอื่นๆ ได้ทันที
          </p>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="card" id="permission-matrix-card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="card-title">
            <span className="card-title-icon">🔐</span>
            ตารางจัดการสิทธิ์การเข้าถึง
          </h3>
          <span style={{ fontSize: "12px", color: "#86868b" }}>
            {isOwner ? "✨ คลิกที่สวิตช์เพื่อเปลี่ยนสิทธิ์ทันที" : "🔒 ดูสิทธิ์ได้อย่างเดียว"}
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {users.length > 0 ? (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "180px" }}>แอดมิน</th>
                    <th style={{ minWidth: "140px" }}>ตำแหน่ง</th>
                    {PERMISSION_LIST.map((p) => (
                      <th
                        key={p.key}
                        style={{
                          textAlign: "center",
                          fontSize: 11,
                          padding: "10px 8px",
                          minWidth: "85px",
                        }}
                      >
                        <div>{p.label}</div>
                        <div style={{ fontSize: "9px", color: "#86868b", fontWeight: 400 }}>
                          {p.category}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const userPerms = permissions.filter((p) => p.userId === user.id);
                    const isRoot = isRootOwner(user.discordId);
                    const roleInfo = getRoleInfo(isRoot ? "OWNER" : (user.role as any));
                    const isUserOwner = user.role === "OWNER" || isRoot;

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="table-user">
                            <div className="table-avatar">
                              <img
                                src={getDiscordAvatarUrl(user.discordId, user.avatar)}
                                alt={user.displayName || user.username}
                              />
                            </div>
                            <div>
                              <div className="table-user-name">
                                {user.displayName || user.username}
                              </div>
                              <div className="table-user-sub">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <span className={`role-badge ${roleInfo.className}`}>
                              {roleInfo.label}
                            </span>
                            {isRoot && (
                              <span
                                className="role-badge"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.12) 100%)",
                                  color: "#fbbf24",
                                  border: "1px solid rgba(251, 191, 36, 0.4)",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                👑 สูงสุด
                              </span>
                            )}
                          </div>
                        </td>
                        {PERMISSION_LIST.map((perm) => {
                          const isExplicitGranted = userPerms.some(
                            (p) => p.permission === perm.key && p.granted
                          );
                          const isGranted = isUserOwner || isExplicitGranted;
                          const keyId = `${user.id}:${perm.key}`;
                          const isUpdating = updatingKey === keyId;

                          return (
                            <td
                              key={perm.key}
                              style={{
                                textAlign: "center",
                                verticalAlign: "middle",
                                padding: "8px 6px",
                              }}
                            >
                              {isUserOwner ? (
                                <span
                                  title="Owner มีสิทธิ์ทุกอย่างโดยอัตโนมัติ"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: "rgba(52, 199, 89, 0.15)",
                                    color: "#34c759",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                  }}
                                >
                                  ✓
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!isOwner || isUpdating}
                                  onClick={() => handleToggle(user.id, perm.key, isGranted)}
                                  title={`${isGranted ? "เปิดอยู่ (คลิกเพื่อปิด)" : "ปิดอยู่ (คลิกเพื่อเปิด)"}`}
                                  style={{
                                    width: "36px",
                                    height: "20px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: isGranted ? "#34c759" : "rgba(255,255,255,0.12)",
                                    cursor: !isOwner || isUpdating ? "not-allowed" : "pointer",
                                    position: "relative",
                                    transition: "background 0.2s ease, opacity 0.2s ease",
                                    opacity: isUpdating ? 0.5 : 1,
                                    padding: 0,
                                    outline: "none",
                                    display: "inline-block",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      borderRadius: "50%",
                                      background: "#ffffff",
                                      position: "absolute",
                                      top: "2px",
                                      left: isGranted ? "18px" : "2px",
                                      transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                                    }}
                                  />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔐</div>
              <p className="empty-state-title">ยังไม่มีข้อมูลแอดมิน</p>
              <p className="empty-state-text">เพิ่มแอดมินเพื่อจัดการสิทธิ์</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
