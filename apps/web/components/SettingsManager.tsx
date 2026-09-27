"use client";

import { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";

interface DiscordChannel {
  id: string;
  name: string;
}

interface SettingsManagerProps {
  initialSettings: Record<string, string>;
  isSuperAdmin: boolean;
}

export default function SettingsManager({
  initialSettings,
  isSuperAdmin,
}: SettingsManagerProps) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!isSuperAdmin) return;
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
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

      {/* Bot Notification Channels Card */}
      <div className="card mb-24">
        <div className="card-header">
          <h3 className="card-title">
            <span className="card-title-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
            ห้องสำหรับให้บอทส่งข้อความแจ้งเตือน (Discord Channels)
          </h3>
        </div>
        <div className="card-body">
          <div className="settings-section">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">ห้องส่งข้อความซื้อยศ (Shop Purchase Log)</div>
                <div className="settings-row-desc">
                  เมื่อสมาชิกซื้อยศสำเร็จ บอทจะโพสต์ใบเสร็จและประกาศลงในห้องนี้
                </div>
              </div>
              <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
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
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label">ห้องแจ้งเตือนการตอกบัตร (Attendance Log)</div>
                <div className="settings-row-desc">
                  ส่งบันทึกเมื่อมีแอดมินใช้คำสั่ง /clockin หรือ /clockout
                </div>
              </div>
              <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
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
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Configuration */}
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
                  อนุญาตให้แอดมินใช้คำสั่ง /clockin และ /clockout
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

      {/* Shop Configuration */}
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

      {/* 4. Welcome & Auto-Role Configuration */}
      <div className="card mb-24">
        <div className="card-header">
          <h3 className="card-title">
            <span className="card-title-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </span>
            ระบบต้อนรับ & แจกยศสมาชิกใหม่อัตโนมัติ (Welcome & Auto-Role)
          </h3>
        </div>
        <div className="card-body">
          <div className="settings-section">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">เปิดใช้งานการ์ดต้อนรับสมาชิกใหม่</div>
                <div className="settings-row-desc">
                  เมื่อมีสมาชิกกดเข้าร่วมเซิร์ฟเวอร์ บอทจะส่งการ์ดต้อนรับพร้อมรูปโปรไฟล์
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

            <div className="settings-row">
              <div>
                <div className="settings-row-label">ห้องส่งข้อความต้อนรับ (Welcome Channel)</div>
                <div className="settings-row-desc">
                  เลือกห้องใน Discord ที่ต้องการให้บอทส่งการ์ดต้อนรับ
                </div>
              </div>
              <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
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

            <div className="settings-row">
              <div>
                <div className="settings-row-label">ข้อความต้อนรับกำหนดเอง</div>
                <div className="settings-row-desc">
                  รองรับตัวแปร &#123;user&#125;, &#123;username&#125;, &#123;server&#125;, &#123;count&#125;
                </div>
              </div>
              <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                <input
                  type="text"
                  className="form-input"
                  disabled={!isSuperAdmin}
                  value={
                    settings.welcome_message ||
                    "ยินดีต้อนรับสู่ {server}! ขอให้มีความสุขกับการพูดคุยกับพวกเรา"
                  }
                  onChange={(e) => handleChange("welcome_message", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className="settings-row">
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

            <div className="settings-row">
              <div>
                <div className="settings-row-label">ยศเริ่มต้นที่ต้องการแจก (Default Role)</div>
                <div className="settings-row-desc">
                  เลือกยศจากเซิร์ฟเวอร์ Discord สำหรับสมาชิกใหม่
                </div>
              </div>
              <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
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
      </div>

      {/* 5. Wallet & Payment Configuration */}
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
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      {isSuperAdmin && (
        <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
          <div>
            {saveSuccess && (
              <span className="badge badge-success">✓ บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
            )}
            {errorMessage && (
              <span className="badge badge-error">✕ {errorMessage}</span>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}
          </button>
        </div>
      )}
    </div>
  );
}
