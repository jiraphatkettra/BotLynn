"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface StaffSummaryItem {
  id: string;
  discordId: string;
  name: string;
  role: string;
  shiftsCount: number;
  totalHours: number;
  ticketsHandled: number;
  leaveDays: number;
}

interface MonthlyReport {
  period: string;
  totalRevenue: number;
  transactionsCount: number;
  closedTicketsCount: number;
  approvedLeavesCount: number;
  staffSummary: StaffSummaryItem[];
}

export default function ReportGenerator() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?month=${selectedMonth}`);
      if (res.ok) {
        const json = await res.json();
        setReport(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth]);

  const handleExportCSV = () => {
    if (!report) return;

    const headers = ["ลำดับ", "ชื่อทีมงาน", "ตำแหน่ง", "กะเข้างาน (ครั้ง)", "ชั่วโมงทำงานรวม", "ทิกเก็ตที่ดูแล", "วันลาสะสม (วัน)"];
    const rows = report.staffSummary.map((s, idx) => [
      idx + 1,
      `"${s.name}"`,
      s.role,
      s.shiftsCount,
      s.totalHours,
      s.ticketsHandled,
      s.leaveDays,
    ]);

    const csvContent =
      "\uFEFF" + // UTF-8 BOM for Thai support in Excel
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lynnbot_monthly_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Month Selector & Export Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            เลือกเดือนที่ต้องการสรุป:
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              fontSize: "13px",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!report || loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              background: "rgba(48, 209, 88, 0.15)",
              border: "1px solid rgba(48, 209, 88, 0.3)",
              color: "#30d158",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📥 ส่งออก CSV (Excel)
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            🖨️ พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {report && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          {/* Card 1: Revenue */}
          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              ยอดขายยศรวมประจำเดือน
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#2997ff" }}>
              ฿{formatCurrency(report.totalRevenue)}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              {report.transactionsCount} รายการสั่งซื้อ
            </div>
          </div>

          {/* Card 2: Closed Tickets */}
          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              ทิกเก็ตที่ปิดสำเร็จ
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#30d158" }}>
              {report.closedTicketsCount} เคส
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              ช่วยเหลือสมาชิกเรียบร้อย
            </div>
          </div>

          {/* Card 3: Approved Leaves */}
          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              ใบลาที่อนุมัติแล้ว
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#ff9f0a" }}>
              {report.approvedLeavesCount} ครั้ง
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              บันทึกในระบบเรียบร้อย
            </div>
          </div>
        </div>
      )}

      {/* Staff Breakdown Table */}
      {report && (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "14px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            สรุปผลการปฏิบัติงานรายบุคคล ประจำงวด {report.period}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "650px" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "var(--text-secondary)" }}>
                  ชื่อทีมงาน
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "var(--text-secondary)" }}>
                  ตำแหน่ง
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
                  เข้างาน (ครั้ง)
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
                  ชั่วโมงรวม
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
                  ทิกเก็ตที่ดูแล
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
                  วันลาสะสม
                </th>
              </tr>
            </thead>
            <tbody>
              {report.staffSummary.map((staff) => (
                <tr
                  key={staff.id}
                  style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                >
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                    {staff.name}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    {staff.role}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#ffffff" }}>
                    {staff.shiftsCount}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", fontWeight: 700, color: "#2997ff" }}>
                    {staff.totalHours} ชม.
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#30d158" }}>
                    {staff.ticketsHandled}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: staff.leaveDays > 0 ? "#ff9f0a" : "var(--text-muted)" }}>
                    {staff.leaveDays} วัน
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
