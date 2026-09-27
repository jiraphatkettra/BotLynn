"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface ShopRoleItem {
  id: string;
  name: string;
  discordRoleId: string;
  price: number;
  description: string | null;
  color: string | null;
  icon: string | null;
  category: string;
  isActive: boolean;
  stock: number | null;
  maxPerUser: number;
  _count?: { transactions: number };
}

interface DiscordChannel {
  id: string;
  name: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
  managed?: boolean;
}

interface ShopManagerProps {
  initialRoles: ShopRoleItem[];
  isSuperAdmin: boolean;
  initialNotifyChannel: string;
  totalSold?: number;
  totalRevenue?: number;
}

export default function ShopManager({
  initialRoles,
  isSuperAdmin,
  initialNotifyChannel,
  totalSold = 0,
  totalRevenue = 0,
}: ShopManagerProps) {
  // Roles currently in the shop
  const [roles, setRoles] = useState<ShopRoleItem[]>(initialRoles);
  const [notifyChannel, setNotifyChannel] = useState(initialNotifyChannel || "");
  const [savingChannel, setSavingChannel] = useState(false);
  const [channelSavedText, setChannelSavedText] = useState("");

  // Discord Guild Data
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannel[]>([]);
  const [loadingGuildData, setLoadingGuildData] = useState(false);

  // Test Notification
  const [testingNotification, setTestingNotification] = useState(false);
  const [testNotifyResult, setTestNotifyResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  // Channel Front Combobox State
  const [isChannelMenuOpen, setIsChannelMenuOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const channelContainerRef = useRef<HTMLDivElement>(null);

  // Copy ID toast
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal: Select Discord Role to Sell
  const [isSelectRoleModalOpen, setIsSelectRoleModalOpen] = useState(false);
  const [discordRoleSearch, setDiscordRoleSearch] = useState("");
  const [selectedDiscordRole, setSelectedDiscordRole] = useState<DiscordRole | null>(null);

  // Modal: Edit Role in Shop
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ShopRoleItem | null>(null);

  // Role Form State
  const [formData, setFormData] = useState({
    price: "99",
    description: "",
    color: "#2997ff",
    stock: "",
    isUnlimitedStock: true,
    isActive: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Batch delete loading state
  const [deletingAll, setDeletingAll] = useState(false);

  // Fetch Discord roles and channels
  const fetchGuildData = () => {
    if (isSuperAdmin) {
      setLoadingGuildData(true);
      fetch("/api/discord/guild-data")
        .then((res) => res.json())
        .then((data) => {
          if (data.roles) setDiscordRoles(data.roles);
          if (data.channels) setDiscordChannels(data.channels);
        })
        .catch((err) => console.error("Error loading guild data:", err))
        .finally(() => setLoadingGuildData(false));
    }
  };

  useEffect(() => {
    fetchGuildData();
  }, [isSuperAdmin]);

  // Click outside to close channel dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        channelContainerRef.current &&
        !channelContainerRef.current.contains(e.target as Node)
      ) {
        setIsChannelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save Channel Selection
  async function handleSaveNotifyChannel(channelId: string) {
    setNotifyChannel(channelId);
    setSavingChannel(true);
    setChannelSavedText("");
    setIsChannelMenuOpen(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { shop_notify_channel: channelId },
        }),
      });
      if (res.ok) {
        setChannelSavedText("บันทึกสำเร็จ");
        setTimeout(() => setChannelSavedText(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingChannel(false);
    }
  }

  // Handle Test Notification to Discord
  async function handleTestNotification() {
    if (!notifyChannel) {
      alert("กรุณาเลือกห้องใน Discord ก่อนกดทดสอบ");
      return;
    }
    setTestingNotification(true);
    setTestNotifyResult(null);
    try {
      const res = await fetch("/api/discord/test-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: notifyChannel }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestNotifyResult({
          ok: true,
          msg: "ส่งข้อความทดสอบเข้า Discord สำเร็จแล้ว!",
        });
      } else {
        setTestNotifyResult({
          ok: false,
          msg: data.error || "ไม่สามารถส่งข้อความได้",
        });
      }
    } catch (e) {
      setTestNotifyResult({ ok: false, msg: "เชื่อมต่อไม่สำเร็จ" });
    } finally {
      setTestingNotification(false);
      setTimeout(() => setTestNotifyResult(null), 5000);
    }
  }

  // Copy ID
  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Quick Toggle Active Status
  async function handleToggleActive(role: ShopRoleItem) {
    if (!isSuperAdmin) return;
    const newActive = !role.isActive;
    try {
      const res = await fetch("/api/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: role.id, isActive: newActive }),
      });
      if (res.ok) {
        setRoles((prev) =>
          prev.map((r) => (r.id === role.id ? { ...r, isActive: newActive } : r))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Delete Individual Role from Shop
  async function handleDeleteRole(role: ShopRoleItem) {
    if (!isSuperAdmin) return;
    if (
      !confirm(
        `คุณต้องการลบยศ "${role.name}" ออกจากร้านค้าใช่หรือไม่? (ยศใน Discord จะไม่ถูกลบ)`
      )
    )
      return;

    try {
      const res = await fetch(`/api/shop?id=${role.id}`, { method: "DELETE" });
      if (res.ok) {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
      } else {
        const data = await res.json();
        alert(data.error || "ไม่สามารถลบยศได้");
      }
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการลบยศ");
    }
  }

  // Delete ALL Roles from Shop
  async function handleDeleteAllRoles() {
    if (!isSuperAdmin || roles.length === 0) return;
    if (
      !confirm(
        `⚠️ คำเตือน: คุณต้องการลบยศทั้งหมด (${roles.length} ยศ) ออกจากร้านค้าใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
      )
    )
      return;

    setDeletingAll(true);
    try {
      const res = await fetch(`/api/shop?all=true`, { method: "DELETE" });
      if (res.ok) {
        setRoles([]);
      } else {
        const data = await res.json();
        alert(data.error || "ไม่สามารถลบยศทั้งหมดได้");
      }
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการลบยศทั้งหมด");
    } finally {
      setDeletingAll(false);
    }
  }

  // Open "Select Discord Role to Sell" Modal
  function handleOpenSelectRoleModal() {
    setFormError("");
    setDiscordRoleSearch("");
    setSelectedDiscordRole(null);
    setFormData({
      price: "99",
      description: "",
      color: "#2997ff",
      stock: "",
      isUnlimitedStock: true,
      isActive: true,
    });
    setIsSelectRoleModalOpen(true);
  }

  // When clicking a Discord role in the picker
  function handlePickDiscordRole(dr: DiscordRole) {
    setSelectedDiscordRole(dr);
    setFormData({
      price: "99",
      description: `สิทธิพิเศษสำหรับผู้ครอบครองยศ ${dr.name}`,
      color: dr.color && dr.color !== "#86868b" ? dr.color : "#2997ff",
      stock: "",
      isUnlimitedStock: true,
      isActive: true,
    });
  }

  // Submit adding selected Discord role to shop
  async function handleAddPickedRoleToShop(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDiscordRole) return;

    setFormSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedDiscordRole.name,
          discordRoleId: selectedDiscordRole.id,
          price: parseFloat(formData.price),
          description: formData.description,
          color: formData.color,
          stock: formData.isUnlimitedStock ? null : formData.stock,
          isActive: formData.isActive,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error || "เกิดข้อผิดพลาดในการเพิ่มยศ");
        return;
      }

      setRoles((prev) => [...prev, { ...result.data, _count: { transactions: 0 } }]);
      setIsSelectRoleModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to add role");
    } finally {
      setFormSubmitting(false);
    }
  }

  // Open Edit Modal for a role already in the shop
  function handleOpenEditModal(role: ShopRoleItem) {
    setFormError("");
    setEditingRole(role);
    setFormData({
      price: String(role.price),
      description: role.description || "",
      color: role.color || "#2997ff",
      stock: role.stock !== null ? String(role.stock) : "",
      isUnlimitedStock: role.stock === null,
      isActive: role.isActive,
    });
    setIsEditModalOpen(true);
  }

  // Submit Edit Role
  async function handleSaveEditedRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRole) return;

    setFormSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRole.id,
          price: parseFloat(formData.price),
          description: formData.description,
          color: formData.color,
          stock: formData.isUnlimitedStock ? null : formData.stock,
          isActive: formData.isActive,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error || "เกิดข้อผิดพลาดในการแก้ไขยศ");
        return;
      }

      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingRole.id
            ? { ...r, ...result.data, _count: r._count }
            : r
        )
      );
      setIsEditModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to update role");
    } finally {
      setFormSubmitting(false);
    }
  }

  // Already added Discord role IDs set
  const addedRoleIdsSet = useMemo(() => {
    return new Set(roles.map((r) => r.discordRoleId));
  }, [roles]);

  // Filtered Discord roles inside the picker modal
  const filteredDiscordPickerRoles = useMemo(() => {
    return discordRoles.filter((dr) => {
      // Exclude managed system roles like Wick, Rythm from picker by default
      if (dr.managed) return false;

      if (!discordRoleSearch.trim()) return true;
      const q = discordRoleSearch.toLowerCase().trim();
      return (
        dr.name.toLowerCase().includes(q) ||
        dr.id.includes(q) ||
        dr.color.toLowerCase().includes(q)
      );
    });
  }, [discordRoles, discordRoleSearch]);

  // Selected Channel Object
  const selectedChannel = useMemo(
    () => discordChannels.find((c) => c.id === notifyChannel),
    [discordChannels, notifyChannel]
  );

  // Filtered Channels for the front combobox
  const filteredChannels = useMemo(() => {
    if (!channelSearch.trim()) return discordChannels;
    const q = channelSearch.toLowerCase().replace(/^#/, "").trim();
    return discordChannels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.includes(q)
    );
  }, [discordChannels, channelSearch]);

  const activeCount = roles.filter((r) => r.isActive).length;

  const colorPresets = [
    { label: "Ruby", color: "#800020" },
    { label: "Crimson", color: "#430707" },
    { label: "Rose", color: "#e91e63" },
    { label: "Pink", color: "#ff5dd6" },
    { label: "Gold", color: "#d4843d" },
    { label: "Champagne", color: "#cab694" },
    { label: "Purple", color: "#8b5cf6" },
    { label: "Blue", color: "#2997ff" },
    { label: "Sky", color: "#a9c9ff" },
    { label: "Emerald", color: "#30d158" },
    { label: "Obsidian", color: "#1a1a24" },
  ];

  return (
    <>
      {/* 1. Proportional Stats Row (Unified, No Duplicates) */}
      <div className="stats-grid mb-24">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ color: "var(--accent)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{roles.length}</div>
          <div className="stat-card-label">ยศที่เปิดขายในร้าน</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ color: "var(--success)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{activeCount}</div>
          <div className="stat-card-label">ยศที่เปิดขายจริง</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{totalSold}</div>
          <div className="stat-card-label">ยอดขายทั้งหมด</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ color: "var(--success)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{formatCurrency(totalRevenue)} ฿</div>
          <div className="stat-card-label">รายได้รวมสะสม</div>
        </div>
      </div>

      {/* 2. Notification Channel Setup Card (Search Box on Front!) */}
      {isSuperAdmin && (
        <div className="card mb-24" id="shop-notify-setting">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              ห้องส่งข้อความแจ้งเตือนเมื่อมีการซื้อยศ
            </h3>
            {channelSavedText && (
              <span className="badge badge-success">{channelSavedText}</span>
            )}
          </div>

          <div className="card-body">
            <div
              className="flex items-center justify-between"
              style={{ flexWrap: "wrap", gap: 16 }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  เลือกห้องใน Discord ที่ต้องการให้บอทส่งข้อความแจ้งเตือน
                </div>
                <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                  บอทจะส่ง Embed สรุปการสั่งซื้อเข้าห้องนี้ทันทีที่มีสมาชิกซื้อยศสำเร็จ
                </div>
              </div>

              {/* Direct Front-Facing Search & Combobox */}
              <div className="flex items-center gap-12" style={{ flexWrap: "wrap" }}>
                <div
                  ref={channelContainerRef}
                  style={{
                    position: "relative",
                    minWidth: "min(100%, 320px)",
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ position: "absolute", left: 12, pointerEvents: "none" }}
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>

                    <input
                      type="text"
                      className="form-input"
                      placeholder="พิมพ์ค้นหาหรือเลือกห้อง Discord..."
                      value={
                        isChannelMenuOpen
                          ? channelSearch
                          : selectedChannel
                          ? `#${selectedChannel.name}`
                          : ""
                      }
                      onFocus={() => {
                        setIsChannelMenuOpen(true);
                        setChannelSearch("");
                      }}
                      onChange={(e) => {
                        setChannelSearch(e.target.value);
                        setIsChannelMenuOpen(true);
                      }}
                      style={{
                        paddingLeft: 34,
                        paddingRight: notifyChannel ? 56 : 30,
                        fontSize: 13,
                        height: 38,
                        background: "rgba(255, 255, 255, 0.04)",
                        borderColor: isChannelMenuOpen
                          ? "var(--accent)"
                          : "rgba(255, 255, 255, 0.12)",
                      }}
                    />

                    {notifyChannel && (
                      <button
                        type="button"
                        title="ปิดการแจ้งเตือน (ไม่ส่งข้อความ)"
                        onClick={() => handleSaveNotifyChannel("")}
                        style={{
                          position: "absolute",
                          right: 28,
                          background: "transparent",
                          border: "none",
                          color: "rgba(255, 255, 255, 0.45)",
                          fontSize: 12,
                          cursor: "pointer",
                          padding: 2,
                        }}
                      >
                        ✕
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsChannelMenuOpen(!isChannelMenuOpen)}
                      style={{
                        position: "absolute",
                        right: 10,
                        background: "transparent",
                        border: "none",
                        color: "rgba(255, 255, 255, 0.45)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transform: isChannelMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>

                  {/* Channel Dropdown Popup below the input */}
                  {isChannelMenuOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: "#0e0e13",
                        border: "1px solid rgba(255, 255, 255, 0.16)",
                        borderRadius: "var(--radius-md)",
                        boxShadow:
                          "0 18px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)",
                        backdropFilter: "blur(24px)",
                        maxHeight: 240,
                        overflowY: "auto",
                        padding: "4px 0",
                      }}
                    >
                      <div
                        onClick={() => handleSaveNotifyChannel("")}
                        style={{
                          padding: "8px 14px",
                          fontSize: 13,
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span>— ปิดการแจ้งเตือน (ไม่ส่งข้อความ) —</span>
                        {!notifyChannel && <span style={{ color: "var(--accent)" }}>✓</span>}
                      </div>

                      {filteredChannels.length === 0 ? (
                        <div
                          style={{
                            padding: "16px 14px",
                            textAlign: "center",
                            fontSize: 12,
                            color: "var(--text-muted)",
                          }}
                        >
                          ไม่พบห้อง Discord ที่ค้นหา
                        </div>
                      ) : (
                        filteredChannels.map((ch) => {
                          const isSelected = ch.id === notifyChannel;
                          return (
                            <div
                              key={ch.id}
                              onClick={() => handleSaveNotifyChannel(ch.id)}
                              style={{
                                padding: "8px 14px",
                                fontSize: 13,
                                color: isSelected ? "#ffffff" : "var(--text-primary)",
                                background: isSelected
                                  ? "rgba(41, 151, 255, 0.16)"
                                  : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = "transparent";
                                }
                              }}
                            >
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontWeight: isSelected ? 500 : 400,
                                }}
                              >
                                #{ch.name}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  ID: {ch.id.slice(0, 8)}...
                                </span>
                                {isSelected && <span style={{ color: "var(--accent)" }}>✓</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!notifyChannel || testingNotification}
                  onClick={handleTestNotification}
                  style={{ height: 38, padding: "0 14px", whiteSpace: "nowrap" }}
                  title="ส่งข้อความทดสอบเข้า Discord ทันที"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      animation: testingNotification ? "spin 1s linear infinite" : "none",
                    }}
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {testingNotification ? "กำลังส่ง..." : "ทดสอบส่งข้อความ"}
                </button>
              </div>
            </div>

            {testNotifyResult && (
              <div
                style={{
                  marginTop: 14,
                  padding: "8px 14px",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: testNotifyResult.ok ? "var(--success-subtle)" : "var(--danger-subtle)",
                  color: testNotifyResult.ok ? "var(--success)" : "var(--danger)",
                  border: `1px solid ${
                    testNotifyResult.ok ? "rgba(48, 209, 88, 0.2)" : "rgba(255, 69, 58, 0.2)"
                  }`,
                }}
              >
                <span>{testNotifyResult.ok ? "✓" : "✕"}</span>
                <span>{testNotifyResult.msg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Shop Roles Section (ONLY Chosen Roles Appear Here!) */}
      <div className="card mb-24">
        <div className="card-header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 className="card-title">
              ยศที่เปิดขายในร้านค้า ({roles.length} ยศ)
            </h3>
            <p className="text-muted text-xs" style={{ marginTop: 2 }}>
              เฉพาะยศที่คุณเลือกมาเปิดขายเท่านั้น • สมาชิกสามารถสั่งซื้อผ่านคำสั่ง /buy ใน Discord
            </p>
          </div>

          <div className="flex items-center gap-10" style={{ flexWrap: "wrap" }}>
            {/* Clear All Roles Button */}
            {isSuperAdmin && roles.length > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={deletingAll}
                onClick={handleDeleteAllRoles}
                style={{
                  background: "var(--danger-subtle)",
                  color: "var(--danger)",
                  border: "1px solid rgba(255, 69, 58, 0.2)",
                  fontSize: 12,
                }}
                title="ลบยศทั้งหมดออกจากร้านค้า"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                {deletingAll ? "กำลังลบ..." : "ลบยศทั้งหมด"}
              </button>
            )}

            {/* Export Sales CSV Button */}
            <a
              href="/api/export/sales"
              download
              className="btn btn-secondary btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                textDecoration: "none",
              }}
              title="ส่งออกประวัติยอดขายเป็นไฟล์ Excel / CSV"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              ส่งออกยอดขาย (CSV)
            </a>

            {/* Select Discord Role Button */}
            {isSuperAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenSelectRoleModal}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                + เลือกยศจาก Discord มาขาย
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {roles.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                gap: 16,
              }}
            >
              {roles.map((role) => {
                const roleColor = role.color || "#2997ff";

                return (
                  <div
                    key={role.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${role.isActive ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 69, 58, 0.25)"}`,
                      borderTop: `3px solid ${roleColor}`,
                      borderRadius: "var(--radius-md)",
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 16,
                      boxShadow: `0 4px 18px -2px rgba(0, 0, 0, 0.5), 0 0 20px -8px ${roleColor}25`,
                    }}
                  >
                    <div>
                      {/* Top Header: Discord Role Tag & Status */}
                      <div
                        className="flex items-center justify-between"
                        style={{ gap: 8, marginBottom: 12 }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "3px 10px",
                            borderRadius: "var(--radius-pill)",
                            background: `${roleColor}18`,
                            border: `1px solid ${roleColor}40`,
                            fontSize: 12,
                            fontWeight: 500,
                            color: roleColor,
                            maxWidth: "100%",
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: roleColor,
                              flexShrink: 0,
                              boxShadow: `0 0 6px ${roleColor}`,
                            }}
                          />
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            @{role.name}
                          </span>
                        </div>

                        <div>
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(role)}
                              className={`badge ${role.isActive ? "badge-success" : "badge-error"}`}
                              style={{ cursor: "pointer" }}
                              title="คลิกเพื่อเปิด/ปิดขาย"
                            >
                              {role.isActive ? "เปิดขาย" : "ปิดขาย"}
                            </button>
                          ) : (
                            <span className={`badge ${role.isActive ? "badge-success" : "badge-error"}`}>
                              {role.isActive ? "เปิดขาย" : "ปิดขาย"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing & Stock */}
                      <div style={{ marginBottom: 10 }}>
                        <div className="flex items-baseline gap-6">
                          <span
                            style={{
                              fontSize: 22,
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {formatCurrency(role.price)}
                          </span>
                          <span className="text-muted text-xs">บาท</span>
                          <span className="text-muted text-xs" style={{ marginLeft: 6 }}>
                            • {role.stock !== null ? `เหลือ ${role.stock}` : "ไม่จำกัดจำนวน"}
                          </span>
                        </div>

                        <p className="text-muted text-xs" style={{ marginTop: 6, minHeight: 32 }}>
                          {role.description || "สิทธิพิเศษประจำยศในเซิร์ฟเวอร์"}
                        </p>
                      </div>

                      {/* Discord Role ID */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        <span
                          onClick={() => handleCopy(role.discordRoleId)}
                          style={{
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.03)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            border: "1px solid var(--border-subtle)",
                          }}
                          title="คลิกเพื่อคัดลอก ID"
                        >
                          ID: {role.discordRoleId.slice(0, 10)}... {copiedId === role.discordRoleId ? "✓" : "📋"}
                        </span>
                        <span>•</span>
                        <span>ขายแล้ว {role._count?.transactions || 0} ครั้ง</span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons: Edit & Delete */}
                    {isSuperAdmin && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border-subtle)",
                          paddingTop: 12,
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, fontSize: 12 }}
                          onClick={() => handleOpenEditModal(role)}
                        >
                          ⚙️ แก้ไขราคา
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: "var(--danger-subtle)",
                            color: "var(--danger)",
                            border: "1px solid rgba(255, 69, 58, 0.2)",
                            fontSize: 12,
                          }}
                          onClick={() => handleDeleteRole(role)}
                          title="ลบยศนี้ออกจากร้านค้า"
                        >
                          ลบยศ
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
                ยังไม่มียศที่เปิดขายในร้านค้า
              </h4>
              <p className="text-muted text-xs" style={{ maxWidth: 380 }}>
                คุณสามารถเลือกยศที่มีอยู่จริงใน Discord Server มากำหนดราคาขายและสต๊อกได้ตามต้องการ
              </p>
              {isSuperAdmin && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={handleOpenSelectRoleModal}
                >
                  + เลือกยศจาก Discord มาขาย
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SELECT DISCORD ROLE TO SELL (Front Search inside Modal) */}
      {/* ========================================================================= */}
      {isSelectRoleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSelectRoleModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {selectedDiscordRole
                  ? `ตั้งค่าเปิดขาย: @${selectedDiscordRole.name}`
                  : "เลือกยศจาก Discord Server มาเปิดขาย"}
              </h3>
              <button
                className="btn-ghost"
                onClick={() => setIsSelectRoleModalOpen(false)}
                style={{ cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {!selectedDiscordRole ? (
              /* Step 1: Browse / Search Discord Roles */
              <div className="modal-body">
                {/* Front Search Bar */}
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="พิมพ์ค้นหายศในเซิร์ฟเวอร์ Discord..."
                    value={discordRoleSearch}
                    onChange={(e) => setDiscordRoleSearch(e.target.value)}
                    style={{ paddingLeft: 34, height: 40 }}
                    autoFocus
                  />
                  {discordRoleSearch && (
                    <button
                      type="button"
                      onClick={() => setDiscordRoleSearch("")}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.4)",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="text-muted text-xs mb-10">
                  คลิกที่ยศที่ต้องการเพื่อกำหนดราคาและเปิดขาย ({filteredDiscordPickerRoles.length} ยศ)
                </div>

                {/* List of Discord Roles */}
                <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredDiscordPickerRoles.map((dr) => {
                    const isAlreadyAdded = addedRoleIdsSet.has(dr.id);
                    const roleColor = dr.color && dr.color !== "#86868b" ? dr.color : "#99aab5";
                    const hasColor = dr.color && dr.color !== "#86868b";

                    return (
                      <div
                        key={dr.id}
                        onClick={() => {
                          if (!isAlreadyAdded) handlePickDiscordRole(dr);
                        }}
                        style={{
                          background: isAlreadyAdded
                            ? "rgba(255, 255, 255, 0.015)"
                            : "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-md)",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: isAlreadyAdded ? "not-allowed" : "pointer",
                          opacity: isAlreadyAdded ? 0.45 : 1,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isAlreadyAdded) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isAlreadyAdded) e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: roleColor,
                              boxShadow: hasColor ? `0 0 6px ${roleColor}` : "none",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            @{dr.name}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                            ID: {dr.id.slice(0, 8)}...
                          </span>
                          {isAlreadyAdded ? (
                            <span className="badge badge-success" style={{ fontSize: 10 }}>
                              อยู่ในร้านแล้ว
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--accent)" }}>
                              เลือกยศนี้ →
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Step 2: Configure Price & Stock for Picked Discord Role */
              <form onSubmit={handleAddPickedRoleToShop}>
                <div className="modal-body">
                  {formError && (
                    <div
                      style={{
                        color: "var(--danger)",
                        fontSize: 12,
                        background: "var(--danger-subtle)",
                        padding: "8px 12px",
                        borderRadius: 8,
                      }}
                    >
                      {formError}
                    </div>
                  )}

                  {/* Picked Role Banner */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-subtle)",
                      borderLeft: `4px solid ${formData.color}`,
                      borderRadius: "var(--radius-md)",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                        ยศที่เลือกจากเซิร์ฟเวอร์ Discord
                      </span>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 10px",
                          borderRadius: "var(--radius-pill)",
                          background: `${formData.color}20`,
                          border: `1px solid ${formData.color}50`,
                          fontSize: 13,
                          fontWeight: 500,
                          color: formData.color,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: formData.color,
                            boxShadow: `0 0 8px ${formData.color}`,
                          }}
                        />
                        @{selectedDiscordRole.name}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer" }}
                      onClick={() => setSelectedDiscordRole(null)}
                    >
                      เปลี่ยนยศอื่น
                    </button>
                  </div>

                  {/* Price Setting */}
                  <div className="form-group" style={{ marginTop: 14 }}>
                    <label className="form-label">ราคาขาย (บาท) *</label>
                    <div className="flex gap-10 items-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="form-input"
                        placeholder="เช่น 99"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        style={{ flex: 1 }}
                      />
                      <div className="flex gap-6">
                        {["50", "99", "199", "299", "499"].map((p) => (
                          <button
                            key={p}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              background: formData.price === p ? "rgba(41, 151, 255, 0.2)" : undefined,
                              borderColor: formData.price === p ? "var(--accent)" : undefined,
                            }}
                            onClick={() => setFormData({ ...formData, price: p })}
                          >
                            {p}฿
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Color Preset Palette */}
                  <div className="form-group">
                    <div className="flex justify-between items-center mb-6">
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        สีประจำยศในร้านค้า
                      </label>
                      <span style={{ fontSize: 11, color: formData.color, fontFamily: "var(--font-mono)" }}>
                        {formData.color}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 mb-10" style={{ flexWrap: "wrap" }}>
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: preset.color })}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: preset.color,
                            border: formData.color === preset.color ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.2)",
                            cursor: "pointer",
                            transform: formData.color === preset.color ? "scale(1.2)" : "scale(1)",
                            transition: "all 0.15s ease",
                          }}
                          title={preset.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          border: "1px solid rgba(255,255,255,0.2)",
                          cursor: "pointer",
                          background: "transparent",
                          padding: 0,
                        }}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label className="form-label">คำอธิบายสิทธิพิเศษ</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="รายละเอียดสิทธิพิเศษของยศนี้..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Stock */}
                  <div className="form-group">
                    <label className="form-label">จำนวนสต๊อก</label>
                    <div className="flex items-center gap-12">
                      <label className="flex items-center gap-6" style={{ fontSize: 13, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={formData.isUnlimitedStock}
                          onChange={(e) => setFormData({ ...formData, isUnlimitedStock: e.target.checked })}
                        />
                        <span>ไม่จำกัดจำนวน</span>
                      </label>

                      {!formData.isUnlimitedStock && (
                        <input
                          type="number"
                          min="1"
                          placeholder="จำนวนคงเหลือ"
                          className="form-input"
                          style={{ width: 140 }}
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        />
                      )}
                    </div>
                  </div>

                  {/* Active Switch */}
                  <div className="form-group">
                    <label className="flex items-center gap-8" style={{ fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <span>เปิดขายทันทีผ่านคำสั่ง /buy ใน Discord</span>
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedDiscordRole(null)}
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? "กำลังบันทึก..." : "บันทึกและเปิดขาย"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT ROLE IN SHOP */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingRole && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">แก้ไขยศ: {editingRole.name}</h3>
              <button
                className="btn-ghost"
                onClick={() => setIsEditModalOpen(false)}
                style={{ cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedRole}>
              <div className="modal-body">
                {formError && (
                  <div
                    style={{
                      color: "var(--danger)",
                      fontSize: 12,
                      background: "var(--danger-subtle)",
                      padding: "8px 12px",
                      borderRadius: 8,
                    }}
                  >
                    {formError}
                  </div>
                )}

                {/* Price Setting */}
                <div className="form-group">
                  <label className="form-label">ราคาขาย (บาท) *</label>
                  <div className="flex gap-10 items-center">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <div className="flex gap-6">
                      {["50", "99", "199", "299", "499"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: "4px 8px",
                            fontSize: 11,
                            background: formData.price === p ? "rgba(41, 151, 255, 0.2)" : undefined,
                            borderColor: formData.price === p ? "var(--accent)" : undefined,
                          }}
                          onClick={() => setFormData({ ...formData, price: p })}
                        >
                          {p}฿
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Color Palette */}
                <div className="form-group">
                  <div className="flex justify-between items-center mb-6">
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      สีประจำยศในร้านค้า
                    </label>
                    <span style={{ fontSize: 11, color: formData.color, fontFamily: "var(--font-mono)" }}>
                      {formData.color}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 mb-10" style={{ flexWrap: "wrap" }}>
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: preset.color })}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: preset.color,
                          border: formData.color === preset.color ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.2)",
                          cursor: "pointer",
                          transform: formData.color === preset.color ? "scale(1.2)" : "scale(1)",
                          transition: "all 0.15s ease",
                        }}
                        title={preset.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.2)",
                        cursor: "pointer",
                        background: "transparent",
                        padding: 0,
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">คำอธิบายสิทธิพิเศษ</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Stock */}
                <div className="form-group">
                  <label className="form-label">จำนวนสต๊อก</label>
                  <div className="flex items-center gap-12">
                    <label className="flex items-center gap-6" style={{ fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.isUnlimitedStock}
                        onChange={(e) => setFormData({ ...formData, isUnlimitedStock: e.target.checked })}
                      />
                      <span>ไม่จำกัดจำนวน</span>
                    </label>

                    {!formData.isUnlimitedStock && (
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        style={{ width: 140 }}
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                {/* Active switch */}
                <div className="form-group">
                  <label className="flex items-center gap-8" style={{ fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span>เปิดให้สั่งซื้อผ่าน Discord (/buy)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
