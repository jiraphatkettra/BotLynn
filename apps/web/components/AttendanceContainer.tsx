"use client";

import { useState } from "react";
import VoiceStandbyWidget from "@/components/VoiceStandbyWidget";
import LeaveManager from "@/components/LeaveManager";
import { formatDate, formatTime, formatDuration } from "@/lib/utils";

interface AttendanceContainerProps {
  data: {
    attendances: any[];
    todayCount: number;
    monthCount: number;
    avgDuration: number;
    totalAdmins: number;
  };
}

export default function AttendanceContainer({ data }: AttendanceContainerProps) {
  const [activeTab, setActiveTab] = useState<"attendance" | "leave">("attendance");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          background: "rgba(255,255,255,0.03)",
          padding: "4px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.06)",
          alignSelf: "flex-start",
        }}
      >
        <button
          onClick={() => setActiveTab("attendance")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            background: activeTab === "attendance" ? "#ffffff" : "transparent",
            color: activeTab === "attendance" ? "#000000" : "#86868b",
            transition: "all 0.15s ease",
          }}
        >
          ⏱️ บันทึกการเข้างาน & ห้องเสียง
        </button>

        <button
          onClick={() => setActiveTab("leave")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            background: activeTab === "leave" ? "#ffffff" : "transparent",
            color: activeTab === "leave" ? "#000000" : "#86868b",
            transition: "all 0.15s ease",
          }}
        >
          🌴 ระบบแจ้งลางาน (Leave Requests)
        </button>
      </div>

      {activeTab === "attendance" ? (
        <>
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
                  บันทึกจากคำสั่ง /clockin และ /clockout
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
              {data.attendances.length > 0 ? (
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
                        <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attendances.map((att) => (
                        <tr key={att.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {att.user.avatar ? (
                                <img
                                  src={att.user.avatar}
                                  alt={att.user.username}
                                  style={{ width: "32px", height: "32px", borderRadius: "50%" }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    background: "rgba(255,255,255,0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    color: "#ffffff",
                                  }}
                                >
                                  {att.user.username[0].toUpperCase()}
                                </div>
                              )}
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
                              <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", background: "rgba(52,199,89,0.12)", color: "#34c759" }}>
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
                            {att.note || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#86868b" }}>
                  ยังไม่มีข้อมูลเข้างาน แอดมินสามารถใช้คำสั่ง /clockin ใน Discord เพื่อเริ่มงาน
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
