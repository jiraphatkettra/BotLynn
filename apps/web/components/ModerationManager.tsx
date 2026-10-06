"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";
import EmbedEditorModal from "@/components/EmbedEditorModal";

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

interface MemberItem {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
}

interface DiscordChannel {
  id: string;
  name: string;
}

const SEVERITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: "ระดับเบา", color: "#2997ff", bg: "rgba(41, 151, 255, 0.15)" },
  MEDIUM: { label: "ปานกลาง", color: "#ff9f0a", bg: "rgba(255, 159, 10, 0.15)" },
  HIGH: { label: "ร้ายแรง", color: "#ff6b00", bg: "rgba(255, 107, 0, 0.15)" },
  CRITICAL: { label: "วิกฤต", color: "#ff453a", bg: "rgba(255, 69, 58, 0.15)" },
};

export default function ModerationManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSeverity = searchParams?.get("severity") || "ALL";

  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState(initialSeverity);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form State
  const [formDiscordId, setFormDiscordId] = useState("");
  const [formDiscordName, setFormDiscordName] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formSeverity, setFormSeverity] = useState("LOW");
  const [formAction, setFormAction] = useState("WARN");
  const [formCustomIssuer, setFormCustomIssuer] = useState("");

  // Member Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Channel Settings State
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [notifyChannelId, setNotifyChannelId] = useState<string>("");
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [tempChannelId, setTempChannelId] = useState<string>("");
  const [savingChannel, setSavingChannel] = useState(false);

  // Live member search with debouncing
  useEffect(() => {
    if (!isModalOpen) return;
    if (selectedMember && (searchQuery === selectedMember.name || searchQuery === selectedMember.id)) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/moderation?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.members || []);
        }
      } catch (err) {
        console.error("Search members error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isModalOpen, selectedMember]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenModal = () => {
    setFormDiscordId("");
    setFormDiscordName("");
    setFormReason("");
    setFormSeverity("LOW");
    setFormAction("WARN");
    setFormCustomIssuer("");
    setSearchQuery("");
    setSelectedMember(null);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
    // Prefetch members
    fetch("/api/moderation?search=")
      .then((res) => res.json())
      .then((data) => setSearchResults(data.members || []))
      .catch(() => {});
  };

  const handleSelectMember = (member: MemberItem) => {
    setSelectedMember(member);
    setFormDiscordId(member.id);
    setFormDiscordName(member.name);
    setSearchQuery(member.name);
    setIsDropdownOpen(false);
  };

  const handleClearSelectedMember = () => {
    setSelectedMember(null);
    setFormDiscordId("");
    setFormDiscordName("");
    setSearchQuery("");
    setIsDropdownOpen(true);
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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

  const loadChannelSettings = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/discord/guild-data"),
        fetch("/api/settings"),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData.channels)) setChannels(cData.channels);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.settings?.moderation_notify_channel) {
          setNotifyChannelId(sData.settings.moderation_notify_channel);
          setTempChannelId(sData.settings.moderation_notify_channel);
        }
      }
    } catch (err) {
      console.error("Error loading channels:", err);
    }
  };

  const handleSaveChannel = async () => {
    setSavingChannel(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { moderation_notify_channel: tempChannelId },
        }),
      });
      if (res.ok) {
        setNotifyChannelId(tempChannelId);
        setIsChannelModalOpen(false);
        showToast(tempChannelId ? "บันทึกห้องประกาศเตือนใน Discord เรียบร้อยแล้ว" : "ปิดการส่งประกาศเตือนแล้ว", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถบันทึกได้", "error");
      }
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSavingChannel(false);
    }
  };

  useEffect(() => {
    loadWarnings();
    loadChannelSettings();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/moderation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      if (res.ok) {
        showToast(currentStatus ? "ยกเลิกผลการเตือนเรียบร้อยแล้ว" : "เปิดใช้งานการเตือนใหม่อีกครั้ง", "success");
        loadWarnings();
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการอัปเดตสถานะ", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบประวัติการเตือนนี้ถาวรหรือไม่?")) return;
    try {
      const res = await fetch(`/api/moderation?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("ลบประวัติการเตือนเรียบร้อยแล้ว", "success");
        loadWarnings();
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการลบข้อมูล", "error");
    }
  };

  const handleCreateWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDiscordId.trim() || !formReason.trim()) {
      showToast("กรุณากรอกไอดีสมาชิกและเหตุผลการลงโทษ", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordId: formDiscordId.trim(),
          discordName: formDiscordName.trim(),
          reason: formReason.trim(),
          severity: formSeverity,
          action: formAction,
          customIssuer: formCustomIssuer.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถบันทึกการลงโทษได้");
      }

      showToast(`บันทึกการลงโทษสมาชิกเรียบร้อยแล้ว! ${data.actionResult && data.actionResult !== "ไม่มี" ? `(${data.actionResult})` : ""}`, "success");
      setIsModalOpen(false);
      setFormDiscordId("");
      setFormDiscordName("");
      setFormReason("");
      setFormSeverity("LOW");
      setFormAction("WARN");
      setFormCustomIssuer("");
      setSelectedMember(null);
      setSearchQuery("");
      loadWarnings();
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWarnings = warnings.filter((w) => {
    if (selectedSeverity === "ALL") return true;
    return w.severity === selectedSeverity;
  });

  const activeCount = warnings.filter((w) => w.isActive).length;
  const criticalCount = warnings.filter((w) => w.severity === "CRITICAL" && w.isActive).length;

  return (
    <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto", position: "relative" }}>
      {/* Toast Notification */}
      {toast && (
        <div className="apple-toast-container">
          <div className={`apple-toast ${toast.type}`}>
            <span>{toast.type === "success" ? "✓" : "⚠"}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

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

      {/* Action Bar & Filter Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
          {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => {
                setSelectedSeverity(sev);
                const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
                if (sev === "ALL") {
                  params.delete("severity");
                } else {
                  params.set("severity", sev);
                }
                const query = params.toString();
                router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: selectedSeverity === sev ? "#2997ff" : "rgba(255, 255, 255, 0.05)",
                color: selectedSeverity === sev ? "#ffffff" : "var(--text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              {sev === "ALL" ? "ทั้งหมด" : SEVERITY_MAP[sev]?.label || sev}
            </button>
          ))}
        </div>

        {/* Buttons on Right */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Configure Announcement Channel Button */}
          <button
            type="button"
            onClick={() => {
              setTempChannelId(notifyChannelId);
              setIsChannelModalOpen(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "10px",
              background: notifyChannelId ? "rgba(41, 151, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
              border: notifyChannelId ? "1px solid rgba(41, 151, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.12)",
              color: notifyChannelId ? "#2997ff" : "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="กำหนดห้องสำหรับให้บอทประกาศเตือนสมาชิกในเซิร์ฟเวอร์"
          >
            <span>📢</span>
            <span>
              {notifyChannelId
                ? `ห้องประกาศ: #${channels.find((c) => c.id === notifyChannelId)?.name || notifyChannelId}`
                : "กำหนดห้องประกาศเตือน"}
            </span>
          </button>

          {/* Configure Embed Button */}
          <button
            type="button"
            onClick={() => setIsEmbedModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "10px",
              background: "rgba(41, 151, 255, 0.12)",
              border: "1px solid rgba(41, 151, 255, 0.3)",
              color: "#2997ff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="ตั้งค่าข้อความ Embed การตักเตือน, ใบเตือนสมาชิก และบันทึก Log ลงโทษใน Discord"
          >
            <span>🎨</span>
            <span>ตั้งค่า Embed ใบเตือน</span>
          </button>

          {/* Add Warning Button */}
          <button
            type="button"
            onClick={handleOpenModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "10px",
              backgroundColor: "#ff453a",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(255, 69, 58, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <span>+</span>
            <span>ออกใบเตือน / บันทึกการลงโทษ</span>
          </button>
        </div>
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
            {filteredWarnings.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                  {loading ? "กำลังโหลดข้อมูล..." : "ไม่มีประวัติการตักเตือนในหมวดหมู่นี้"}
                </td>
              </tr>
            ) : (
              filteredWarnings.map((w) => {
                const sev = SEVERITY_MAP[w.severity] || SEVERITY_MAP.LOW;
                return (
                  <tr key={w.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>{w.discordName}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>ID: {w.discordId}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", maxWidth: "260px" }}>
                      {w.reason}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", background: sev.bg, color: sev.color }}>
                        {sev.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                      <div style={{ fontWeight: 600 }}>{w.issuedBy}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{formatRelativeTime(w.createdAt)}</div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: w.isActive ? "#30d158" : "var(--text-muted)" }}>
                        {w.isActive ? "🔴 กำลังมีผล" : "⚪ ยกเลิกแล้ว"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(w.id, w.isActive)}
                          style={{
                            padding: "4px 10px",
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
                            padding: "4px 10px",
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Warning Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: "#1c1c1e",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "18px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
                  ออกใบเตือน & บันทึกการลงโทษสมาชิก
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                  บันทึกลงสู่ระบบแดชบอร์ด และส่งข้อความตักเตือนเข้า Discord ของสมาชิกอัตโนมัติ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "#ffffff",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarning}>
              {/* Member Search / Selector */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
                  สมาชิก Discord ที่ต้องการเตือน / ลงโทษ <span style={{ color: "#ff453a" }}>*</span>
                </label>

                {selectedMember ? (
                  /* Selected Member Badge */
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(41, 151, 255, 0.08)",
                      border: "1px solid rgba(41, 151, 255, 0.3)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <img
                        src={selectedMember.avatarUrl}
                        alt={selectedMember.name}
                        style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {selectedMember.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                          <span>@{selectedMember.username}</span>
                          <span style={{ fontFamily: "monospace", fontSize: "11px", background: "rgba(255, 255, 255, 0.08)", padding: "1px 6px", borderRadius: "4px" }}>
                            {selectedMember.id}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedMember}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 69, 58, 0.2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                    >
                      เปลี่ยนสมาชิก
                    </button>
                  </div>
                ) : (
                  /* Search Input & Dropdown */
                  <div ref={searchDropdownRef} style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        required={!formDiscordId}
                        placeholder="พิมพ์ค้นหาชื่อสมาชิก, @username หรือพิมพ์ Discord ID..."
                        value={searchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSearchQuery(val);
                          setFormDiscordId(val);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        style={{
                          width: "100%",
                          padding: "10px 12px 10px 36px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: isDropdownOpen ? "1px solid #2997ff" : "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#ffffff",
                          fontSize: "13px",
                          outline: "none",
                          transition: "border-color 0.15s ease",
                        }}
                      />
                      <svg
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "15px",
                          height: "15px",
                          fill: "none",
                          stroke: "var(--text-muted)",
                          strokeWidth: 2,
                        }}
                        viewBox="0 0 24 24"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      {isSearching && (
                        <div
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "11px",
                            color: "#2997ff",
                          }}
                        >
                          กำลังค้นหา...
                        </div>
                      )}
                    </div>

                    {/* Auto-complete Dropdown */}
                    {isDropdownOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          maxHeight: "240px",
                          overflowY: "auto",
                          background: "#1c1c1e",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          borderRadius: "10px",
                          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.65)",
                        }}
                      >
                        {searchResults.length > 0 ? (
                          searchResults.map((member) => (
                            <div
                              key={member.id}
                              onClick={() => handleSelectMember(member)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "9px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                transition: "background 0.12s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <img
                                src={member.avatarUrl}
                                alt={member.name}
                                style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {member.name}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", gap: "6px" }}>
                                  <span>@{member.username}</span>
                                  <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>({member.id})</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>
                            {isSearching ? "กำลังโหลดรายชื่อสมาชิก..." : "ไม่พบสมาชิกตามชื่อนี้ (หากมี Discord ID สามารถกรอกเลข 17-20 หลักได้โดยตรง)"}
                          </div>
                        )}
                      </div>
                    )}

                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      พิมพ์ค้นหาชื่อสมาชิกจาก Discord หรือพิมพ์ Discord ID 17-20 หลัก
                    </span>
                  </div>
                )}
              </div>

              {/* Target Username (Optional) */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
                  ชื่อสมาชิก (Display Name) <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(ทางเลือก)</span>
                </label>
                <input
                  type="text"
                  placeholder="เว้นว่างไว้เพื่อให้ระบบตรวจจับชื่อจาก Discord อัตโนมัติ"
                  value={formDiscordName}
                  onChange={(e) => setFormDiscordName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Severity Level */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
                  ระดับความรุนแรง (Severity)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                  {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((sev) => {
                    const info = SEVERITY_MAP[sev];
                    const isSelected = formSeverity === sev;
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setFormSeverity(sev)}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "8px",
                          border: isSelected ? `2px solid ${info.color}` : "1px solid rgba(255,255,255,0.08)",
                          background: isSelected ? info.bg : "rgba(255,255,255,0.03)",
                          color: isSelected ? info.color : "var(--text-secondary)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Dropdown */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
                  มาตรการดำเนินการใน Discord (Action)
                </label>
                <select
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "#2c2c2e",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "13px",
                  }}
                >
                  <option value="WARN">บันทึกการตักเตือนในระบบ (Warning Record Only)</option>
                  <option value="TIMEOUT_10M">บันทึก + ปิดปาก (Timeout) 10 นาที</option>
                  <option value="TIMEOUT_1H">บันทึก + ปิดปาก (Timeout) 1 ชั่วโมง</option>
                  <option value="TIMEOUT_1D">บันทึก + ปิดปาก (Timeout) 24 ชั่วโมง</option>
                  <option value="KICK">เตะออกจากเซิร์ฟเวอร์ (Kick Member)</option>
                </select>
              </div>

              {/* Reason */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
                  สาเหตุและพฤติกรรมความผิด (Reason) <span style={{ color: "#ff453a" }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="ระบุเหตุผลในการตักเตือนหรือบทลงโทษ..."
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "13px",
                    resize: "vertical",
                  }}
                />
                {/* Quick Reason Presets */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                  {[
                    "ใช้คำหยาบ / ก่อกวน",
                    "แปะลิงก์โฆษณา",
                    "สแปมข้อความ",
                    "ละเมิดกฎห้องเสียง",
                    "ไม่สุภาพต่อทีมงาน",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormReason((prev) => (prev ? `${prev}, ${preset}` : preset))}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "var(--text-secondary)",
                        fontSize: "10px",
                        cursor: "pointer",
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Issuer (Optional) */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
                  ผู้บันทึกการลงโทษ (Issued By) <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(ระบุชื่อ หรือใช้บัญชีปัจจุบัน)</span>
                </label>
                <input
                  type="text"
                  placeholder="เว้นว่างไว้เพื่อใช้ชื่อบัญชีของคุณในระบบ"
                  value={formCustomIssuer}
                  onChange={(e) => setFormCustomIssuer(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    background: "#ff453a",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    boxShadow: "0 2px 10px rgba(255, 69, 58, 0.3)",
                  }}
                >
                  {submitting ? "กำลังบันทึก..." : "ยืนยันบันทึกการลงโทษ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Announcement Channel Modal */}
      {isChannelModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsChannelModalOpen(false);
          }}
        >
          <div
            style={{
              background: "#1c1c1e",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
                  📢 ห้องประกาศเตือนสมาชิกใน Discord
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                  เลือกห้องที่ต้องการให้บอทส่งการ์ดประกาศเมื่อมีการเตือนหรือลงโทษ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChannelModalOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "#ffffff",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#ffffff", marginBottom: "8px" }}>
                เลือกห้อง Discord (#channel)
              </label>
              <select
                value={tempChannelId}
                onChange={(e) => setTempChannelId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "#2c2c2e",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="">— ไม่เปิดใช้งาน (ส่งในห้องที่กดใช้คำสั่ง) —</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name} (ID: {ch.id})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", display: "block" }}>
                เมื่อบันทึกแล้ว การเตือนผ่าน Web Dashboard, คำสั่ง /warn หรือแผงควบคุม /panel จะประกาศลงห้องนี้โดยอัตโนมัติ
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsChannelModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveChannel}
                disabled={savingChannel}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "#2997ff",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: savingChannel ? "not-allowed" : "pointer",
                  opacity: savingChannel ? 0.7 : 1,
                }}
              >
                {savingChannel ? "กำลังบันทึก..." : "บันทึกการตั้งค่าห้อง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discord Embed Configuration Modal */}
      {isEmbedModalOpen && (
        <EmbedEditorModal
          isOpen={isEmbedModalOpen}
          onClose={() => setIsEmbedModalOpen(false)}
          initialCategory="moderation"
        />
      )}
    </div>
  );
}
