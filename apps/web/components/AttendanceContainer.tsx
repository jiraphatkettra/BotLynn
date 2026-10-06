"use client";

import { useState } from "react";
import VoiceStandbyWidget from "@/components/VoiceStandbyWidget";
import LeaveManager from "@/components/LeaveManager";
import { formatDate, formatTime, formatDuration, getDiscordAvatarUrl } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  userId: string;
  clockIn: string | Date;
  clockOut: string | Date | null;
  duration: number | null;
  status: string;
  note: string | null;
  channel: string | null;
  user: {
    id: string;
    discordId: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

interface AttendanceContainerProps {
  data: {
    attendances: AttendanceRecord[];
    todayCount: number;
    monthCount: number;
    avgDuration: number;
    totalAdmins: number;
  };
  initialActiveAttendance?: any;
  isManager?: boolean;
}

export default function AttendanceContainer({
  data,
  initialActiveAttendance,
  isManager = false,
}: AttendanceContainerProps) {
  const [activeTab, setActiveTab] = useState<"attendance" | "leave">("attendance");
  const [attendances, setAttendances] = useState<AttendanceRecord[]>(data.attendances);
  const [myActive, setMyActive] = useState<any>(initialActiveAttendance || null);
  const [actionLoading, setActionLoading] = useState(false);
  const [forcingId, setForcingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSelfClockIn = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "Web Dashboard",
          note: "ตอกบัตรเข้างานผ่าน Web Dashboard",
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMyActive(resData.data);
        setAttendances((prev) => [resData.data, ...prev]);
        showToast("ตอกบัตรเข้างานเรียบร้อยแล้ว ขอให้ทำงานอย่างราบรื่นครับ!", "success");
      } else {
        showToast(resData.error || "ไม่สามารถตอกบัตรเข้างานได้", "error");
      }
    } catch (e) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelfClockOut = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: "ตอกบัตรออกงานผ่าน Web Dashboard",
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMyActive(null);
        setAttendances((prev) =>
          prev.map((a) => (a.id === resData.data.id ? { ...a, ...resData.data } : a))
        );
        showToast("ตอกบัตรออกงานเรียบร้อยแล้ว ขอบคุณสำหรับการทำงานครับ!", "success");
      } else {
        showToast(resData.error || "ไม่สามารถตอกบัตรออกงานได้", "error");
      }
    } catch (e) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceClockOut = async (attendanceId: string, staffName: string) => {
    if (!confirm(`คุณต้องการบังคับตอกบัตรออกงานให้ "${staffName}" ใช่หรือไม่?`)) return;

    setForcingId(attendanceId);
    try {
      const res = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId,
          isForce: true,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setAttendances((prev) =>
          prev.map((a) => (a.id === attendanceId ? { ...a, ...resData.data } : a))
        );
        if (myActive?.id === attendanceId) {
          setMyActive(null);
        }
        showToast(`บังคับออกงานให้ ${staffName} สำเร็จแล้ว`, "success");
      } else {
        showToast(resData.error || "ไม่สามารถบังคับออกงานได้", "error");
      }
    } catch (e) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setForcingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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

      {/* Apple Segmented Tab Switcher */}
      <div className="apple-segmented" style={{ alignSelf: "flex-start" }}>
        <button
          type="button"
          className={`apple-segmented-item ${activeTab === "attendance" ? "active" : ""}`}
          onClick={() => setActiveTab("attendance")}
        >
          ⏱️ บันทึกการเข้างาน & ห้องเสียง
        </button>

        <button
          type="button"
          className={`apple-segmented-item ${activeTab === "leave" ? "active" : ""}`}
          onClick={() => setActiveTab("leave")}
        >
          🌴 ระบบแจ้งลางาน (Leave Requests)
        </button>
      </div>

      {activeTab === "attendance" ? (
        <>
          {/* Quick Clock In/Out Banner for Logged In User */}
          <div
            className="card"
            style={{
              padding: "18px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              background: myActive
                ? "linear-gradient(90deg, rgba(52, 199, 89, 0.08) 0%, rgba(52, 199, 89, 0.02) 100%)"
                : "rgba(255, 255, 255, 0.02)",
              border: `1px solid ${
                myActive ? "rgba(52, 199, 89, 0.3)" : "rgba(255, 255, 255, 0.08)"
              }`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: myActive ? "rgba(52, 199, 89, 0.15)" : "rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                {myActive ? "💼" : "⏱️"}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>
                    สถานะการทำงานของคุณ
                  </span>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: myActive ? "#34c759" : "#86868b",
                      boxShadow: myActive ? "0 0 8px #34c759" : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: myActive ? "#34c759" : "#86868b",
                    }}
                  >
                    {myActive ? "กำลังปฏิบัติงาน (Clocked In)" : "ยังไม่ได้เข้างาน (Clocked Out)"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#86868b", marginTop: "3px" }}>
                  {myActive
                    ? `เข้างานเมื่อ: ${formatTime(myActive.clockIn)} (${formatDate(myActive.clockIn)})`
                    : "คุณสามารถกดตอกบัตรเข้างานเพื่อบันทึกเวลาทำงานได้ทันทีจากที่นี่"}
                </div>
              </div>
            </div>

            <div>
              {myActive ? (
                <button
                  type="button"
                  onClick={handleSelfClockOut}
                  disabled={actionLoading}
                  className="btn btn-danger"
                  style={{
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  </svg>
                  {actionLoading ? "กำลังบันทึก..." : "🔴 ตอกบัตรออกงาน"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSelfClockIn}
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{
                    background: "#34c759",
                    borderColor: "#34c759",
                    color: "#000000",
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {actionLoading ? "กำลังบันทึก..." : "🟢 ตอกบัตรเข้างาน"}
                </button>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid stagger">
            <div className="stat-card" id="att-stat-today">
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
              <div className="stat-card-value">{data.todayCount}</div>
              <div className="stat-card-label">เข้างานวันนี้</div>
            </div>

            <div className="stat-card" id="att-stat-month">
              <div className="stat-card-header">
                <div className="stat-card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10" />
                    <path d="M12 20V4" />
                    <path d="M6 20v-6" />
                  </svg>
                </div>
              </div>
              <div className="stat-card-value">{data.monthCount}</div>
              <div className="stat-card-label">เข้างานเดือนนี้</div>
            </div>

            <div className="stat-card" id="att-stat-avg">
              <div className="stat-card-header">
                <div className="stat-card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <div className="stat-card-value">
                {data.avgDuration > 0 ? formatDuration(data.avgDuration) : "—"}
              </div>
              <div className="stat-card-label">เวลาเฉลี่ยต่อวัน</div>
            </div>

            <div className="stat-card" id="att-stat-rate">
              <div className="stat-card-header">
                <div className="stat-card-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </div>
              <div className="stat-card-value">
                {data.totalAdmins > 0
                  ? Math.round((data.todayCount / data.totalAdmins) * 100)
                  : 0}
                %
              </div>
              <div className="stat-card-label">อัตราเข้างานวันนี้</div>
            </div>
          </div>

          {/* Voice Channel Time Tracking Widget */}
          <VoiceStandbyWidget />

          {/* Attendance Table */}
          <div className="card" id="attendance-table-card" style={{ padding: "0px", overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                  ประวัติการเข้างาน (บันทึกเวลาเข้า-ออก)
                </h3>
                <span style={{ fontSize: "12px", color: "#86868b" }}>
                  บันทึกจากคำสั่ง Discord /clockin, /clockout และ Web Dashboard
                </span>
              </div>
              <a
                href="/api/export/attendance"
                download
                className="btn btn-secondary"
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                ส่งออก CSV (Excel)
              </a>
            </div>

            <div className="card-body" style={{ padding: "0" }}>
              {attendances.length > 0 ? (
                <div className="table-responsive">
                  <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>แอดมิน</th>
                        <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>วันที่</th>
                        <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>เวลาเข้างาน</th>
                        <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>เวลาออกงาน</th>
                        <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>ระยะเวลา</th>
                        <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>สถานะ</th>
                        <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>ช่องทาง / หมายเหตุ</th>
                        {isManager && (
                          <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "right" }}>การจัดการ</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {attendances.map((att) => (
                        <tr key={att.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={getDiscordAvatarUrl(att.user.discordId, att.user.avatar)}
                                alt={att.user.displayName || att.user.username}
                                loading="lazy"
                                decoding="async"
                                style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                                }}
                              />
                              <div>
                                <div style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff" }}>
                                  {att.user.displayName || att.user.username}
                                </div>
                                <div style={{ fontSize: "11px", color: "#86868b" }}>
                                  @{att.user.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 20px", fontSize: "13px", color: "#86868b" }}>{formatDate(att.clockIn)}</td>
                          <td style={{ padding: "12px 20px", fontSize: "13px", color: "#34c759", fontWeight: 600 }}>
                            {formatTime(att.clockIn)}
                          </td>
                          <td style={{ padding: "12px 20px", fontSize: "13px" }}>
                            {att.clockOut ? (
                              <span style={{ color: "#ff453a", fontWeight: 600 }}>
                                {formatTime(att.clockOut)}
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  background: "rgba(52,199,89,0.12)",
                                  color: "#34c759",
                                  fontWeight: 600,
                                }}
                              >
                                กำลังทำงาน
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 20px", fontSize: "13px", color: "#ffffff", fontWeight: 500 }}>
                            {att.duration ? formatDuration(att.duration) : "—"}
                          </td>
                          <td style={{ padding: "12px 20px" }}>
                            {att.clockOut ? (
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: 500,
                                  background: "rgba(255,255,255,0.05)",
                                  color: "#86868b",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                บันทึกแล้ว
                              </span>
                            ) : (
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
                                🟢 กำลังปฏิบัติงาน
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b" }}>
                            {att.note || att.channel || "—"}
                          </td>
                          {isManager && (
                            <td style={{ padding: "12px 20px", textAlign: "right" }}>
                              {!att.clockOut && (
                                <button
                                  type="button"
                                  disabled={forcingId === att.id}
                                  onClick={() =>
                                    handleForceClockOut(
                                      att.id,
                                      att.user.displayName || att.user.username
                                    )
                                  }
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    fontSize: "11px",
                                    padding: "3px 8px",
                                    borderColor: "rgba(255, 159, 10, 0.4)",
                                    color: "#ff9f0a",
                                  }}
                                  title="ปิดกะและบังคับออกงานให้แอดมินคนนี้"
                                >
                                  {forcingId === att.id ? "กำลังปิด..." : "บังคับออกงาน"}
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#86868b" }}>
                  ยังไม่มีข้อมูลเข้างาน แอดมินสามารถกดตอกบัตรเข้างานด้านบน หรือใช้คำสั่ง /clockin ใน Discord ได้ครับ
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <LeaveManager />
      )}
    </div>
  );
}
