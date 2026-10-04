"use client";

import { useState, useEffect, useMemo } from "react";
import CustomSelect from "@/components/CustomSelect";

interface DiscordChannel {
  id: string;
  name: string;
}

interface SettingsManagerProps {
  initialSettings: Record<string, string>;
  isSuperAdmin: boolean;
}

const TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "auto_slip", label: "ตรวจสลิปอัตโนมัติ" },
  { id: "channels", label: "ห้องแจ้งเตือน Discord" },
  { id: "attendance", label: "ระบบตอกบัตร" },
  { id: "shop", label: "ร้านค้ายศ" },
  { id: "welcome", label: "ต้อนรับ & แจกยศ" },
  { id: "wallet", label: "การเงิน & พร้อมเพย์" },
  { id: "tickets", label: "ทิกเก็ต & สลิป" },
];

export default function SettingsManager({
  initialSettings,
  isSuperAdmin,
}: SettingsManagerProps) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<Record<string, string>>(initialSettings);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // UX Enhancements: Tabs & Search
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick channel test
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ channelId: string; success: boolean; message: string } | null>(null);

  // Auto Slip API Test
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingWelcome, setTestingWelcome] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingChannels(true);
      fetch("/api/discord/guild-data")
        .then((r) => r.json())
        .then((data) => {
          if (data.channels) setChannels(data.channels);
          if (data.roles) setRoles(data.roles);
        })
        .catch((e) => console.error("Error loading channels:", e))
        .finally(() => setLoadingChannels(false));
    }
  }, [isSuperAdmin]);

  // Track unsaved changes
  const changedKeys = useMemo(() => {
    const keys = new Set([...Object.keys(settings), ...Object.keys(savedSettings)]);
    const diffs: string[] = [];
    keys.forEach((key) => {
      const cur = (settings[key] || "").trim();
      const prev = (savedSettings[key] || "").trim();
      if (cur !== prev) {
        diffs.push(key);
      }
    });
    return diffs;
  }, [settings, savedSettings]);

  const hasChanges = changedKeys.length > 0;

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setSettings(savedSettings);
    showToast("คืนค่าเดิมเรียบร้อยแล้ว", "success");
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  async function handleSave() {
    if (!isSuperAdmin) return;
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSavedSettings(settings);
        showToast("บันทึกการตั้งค่าทั้งหมดเรียบร้อยแล้ว!", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  // Quick Discord Channel Notification Test
  async function handleTestChannel(channelId?: string, channelLabel?: string) {
    if (!channelId) {
      showToast("กรุณาเลือกห้อง Discord ก่อนทดสอบส่งข้อความ", "error");
      return;
    }
    setTestingChannel(channelId);
    setTestResult(null);

    try {
      const res = await fetch("/api/discord/test-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json();

      if (res.ok) {
        setTestResult({
          channelId,
          success: true,
          message: `ส่งข้อความทดสอบเข้า ${channelLabel || "ห้องนี้"} สำเร็จแล้ว! ตรวจสอบที่ Discord ได้เลย`,
        });
        showToast("ส่งข้อความทดสอบเข้า Discord สำเร็จ!", "success");
      } else {
        setTestResult({
          channelId,
          success: false,
          message: data.error || "ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบสิทธิ์บอท",
        });
        showToast(data.error || "บอทส่งข้อความไม่สำเร็จ", "error");
      }
    } catch (err: any) {
      setTestResult({
        channelId,
        success: false,
        message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
      showToast(err.message || "Connection error", "error");
    } finally {
      setTestingChannel(null);
    }
  }

  // Quick Slip API test
  async function handleTestSlipApi() {
    const provider = settings.slip_provider || "slipok";
    const apiKey = provider === "easyslip" ? settings.easyslip_api_key : settings.slipok_api_key;
    const branchId = settings.slipok_branch_id;

    if (!apiKey || !apiKey.trim()) {
      showToast("กรุณากรอก API Key ก่อนทดสอบ", "error");
      return;
    }

    setTestingApi(true);
    setApiTestResult(null);

    try {
      const res = await fetch("/api/slips/test-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, branchId }),
      });
      const data = await res.json();
      setApiTestResult(data);
      if (data.success) {
        showToast(data.message, "success");
      } else {
        showToast(data.message, "error");
      }
    } catch (err: any) {
      setApiTestResult({ success: false, message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
      showToast("ไม่สามารถทดสอบ API ได้", "error");
    } finally {
      setTestingApi(false);
    }
  }

  // Quick Welcome Embed Test
  async function handleTestWelcome() {
    const channelId = settings.welcome_channel_id;
    if (!channelId) {
      showToast("กรุณาเลือกห้องส่งข้อความต้อนรับก่อนกดทดสอบ", "error");
      return;
    }

    setTestingWelcome(true);
    try {
      const res = await fetch("/api/welcome/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          title: settings.welcome_title,
          message: settings.welcome_message,
          color: settings.welcome_embed_color || "#2997ff",
          bannerUrl: settings.welcome_banner_url,
          rulesChannelId: settings.rules_channel_id,
          showFields: settings.welcome_show_fields === "true",
          showAuthor: settings.welcome_show_author !== "false",
          authorText: settings.welcome_author_text,
          showThumbnail: settings.welcome_show_thumbnail !== "false",
          showRulesField: settings.welcome_show_rules_field !== "false",
          rulesFieldTitle: settings.welcome_rules_field_title,
          rulesFieldText: settings.welcome_rules_field_text,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "ส่งการ์ดต้อนรับทดสอบเข้า Discord สำเร็จ!", "success");
      } else {
        showToast(data.error || "ไม่สามารถส่งข้อความได้", "error");
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setTestingWelcome(false);
    }
  }

  // Search filter helper
  const q = searchQuery.toLowerCase().trim();
  function matchesSearch(...texts: (string | undefined | null)[]) {
    if (!q) return true;
    return texts.some((t) => t && t.toLowerCase().includes(q));
  }

  // Section visibility checks
  const showAutoSlipCard =
    (activeTab === "all" || activeTab === "auto_slip") &&
    (matchesSearch(
      "ระบบตรวจสลิปอัตโนมัติ",
      "slipok",
      "easyslip",
      "สแกนสลิป",
      "auto verify",
      "api key",
      "branch id",
      "ตรวจบัญชีผู้รับ",
      "สลิป"
    ));

  const showChannelsCard =
    (activeTab === "all" || activeTab === "channels") &&
    (matchesSearch(
      "ห้องสำหรับให้บอทส่งข้อความแจ้งเตือน",
      "discord channels",
      "ห้องส่งข้อความซื้อยศ",
      "shop purchase log",
      "ห้องแจ้งเตือนการตอกบัตร",
      "attendance log",
      "slip",
      "ticket"
    ));

  const showAttendanceCard =
    (activeTab === "all" || activeTab === "attendance") &&
    (matchesSearch(
      "ตั้งค่าระบบตอกบัตรเข้า-ออกงาน",
      "attendance",
      "เปิดใช้งานระบบตอกบัตร",
      "clockin",
      "clockout",
      "ตัดเวลาออกงานอัตโนมัติ",
      "auto clock-out"
    ));

  const showShopCard =
    (activeTab === "all" || activeTab === "shop") &&
    (matchesSearch(
      "ตั้งค่าร้านค้ายศใน discord",
      "shop",
      "เปิดใช้งานร้านค้ายศ",
      "ซื้อยศ"
    ));

  const showWelcomeCard =
    (activeTab === "all" || activeTab === "welcome") &&
    (matchesSearch(
      "ระบบต้อนรับ & แจกยศสมาชิกใหม่อัตโนมัติ",
      "welcome",
      "auto-role",
      "การ์ดต้อนรับ",
      "ห้องส่งข้อความต้อนรับ",
      "ข้อความต้อนรับกำหนดเอง",
      "ยศเริ่มต้นที่ต้องการแจก",
      "แสดงกล่องข้อมูลสมาชิก",
      "member info",
      "ลำดับสมาชิก"
    ));

  const showWalletCard =
    (activeTab === "all" || activeTab === "wallet") &&
    (matchesSearch(
      "ระบบกระเป๋าเงิน & เติมเงิน",
      "wallet",
      "promptpay",
      "พร้อมเพย์",
      "truemoney",
      "ทรูมันนี่",
      "ซองของขวัญ",
      "qr code",
      "/topup"
    ));

  const showTicketsCard =
    (activeTab === "all" || activeTab === "tickets") &&
    (matchesSearch(
      "ระบบทิกเก็ต & ตรวจสอบสลิป",
      "ticket",
      "slip verification",
      "ห้อง discord สำหรับส่งสลิปให้แอดมินตรวจ",
      "admin slip channel",
      "ห้อง discord สำหรับจัดเก็บประวัติทิกเก็ต",
      "ticket archive"
    ));

  return (
    <div style={{ position: "relative", paddingBottom: hasChanges ? "90px" : "20px" }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            borderRadius: "var(--radius-md)",
            background: toast.type === "success" ? "rgba(48, 209, 88, 0.16)" : "rgba(255, 69, 58, 0.16)",
            border: `1px solid ${toast.type === "success" ? "rgba(48, 209, 88, 0.4)" : "rgba(255, 69, 58, 0.4)"}`,
            color: toast.type === "success" ? "#30d158" : "#ff453a",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            fontSize: 13,
            fontWeight: 500,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* SuperAdmin Notice / Status */}
      {!isSuperAdmin && (
        <div className="card mb-24" style={{ borderColor: "rgba(255, 214, 10, 0.2)" }}>
          <div className="card-body" style={{ padding: 16 }}>
            <span style={{ color: "var(--warning)" }}>⚠️ โหมดอ่านอย่างเดียว</span>
            <span className="text-muted" style={{ marginLeft: 8, fontSize: 13 }}>
              เฉพาะ SuperAdmin (OWNER) เท่านั้นที่มีสิทธิ์เปลี่ยนแปลงการตั้งค่าบอทและระบบ
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs & Instant Search Bar */}
      <div className="settings-nav-bar">
        <div className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settings-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-search-wrapper">
          <svg
            className="settings-search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="settings-search-input"
            placeholder="ค้นหาการตั้งค่า... (เช่น ตอกบัตร, พร้อมเพย์)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 1. Bot Notification Channels Card */}
      {showChannelsCard && (
        <div className="card mb-24">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </span>
              ห้องสำหรับให้บอทส่งข้อความแจ้งเตือน (Discord Channels)
            </h3>
            <span className="text-muted text-xs">กดปุ่ม "ทดสอบส่ง" เพื่อเช็คสิทธิ์บอท</span>
          </div>
          <div className="card-body">
            <div className="settings-section">
              {/* Channel 1: Shop */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้องส่งข้อความซื้อยศ (Shop Purchase Log)</div>
                  <div className="settings-row-desc">
                    เมื่อสมาชิกซื้อยศสำเร็จ บอทจะโพสต์ใบเสร็จและประกาศลงในห้องนี้
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.shop_notify_channel || ""}
                      onChange={(val) => handleChange("shop_notify_channel", val)}
                      placeholder="— ไม่เปิดใช้งาน —"
                      searchPlaceholder="ค้นหาห้อง Discord (#channel)..."
                      options={[
                        { value: "", label: "— ไม่เปิดใช้งาน —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                  {settings.shop_notify_channel && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.shop_notify_channel}
                      onClick={() => handleTestChannel(settings.shop_notify_channel, "ห้องซื้อยศ")}
                      title="ทดสอบส่งข้อความแจ้งเตือนเข้าห้องนี้"
                    >
                      {testingChannel === settings.shop_notify_channel ? "⏳ กำลังส่ง..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>

              {/* Channel 2: Attendance */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้องแจ้งเตือนการตอกบัตร (Attendance Log)</div>
                  <div className="settings-row-desc">
                    ส่งบันทึกเมื่อมีแอดมินใช้คำสั่ง /clockin หรือ /clockout
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.attendance_notify_channel || ""}
                      onChange={(val) => handleChange("attendance_notify_channel", val)}
                      placeholder="— ไม่เปิดใช้งาน —"
                      searchPlaceholder="ค้นหาห้อง Discord (#channel)..."
                      options={[
                        { value: "", label: "— ไม่เปิดใช้งาน —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                  {settings.attendance_notify_channel && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.attendance_notify_channel}
                      onClick={() => handleTestChannel(settings.attendance_notify_channel, "ห้องตอกบัตร")}
                      title="ทดสอบส่งข้อความแจ้งเตือนเข้าห้องนี้"
                    >
                      {testingChannel === settings.attendance_notify_channel ? "⏳ กำลังส่ง..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {testResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 14px",
                  borderRadius: "var(--radius-md)",
                  background: testResult.success ? "rgba(48, 209, 88, 0.1)" : "rgba(255, 69, 58, 0.1)",
                  border: `1px solid ${testResult.success ? "rgba(48, 209, 88, 0.25)" : "rgba(255, 69, 58, 0.25)"}`,
                  color: testResult.success ? "#30d158" : "#ff453a",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{testResult.success ? "✓" : "✕"} {testResult.message}</span>
                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: 11 }}
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Attendance Configuration */}
      {showAttendanceCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              ตั้งค่าระบบตอกบัตรเข้า-ออกงาน
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">เปิดใช้งานระบบตอกบัตร</div>
                  <div className="settings-row-desc">
                    อนุญาตให้แอดมินใช้คำสั่ง /clockin และ /clockout ใน Discord
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.attendance_enabled !== "false"}
                    onChange={(e) =>
                      handleChange("attendance_enabled", e.target.checked ? "true" : "false")
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ตัดเวลาออกงานอัตโนมัติ (Auto Clock-out)</div>
                  <div className="settings-row-desc">
                    หากพบการเข้างานที่ค้างเกินจำนวนชั่วโมงนี้ ระบบจะบันทึกออกงานและแจ้งเตือน DM ให้อัตโนมัติ
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min={4}
                    max={24}
                    className="form-input"
                    disabled={!isSuperAdmin}
                    value={settings.auto_clockout_hours || "12"}
                    onChange={(e) => handleChange("auto_clockout_hours", e.target.value)}
                    style={{ width: 100, textAlign: "center" }}
                  />
                  <span className="text-muted" style={{ fontSize: 13 }}>ชั่วโมง</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Shop Configuration */}
      {showShopCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                </svg>
              </span>
              ตั้งค่าร้านค้ายศใน Discord
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">เปิดใช้งานร้านค้ายศ</div>
                  <div className="settings-row-desc">
                    อนุญาตให้สมาชิกเซิร์ฟเวอร์ดูร้านค้าและซื้อยศผ่านบอทได้
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.shop_enabled !== "false"}
                    onChange={(e) =>
                      handleChange("shop_enabled", e.target.checked ? "true" : "false")
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Welcome & Auto-Role Configuration */}
      {showWelcomeCard && (
        <div className="card mb-24">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </span>
              ระบบต้อนรับ & แจกยศสมาชิกใหม่อัตโนมัติ (Welcome Card & Auto-Role)
            </h3>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!isSuperAdmin || testingWelcome || !settings.welcome_channel_id}
                onClick={handleTestWelcome}
                title={!settings.welcome_channel_id ? "กรุณาเลือกห้องส่งข้อความต้อนรับก่อนกดทดสอบ" : "ทดสอบส่งเข้าห้อง Discord ที่เลือก"}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}
              >
                {testingWelcome ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} /> กำลังส่งข้อความ...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    ทดสอบส่งเข้า Discord ทันที
                  </>
                )}
              </button>
            </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
              {/* Left Column: Configuration Controls */}
              <div className="settings-section" style={{ border: "none", padding: 0 }}>
                {/* 1. Toggles */}
                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">เปิดใช้งานการ์ดต้อนรับสมาชิกใหม่</div>
                    <div className="settings-row-desc">
                      ส่งการ์ดต้อนรับแบบ Embed เข้าห้อง Discord ทันทีที่มีสมาชิกใหม่เข้าร่วม
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.welcome_enabled !== "false"}
                      onChange={(e) =>
                        handleChange("welcome_enabled", e.target.checked ? "true" : "false")
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">ส่งข้อความทักทายเข้า DM ส่วนตัว</div>
                    <div className="settings-row-desc">
                      ส่งข้อความต้อนรับและคำแนะนำเข้าแชทส่วนตัวของสมาชิกใหม่อัตโนมัติ
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.welcome_dm_enabled === "true"}
                      onChange={(e) =>
                        handleChange("welcome_dm_enabled", e.target.checked ? "true" : "false")
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">แสดงแถบชื่อผู้เข้าร่วมด้านบน (Author Header)</div>
                    <div className="settings-row-desc">
                      แสดงรูปโปรไฟล์และข้อความ 'ชื่อ เข้าร่วมเซิร์ฟเวอร์ ✨' ที่ส่วนบนสุดของการ์ด (มีหรือไม่มีก็ได้)
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.welcome_show_author !== "false"}
                      onChange={(e) =>
                        handleChange("welcome_show_author", e.target.checked ? "true" : "false")
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {settings.welcome_show_author !== "false" && (
                  <div className="settings-row" style={{ padding: "10px 0", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", paddingLeft: 10, paddingRight: 10 }}>
                    <div>
                      <div className="settings-row-label" style={{ fontSize: 13 }}>ข้อความแถบผู้เข้าร่วม (Author Text)</div>
                      <div className="settings-row-desc">
                        ค่าเริ่มต้น: &#123;name&#125; เข้าร่วมเซิร์ฟเวอร์ ✨
                      </div>
                    </div>
                    <div style={{ minWidth: 200, maxWidth: 300, width: "100%" }}>
                      <input
                        type="text"
                        className="form-input"
                        disabled={!isSuperAdmin}
                        value={settings.welcome_author_text || ""}
                        onChange={(e) => handleChange("welcome_author_text", e.target.value)}
                        placeholder="{name} เข้าร่วมเซิร์ฟเวอร์ ✨"
                        style={{ width: "100%", fontSize: 13 }}
                      />
                    </div>
                  </div>
                )}

                {/* Thumbnail Toggle (Image on the right side) */}
                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">รูปภาพด้านขวาของการ์ด (Thumbnail)</div>
                    <div className="settings-row-desc">
                      แสดงรูปโปรไฟล์ของผู้เข้าร่วมที่มุมขวาบนของ Embed (มีหรือไม่มีก็ได้)
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.welcome_show_thumbnail !== "false"}
                      onChange={(e) =>
                        handleChange("welcome_show_thumbnail", e.target.checked ? "true" : "false")
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">แสดงกล่องข้อมูลสมาชิก 3 ช่อง (Member Info Grid)</div>
                    <div className="settings-row-desc">
                      แสดงแถบข้อมูลสมาชิก (@ชื่อ), ลำดับสมาชิกคนที่, และวันที่สร้างบัญชี (ปิดเพื่อความมินิมอล ไม่รก)
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.welcome_show_fields === "true"}
                      onChange={(e) =>
                        handleChange("welcome_show_fields", e.target.checked ? "true" : "false")
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {/* 2. Channel Selectors */}
                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">ห้องส่งข้อความต้อนรับ (Welcome Channel)</div>
                    <div className="settings-row-desc">
                      เลือกห้องใน Discord ที่ต้องการให้บอทส่งการ์ดต้อนรับ
                    </div>
                  </div>
                  <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.welcome_channel_id || ""}
                      onChange={(val) => handleChange("welcome_channel_id", val)}
                      placeholder="— ไม่เลือกห้อง —"
                      options={[
                        { value: "", label: "— ไม่เลือกห้อง —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">ห้องกฎระเบียบเซิร์ฟเวอร์ (Rules Channel)</div>
                    <div className="settings-row-desc">
                      ใช้สำหรับทำปุ่มกดลิงก์และแทนที่ตัวแปร &#123;rules&#125;
                    </div>
                  </div>
                  <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.rules_channel_id || ""}
                      onChange={(val) => handleChange("rules_channel_id", val)}
                      placeholder="— ตรวจหาอัตโนมัติ —"
                      options={[
                        { value: "", label: "— ตรวจหาอัตโนมัติ —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* Rules Field Toggle */}
                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">แสดงกล่องข้อความกฎระเบียบ (Rules Field)</div>
                    <div className="settings-row-desc">
                      แสดงกล่องข้อความแนะนำเริ่มต้นใช้งานและห้องกฎระเบียบใน Embed (มีหรือไม่มีก็ได้)
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.welcome_show_rules_field !== "false"}
                      onChange={(e) =>
                        handleChange("welcome_show_rules_field", e.target.checked ? "true" : "false")
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {/* Rules Field Custom Title & Text (if enabled) */}
                {settings.welcome_show_rules_field !== "false" && (
                  <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", padding: "10px 12px", marginBottom: 12 }}>
                    <div className="settings-row" style={{ padding: "8px 0" }}>
                      <div>
                        <div className="settings-row-label" style={{ fontSize: 13 }}>หัวข้อกล่องกฎระเบียบ (Field Title)</div>
                        <div className="settings-row-desc">
                          ค่าเริ่มต้น: 📜 เริ่มต้นใช้งาน (ปรับเปลี่ยนได้อิสระ)
                        </div>
                      </div>
                      <div style={{ minWidth: 220, maxWidth: 320, width: "100%" }}>
                        <input
                          type="text"
                          className="form-input"
                          disabled={!isSuperAdmin}
                          value={settings.welcome_rules_field_title !== undefined ? settings.welcome_rules_field_title : ""}
                          onChange={(e) => handleChange("welcome_rules_field_title", e.target.value)}
                          placeholder="📜 เริ่มต้นใช้งาน"
                          style={{ width: "100%", fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div className="settings-row" style={{ padding: "8px 0" }}>
                      <div>
                        <div className="settings-row-label" style={{ fontSize: 13 }}>ข้อความกล่องกฎระเบียบ (Field Text)</div>
                        <div className="settings-row-desc">
                          ค่าเริ่มต้น: อ่านกฎระเบียบก่อนเริ่มคุย: &#123;rules&#125;
                        </div>
                      </div>
                      <div style={{ minWidth: 220, maxWidth: 320, width: "100%" }}>
                        <input
                          type="text"
                          className="form-input"
                          disabled={!isSuperAdmin}
                          value={settings.welcome_rules_field_text !== undefined ? settings.welcome_rules_field_text : ""}
                          onChange={(e) => handleChange("welcome_rules_field_text", e.target.value)}
                          placeholder="อ่านกฎระเบียบก่อนเริ่มคุย: {rules}"
                          style={{ width: "100%", fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {[
                        { tag: "{rules}", desc: "แท็กห้องกฎ" },
                        { tag: "{server}", desc: "ชื่อเซิร์ฟเวอร์" },
                        { tag: "{user}", desc: "แท็กสมาชิก" },
                      ].map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          className="btn btn-xs btn-secondary"
                          disabled={!isSuperAdmin}
                          onClick={() => {
                            const cur = settings.welcome_rules_field_text !== undefined ? settings.welcome_rules_field_text : "อ่านกฎระเบียบก่อนเริ่มคุย: {rules}";
                            handleChange("welcome_rules_field_text", cur + " " + item.tag);
                          }}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            fontFamily: "var(--font-mono, monospace)",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                          title={item.desc}
                        >
                          + {item.tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Title */}
                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">หัวข้อการ์ดต้อนรับ (Title)</div>
                    <div className="settings-row-desc">
                      ข้อความหัวเรื่องด้านบนการ์ด (เว้นว่างไว้หากไม่ต้องการให้มีหัวข้อ หรือใช้ &#123;server&#125;, &#123;name&#125; ได้)
                    </div>
                  </div>
                  <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-input"
                        disabled={!isSuperAdmin}
                        value={settings.welcome_title !== undefined ? settings.welcome_title : ""}
                        onChange={(e) => handleChange("welcome_title", e.target.value)}
                        placeholder="เว้นว่างได้ (ไม่แสดงหัวข้อ)"
                        style={{ flex: 1 }}
                      />
                      {settings.welcome_title && (
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary"
                          disabled={!isSuperAdmin}
                          onClick={() => handleChange("welcome_title", "")}
                          title="ลบหัวข้อ (ไม่ใส่หัวข้อ)"
                          style={{ padding: "4px 8px", fontSize: 11, flexShrink: 0 }}
                        >
                          ✕ ลบ
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Color Palette */}
                <div className="settings-row" style={{ padding: "12px 0", alignItems: "flex-start" }}>
                  <div>
                    <div className="settings-row-label">สีแถบข้างการ์ด Embed (Theme Color)</div>
                    <div className="settings-row-desc">
                      เลือกสีของเส้นขอบด้านซ้ายของการ์ดต้อนรับใน Discord
                    </div>
                  </div>
                  <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {[
                        { color: "#2997ff", label: "Apple Blue" },
                        { color: "#00f0ff", label: "Cyan" },
                        { color: "#30d158", label: "Green" },
                        { color: "#8b5cf6", label: "Purple" },
                        { color: "#ffd60a", label: "Gold" },
                        { color: "#ff453a", label: "Red" },
                        { color: "#16161c", label: "Dark" },
                      ].map((preset) => {
                        const isSelected = (settings.welcome_embed_color || "#2997ff").toLowerCase() === preset.color.toLowerCase();
                        return (
                          <button
                            key={preset.color}
                            type="button"
                            disabled={!isSuperAdmin}
                            onClick={() => handleChange("welcome_embed_color", preset.color)}
                            title={preset.label}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              backgroundColor: preset.color,
                              border: isSelected ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.2)",
                              boxShadow: isSelected ? `0 0 10px ${preset.color}` : "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          />
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="color"
                        disabled={!isSuperAdmin}
                        value={settings.welcome_embed_color || "#2997ff"}
                        onChange={(e) => handleChange("welcome_embed_color", e.target.value)}
                        style={{
                          width: 34,
                          height: 34,
                          padding: 0,
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-subtle)",
                          backgroundColor: "transparent",
                          cursor: "pointer",
                        }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        disabled={!isSuperAdmin}
                        value={settings.welcome_embed_color || "#2997ff"}
                        onChange={(e) => handleChange("welcome_embed_color", e.target.value)}
                        placeholder="#2997ff"
                        style={{ flex: 1, fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Message Content & Quick Insert Chips */}
                <div style={{ padding: "12px 0" }}>
                  <div style={{ marginBottom: 8 }}>
                    <div className="settings-row-label">ข้อความต้อนรับกำหนดเอง (Welcome Message)</div>
                    <div className="settings-row-desc">
                      พิมพ์ข้อความต้อนรับ รองรับการขึ้นบรรทัดใหม่ และคลิกแท็กตัวแปรด้านล่างเพื่อแทรกอัตโนมัติ
                    </div>
                  </div>
                  <textarea
                    className="form-input"
                    disabled={!isSuperAdmin}
                    rows={5}
                    value={
                      settings.welcome_message !== undefined
                        ? settings.welcome_message
                        : "ยินดีต้อนรับสู่ {server}! ขอให้มีความสุขกับการพูดคุยและร่วมกิจกรรมกับพวกเรานะครับ ✨"
                    }
                    onChange={(e) => handleChange("welcome_message", e.target.value)}
                    placeholder="พิมพ์ข้อความต้อนรับที่นี่..."
                    style={{ width: "100%", lineHeight: 1.5, resize: "vertical" }}
                  />
                  {/* Variable insertion tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {[
                      { tag: "{user}", desc: "แท็กสมาชิก (@ชื่อ)" },
                      { tag: "{username}", desc: "ชื่อไอดี" },
                      { tag: "{name}", desc: "ชื่อแสดง" },
                      { tag: "{server}", desc: "ชื่อเซิร์ฟเวอร์" },
                      { tag: "{count}", desc: "สมาชิกลำดับที่" },
                      { tag: "{rules}", desc: "แท็กห้องกฎ" },
                    ].map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        className="btn btn-xs btn-secondary"
                        disabled={!isSuperAdmin}
                        onClick={() => {
                          const cur = settings.welcome_message !== undefined ? settings.welcome_message : "ยินดีต้อนรับสู่ {server}!";
                          handleChange("welcome_message", cur + " " + item.tag);
                        }}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          fontFamily: "var(--font-mono, monospace)",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                        title={item.desc}
                      >
                        + {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Banner URL */}
                <div className="settings-row" style={{ padding: "12px 0" }}>
                  <div>
                    <div className="settings-row-label">รูปภาพแบนเนอร์ด้านล่าง (Banner Image URL)</div>
                    <div className="settings-row-desc">
                      URL รูปภาพแนวนอนสำหรับแสดงด้านล่างของการ์ด (เว้นว่างเพื่อใช้แบนเนอร์ของเซิร์ฟเวอร์)
                    </div>
                  </div>
                  <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                    <input
                      type="url"
                      className="form-input"
                      disabled={!isSuperAdmin}
                      value={settings.welcome_banner_url || ""}
                      onChange={(e) => handleChange("welcome_banner_url", e.target.value)}
                      placeholder="https://example.com/banner.png"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* 7. Auto-Role */}
                <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 12, paddingTop: 12 }}>
                  <div className="settings-row" style={{ padding: "10px 0" }}>
                    <div>
                      <div className="settings-row-label">เปิดใช้งานแจกยศเริ่มต้นอัตโนมัติ (Auto-Role)</div>
                      <div className="settings-row-desc">
                        มอบยศให้สมาชิกใหม่ทันทีที่กดเข้าเซิร์ฟเวอร์ โดยไม่ต้องรอแอดมินกดให้
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        disabled={!isSuperAdmin}
                        checked={settings.autorole_enabled === "true"}
                        onChange={(e) =>
                          handleChange("autorole_enabled", e.target.checked ? "true" : "false")
                        }
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="settings-row" style={{ padding: "10px 0" }}>
                    <div>
                      <div className="settings-row-label">ยศเริ่มต้นที่ต้องการแจก (Default Role)</div>
                      <div className="settings-row-desc">
                        เลือกยศจากเซิร์ฟเวอร์ Discord สำหรับสมาชิกใหม่
                      </div>
                    </div>
                    <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                      <CustomSelect
                        disabled={!isSuperAdmin || loadingChannels}
                        value={settings.autorole_id || ""}
                        onChange={(val) => handleChange("autorole_id", val)}
                        placeholder="— ไม่แจกยศ —"
                        options={[
                          { value: "", label: "— ไม่แจกยศ —" },
                          ...roles.map((r) => ({
                            value: r.id,
                            label: `@${r.name}`,
                            sub: `ID: ${r.id}`,
                          })),
                        ]}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Discord Embed Mockup */}
              <div
                style={{
                  background: "rgba(10, 10, 14, 0.7)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Live Preview • ตัวอย่างการ์ดใน Discord
                  </span>
                  <span style={{ fontSize: 11, color: "var(--accent)", background: "rgba(41,151,255,0.1)", padding: "2px 8px", borderRadius: 9999 }}>
                    Real-time Sync
                  </span>
                </div>

                {/* Discord Message Mockup */}
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  {/* Bot Avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#000",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <img src="/logo.png" alt="Bot" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e: any) => { e.target.style.display = "none"; }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Bot Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>LynnBot</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: "#5865f2",
                          color: "#fff",
                          borderRadius: 3,
                          padding: "1px 4px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        APP
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>วันนี้ เวลา 16:45</span>
                    </div>

                    <div style={{ fontSize: 14, color: "#939aff", marginBottom: 8 }}>@จิ๊กโก๋</div>

                    {/* Discord Embed Box */}
                    <div
                      style={{
                        backgroundColor: "#2b2d31",
                        borderLeft: `4px solid ${settings.welcome_embed_color || "#2997ff"}`,
                        borderRadius: "0 4px 4px 0",
                        padding: "12px 16px",
                        maxWidth: 480,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                      }}
                    >
                      {/* Author (Optional: rendered only if showAuthor is true) */}
                      {settings.welcome_show_author !== "false" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#555", overflow: "hidden" }}>
                            <img src="/logo.png" alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e: any) => { e.target.style.display = "none"; }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#dbdee1" }}>
                            {(settings.welcome_author_text || "{name} เข้าร่วมเซิร์ฟเวอร์ ✨")
                              .replace(/\{name\}/g, "จิ๊กโก๋")
                              .replace(/\{user\}/g, "@จิ๊กโก๋")
                              .replace(/\{server\}/g, "753 BC")}
                          </span>
                        </div>
                      )}

                      {/* Title & Thumbnail Grid */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          {/* Title (Optional) */}
                          {Boolean(settings.welcome_title && settings.welcome_title.trim()) && (
                            <h4
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#fff",
                                margin: "0 0 8px 0",
                                lineHeight: 1.3,
                              }}
                            >
                              {settings.welcome_title
                                .replace(/\{server\}/g, "753 BC")
                                .replace(/\{user\}/g, "จิ๊กโก๋")
                                .replace(/\{name\}/g, "จิ๊กโก๋")}
                            </h4>
                          )}

                          {/* Description */}
                          <div
                            style={{
                              fontSize: 13,
                              color: "#dbdee1",
                              lineHeight: 1.45,
                              whiteSpace: "pre-line",
                              marginBottom: 12,
                            }}
                          >
                            {(settings.welcome_message || "ยินดีต้อนรับสู่ {server}! ขอให้มีความสุขกับการพูดคุยและร่วมกิจกรรมกับพวกเรานะครับ ✨")
                              .replace(/\{user\}/g, "@จิ๊กโก๋")
                              .replace(/\{username\}/g, "dasd08930")
                              .replace(/\{name\}/g, "จิ๊กโก๋")
                              .replace(/\{server\}/g, "753 BC")
                              .replace(/\{count\}/g, "60")
                              .replace(/\{rules\}/g, "#rules")}
                          </div>
                        </div>

                        {/* Thumbnail (Optional: rendered only if show_thumbnail is not false) */}
                        {settings.welcome_show_thumbnail !== "false" && (
                          <div
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: "50%",
                              backgroundColor: "#404249",
                              overflow: "hidden",
                              flexShrink: 0,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                            }}
                          >
                            <img src="/logo.png" alt="Member" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e: any) => { e.target.style.display = "none"; }} />
                          </div>
                        )}
                      </div>

                      {/* Fields (Optional: Hidden by default) */}
                      {settings.welcome_show_fields === "true" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "10px 0" }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#949ba4" }}>👤 สมาชิก</div>
                            <div style={{ fontSize: 12, color: "#5865f2", fontWeight: 600 }}>@จิ๊กโก๋</div>
                            <div style={{ fontSize: 10, color: "#80848e" }}>dasd08930</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#949ba4" }}>👥 ลำดับสมาชิก</div>
                            <div style={{ fontSize: 12, color: "#dbdee1", fontWeight: 600 }}>คนที่ #60</div>
                            <div style={{ fontSize: 10, color: "#80848e" }}>ในเซิร์ฟเวอร์</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#949ba4" }}>📅 สร้างบัญชีเมื่อ</div>
                            <div style={{ fontSize: 12, color: "#dbdee1" }}>วันนี้</div>
                            <div style={{ fontSize: 10, color: "#80848e" }}>(จำลอง)</div>
                          </div>
                        </div>
                      )}

                      {/* Rules field (Optional: rendered only if show_rules_field is not false and rules_channel_id is set) */}
                      {settings.welcome_show_rules_field !== "false" && settings.rules_channel_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#949ba4" }}>
                            {settings.welcome_rules_field_title && settings.welcome_rules_field_title.trim()
                              ? settings.welcome_rules_field_title
                              : "📜 เริ่มต้นใช้งาน"}
                          </div>
                          <div style={{ fontSize: 12, color: "#5865f2" }}>
                            {(settings.welcome_rules_field_text && settings.welcome_rules_field_text.trim()
                              ? settings.welcome_rules_field_text
                              : "อ่านกฎระเบียบก่อนเริ่มคุย: {rules}")
                              .replace(/\{rules\}/g, "#rules")
                              .replace(/\{server\}/g, "753 BC")
                              .replace(/\{user\}/g, "@จิ๊กโก๋")
                              .replace(/\{name\}/g, "จิ๊กโก๋")}
                          </div>
                        </div>
                      )}

                      {/* Banner Image Preview */}
                      {settings.welcome_banner_url && (
                        <div style={{ marginTop: 10, borderRadius: 4, overflow: "hidden", maxHeight: 180 }}>
                          <img
                            src={settings.welcome_banner_url}
                            alt="Banner Preview"
                            style={{ width: "100%", objectFit: "cover" }}
                            onError={(e: any) => { e.target.style.display = "none"; }}
                          />
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#949ba4" }}>
                        <span>753 BC Community • LynnBot Welcome System</span>
                      </div>
                    </div>

                    {/* Discord Action Button Mockup */}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: "#4e5058",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "6px 12px",
                          borderRadius: 3,
                          cursor: "default",
                        }}
                      >
                        <span>📖</span>
                        <span>กฎระเบียบเซิร์ฟเวอร์ ↗</span>
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: "#4e5058",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "6px 12px",
                          borderRadius: 3,
                          cursor: "default",
                        }}
                      >
                        <span>📢</span>
                        <span>ห้องประกาศเซิร์ฟเวอร์ ↗</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
                  * ตัวอย่างด้านบนจำลองหน้าตาข้อความที่จะแสดงใน Discord จริงตามค่าที่คุณกำหนด
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Wallet & Payment Configuration */}
      {showWalletCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              ระบบกระเป๋าเงิน & เติมเงิน (Wallet & PromptPay Topup)
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">หมายเลขพร้อมเพย์สำหรับรับเงิน (PromptPay)</div>
                  <div className="settings-row-desc">
                    เบอร์โทรศัพท์หรือเลขประจำตัวผู้เสียภาษี สำหรับสร้าง QR Code ในคำสั่ง /topup
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น 0812345678 หรือ 140000..."
                    disabled={!isSuperAdmin}
                    value={settings.promptpay_number || ""}
                    onChange={(e) => handleChange("promptpay_number", e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">เบอร์ TrueMoney Wallet สำหรับรับซองของขวัญ</div>
                  <div className="settings-row-desc">
                    เบอร์โทรศัพท์ทรูมันนี่สำหรับให้บอทดึงเงินจากลิงก์ซองของขวัญ TrueMoney เข้ากระเป๋าอัตโนมัติ
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น 0812345678"
                    disabled={!isSuperAdmin}
                    value={settings.truemoney_phone || ""}
                    onChange={(e) => handleChange("truemoney_phone", e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Ticket & Slip Verification Channels */}
      {showTicketsCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </span>
              ระบบทิกเก็ต & ตรวจสอบสลิป (Ticket & Slip Verification)
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้อง Discord สำหรับส่งสลิปให้แอดมินตรวจ (Admin Slip Channel)</div>
                  <div className="settings-row-desc">
                    เมื่อสมาชิกส่งสลิปโอนเงิน บอทจะส่งสลิปพร้อมปุ่มกดอนุมัติ/ปฏิเสธมายังห้องนี้ทันที
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.slip_notify_channel || ""}
                      onChange={(val) => handleChange("slip_notify_channel", val)}
                      placeholder="— ไม่กำหนดห้องแจ้งสลิป —"
                      options={[
                        { value: "", label: "— ไม่กำหนดห้องแจ้งสลิป —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                  {settings.slip_notify_channel && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.slip_notify_channel}
                      onClick={() => handleTestChannel(settings.slip_notify_channel, "ห้องแจ้งสลิป")}
                      title="ทดสอบส่งข้อความเข้าห้องนี้"
                    >
                      {testingChannel === settings.slip_notify_channel ? "⏳..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้อง Discord สำหรับจัดเก็บประวัติทิกเก็ต (Ticket Archive)</div>
                  <div className="settings-row-desc">
                    เมื่อแอดมินปิดทิกเก็ต บอทจะสำเนาข้อความ (.txt) และรูปภาพทั้งหมดเข้าไปเก็บถาวรในห้องนี้
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.ticket_log_channel || ""}
                      onChange={(val) => handleChange("ticket_log_channel", val)}
                      placeholder="— ไม่บันทึกลงดิสคอร์ด —"
                      options={[
                        { value: "", label: "— ไม่บันทึกลงดิสคอร์ด —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                  {settings.ticket_log_channel && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.ticket_log_channel}
                      onClick={() => handleTestChannel(settings.ticket_log_channel, "ห้องบันทึกทิกเก็ต")}
                      title="ทดสอบส่งข้อความเข้าห้องนี้"
                    >
                      {testingChannel === settings.ticket_log_channel ? "⏳..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Auto Slip Verification (SlipOK & EasySlip) */}
      {showAutoSlipCard && (
        <div className="card mb-24" style={{ border: settings.slip_auto_verify === "true" ? "1px solid rgba(48, 209, 88, 0.3)" : undefined }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="card-title">
              <span className="card-title-icon" style={{ color: settings.slip_auto_verify === "true" ? "#30d158" : undefined }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </span>
              ระบบตรวจสลิปอัตโนมัติ (SlipOK & EasySlip Auto-Verification)
            </h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 9999,
                background: settings.slip_auto_verify === "true" ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 255, 255, 0.05)",
                color: settings.slip_auto_verify === "true" ? "#30d158" : "var(--text-muted)",
                border: `1px solid ${settings.slip_auto_verify === "true" ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
              }}
            >
              {settings.slip_auto_verify === "true" ? "● กำลังทำงาน (ACTIVE)" : "○ ปิดใช้งาน (DISABLED)"}
            </span>
          </div>

          <div className="card-body">
            <div className="settings-section">
              {/* Row 1: Enable Auto Verify */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">เปิดใช้งานระบบตรวจสลิปอัตโนมัติ 24 ชม.</div>
                  <div className="settings-row-desc">
                    เมื่อสมาชิกส่งภาพสลิปในห้องทิกเก็ต บอทจะสแกน QR Code ตรวจสอบยอดเงิน วันที่ และบัญชีผู้รับ แล้วเติมเงินให้ทันทีใน 3 วินาที
                  </div>
                </div>
                <div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.slip_auto_verify === "true"}
                      onChange={(e) => handleChange("slip_auto_verify", e.target.checked ? "true" : "false")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Row 2: Provider Selection */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ผู้ให้บริการตรวจสอบสลิป (API Provider)</div>
                  <div className="settings-row-desc">
                    เลือก API ที่คุณใช้งาน (SlipOK คือมาตรฐานยอดนิยมสำหรับสลิปธนาคารไทย)
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => handleChange("slip_provider", "slipok")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-sm)",
                      border: (settings.slip_provider || "slipok") === "slipok" ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: (settings.slip_provider || "slipok") === "slipok" ? "rgba(10, 132, 255, 0.15)" : "rgba(255,255,255,0.03)",
                      color: (settings.slip_provider || "slipok") === "slipok" ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ⚡ SlipOK (แนะนำ)
                  </button>
                  <button
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => handleChange("slip_provider", "easyslip")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-sm)",
                      border: settings.slip_provider === "easyslip" ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: settings.slip_provider === "easyslip" ? "rgba(10, 132, 255, 0.15)" : "rgba(255,255,255,0.03)",
                      color: settings.slip_provider === "easyslip" ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🌐 EasySlip
                  </button>
                </div>
              </div>

              {/* Row 3: API Key & Branch ID based on Provider */}
              {(settings.slip_provider || "slipok") === "slipok" ? (
                <>
                  <div className="settings-row">
                    <div>
                      <div className="settings-row-label">SlipOK Authorization API Key</div>
                      <div className="settings-row-desc">
                        คีย์ x-authorization ที่ได้จากแดชบอร์ด SlipOK (https://slipok.com)
                      </div>
                    </div>
                    <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", gap: 8 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <input
                          type={showApiKey ? "text" : "password"}
                          className="form-input"
                          placeholder="เช่น eyJhbGciOi..."
                          disabled={!isSuperAdmin}
                          value={settings.slipok_api_key || ""}
                          onChange={(e) => handleChange("slipok_api_key", e.target.value)}
                          style={{ width: "100%", paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          {showApiKey ? "🙈" : "👁️"}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="channel-test-btn"
                        disabled={!isSuperAdmin || testingApi || !settings.slipok_api_key}
                        onClick={handleTestSlipApi}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {testingApi ? "⏳ กำลังทดสอบ..." : "🧪 ทดสอบ API"}
                      </button>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div>
                      <div className="settings-row-label">SlipOK รหัสสาขา (Branch ID)</div>
                      <div className="settings-row-desc">
                        (ทางเลือก) ระบุรหัสสาขาหากสร้าง Branch ไว้ใน SlipOK หรือปล่อยว่างไว้เพื่อใช้สาขาหลัก
                      </div>
                    </div>
                    <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น 1 หรือ branch_01 (ไม่ใส่ก็ได้)"
                        disabled={!isSuperAdmin}
                        value={settings.slipok_branch_id || ""}
                        onChange={(e) => handleChange("slipok_branch_id", e.target.value)}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">EasySlip Bearer Token</div>
                    <div className="settings-row-desc">
                      API Token ที่ได้จาก EasySlip Developer Dashboard (https://developer.easyslip.com)
                    </div>
                  </div>
                  <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        type={showApiKey ? "text" : "password"}
                        className="form-input"
                        placeholder="Bearer Token..."
                        disabled={!isSuperAdmin}
                        value={settings.easyslip_api_key || ""}
                        onChange={(e) => handleChange("easyslip_api_key", e.target.value)}
                        style={{ width: "100%", paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        {showApiKey ? "🙈" : "👁️"}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingApi || !settings.easyslip_api_key}
                      onClick={handleTestSlipApi}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {testingApi ? "⏳ กำลังทดสอบ..." : "🧪 ทดสอบ API"}
                    </button>
                  </div>
                </div>
              )}

              {/* API Test Result Banner */}
              {apiTestResult && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: apiTestResult.success ? "rgba(48, 209, 88, 0.12)" : "rgba(255, 69, 58, 0.12)",
                    border: `1px solid ${apiTestResult.success ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 69, 58, 0.3)"}`,
                    color: apiTestResult.success ? "#30d158" : "#ff453a",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span>{apiTestResult.success ? "✅" : "❌"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{apiTestResult.message}</div>
                    {apiTestResult.details && <div style={{ fontSize: 11, opacity: 0.8 }}>{apiTestResult.details}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setApiTestResult(null)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Row 4: Account Protection & Anti-Fraud */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ระบบป้องกันสลิปผิดบัญชี (Check Receiver Account)</div>
                  <div className="settings-row-desc">
                    ตรวจสอบว่าบัญชีผู้รับในสลิปตรงกับบัญชีร้านของคุณหรือไม่ หากไม่ตรงระบบจะไม่ปล่อยผ่านอัตโนมัติ
                  </div>
                </div>
                <div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.slip_check_receiver === "true"}
                      onChange={(e) => handleChange("slip_check_receiver", e.target.checked ? "true" : "false")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {settings.slip_check_receiver === "true" && (
                <>
                  <div className="settings-row">
                    <div>
                      <div className="settings-row-label">เลขบัญชีหรือเบอร์พร้อมเพย์ที่ต้องตรง (Target Account)</div>
                      <div className="settings-row-desc">
                        ระบุเบอร์พร้อมเพย์ หรือเลขที่บัญชี 4-10 หลักท้ายที่เปิดรับเงิน
                      </div>
                    </div>
                    <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น 0812345678 หรือ 1234"
                        disabled={!isSuperAdmin}
                        value={settings.slip_receiver_account || ""}
                        onChange={(e) => handleChange("slip_receiver_account", e.target.value)}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  <div className="settings-row">
                    <div>
                      <div className="settings-row-label">คำค้นหาชื่อบัญชีผู้รับ (Account Name Match)</div>
                      <div className="settings-row-desc">
                        ระบุชื่อหรือนามสกุลเจ้าของบัญชี (เช่น "จิรภัทร") เพื่อตรวจว่ามีคำนี้ในชื่อบัญชีปลายทาง
                      </div>
                    </div>
                    <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น จิรภัทร หรือ นาย..."
                        disabled={!isSuperAdmin}
                        value={settings.slip_receiver_name || ""}
                        onChange={(e) => handleChange("slip_receiver_name", e.target.value)}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Row 5: Amount Limits */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ขอบเขตยอดเงินที่อนุมัติอัตโนมัติ (Safety Limits)</div>
                  <div className="settings-row-desc">
                    กำหนดยอดเงินขั้นต่ำและยอดเงินสูงสุดที่อนุญาตให้อนุมัติอัตโนมัติ (ถ้ายอดสูงเกินไปจะค้างรอแอดมินดูความปลอดภัย)
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 280, maxWidth: 360, width: "100%" }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="ขั้นต่ำ (เช่น 1)"
                      disabled={!isSuperAdmin}
                      value={settings.slip_min_amount || "1"}
                      onChange={(e) => handleChange("slip_min_amount", e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <span className="text-muted text-xs">ถึง</span>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="สูงสุด (เช่น 10000)"
                      disabled={!isSuperAdmin}
                      value={settings.slip_max_amount || "10000"}
                      onChange={(e) => handleChange("slip_max_amount", e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <span className="text-muted text-xs">THB</span>
                </div>
              </div>

              {/* Row 6: Auto Role Reward */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">แจกยศอัตโนมัติเมื่อชำระเงินสำเร็จ (Customer Role)</div>
                  <div className="settings-row-desc">
                    (ทางเลือก) เมื่อสมาชิกเติมเงินสำเร็จ บอทจะมอบยศนี้ให้ใน Discord ทันที เช่น ยศ "ลูกค้า / Verified Buyer"
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                  <CustomSelect
                    disabled={!isSuperAdmin || loadingChannels}
                    value={settings.slip_auto_role_id || ""}
                    onChange={(val) => handleChange("slip_auto_role_id", val)}
                    placeholder="— ไม่แจกยศอัตโนมัติ —"
                    options={[
                      { value: "", label: "— ไม่แจกยศอัตโนมัติ —" },
                      ...roles.map((r) => ({
                        value: r.id,
                        label: `@${r.name}`,
                        sub: `ID: ${r.id}`,
                      })),
                    ]}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No matching search result */}
      {searchQuery && !showChannelsCard && !showAttendanceCard && !showShopCard && !showWelcomeCard && !showWalletCard && !showTicketsCard && !showAutoSlipCard && (
        <div className="card" style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>ไม่พบการตั้งค่าที่ตรงกับ "{searchQuery}"</div>
          <p className="text-muted text-xs">ลองค้นหาด้วยคำอื่น เช่น "ตอกบัตร", "พร้อมเพย์", "ยศ", "แจ้งเตือน", "สลิป"</p>
        </div>
      )}

      {/* Normal Bottom Save Bar (Static) */}
      {isSuperAdmin && (
        <div className="flex items-center justify-between" style={{ padding: "12px 0 24px" }}>
          <div className="text-muted text-xs">
            {hasChanges
              ? `✏️ มีการแก้ไขค้างอยู่ ${changedKeys.length} รายการ`
              : "✓ การตั้งค่าทั้งหมดเป็นปัจจุบัน"}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {hasChanges && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={saving}
              >
                คืนค่าเดิม
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "กำลังบันทึก..." : hasChanges ? "บันทึกการตั้งค่า" : "บันทึกแล้ว"}
            </button>
          </div>
        </div>
      )}

      {/* Floating Sticky Save Bar (Appears seamlessly when user makes any changes) */}
      {isSuperAdmin && hasChanges && (
        <div className="sticky-save-bar" id="sticky-save-bar">
          <div className="sticky-save-status">
            <span className="sticky-save-status-dot" />
            <div>
              <strong>มีการเปลี่ยนแปลงการตั้งค่า ({changedKeys.length} รายการ)</strong>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                อย่าลืมกดบันทึกเพื่อให้การตั้งค่ามีผลกับการทำงานของบอท
              </div>
            </div>
          </div>

          <div className="sticky-save-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ minWidth: 120 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "กำลังบันทึก..." : "💾 บันทึกทันที"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
