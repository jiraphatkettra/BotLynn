"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface DailySalesData {
  date: string;
  label: string;
  amount: number;
  count: number;
}

interface DailyWorkHoursData {
  dayName: string;
  shortDay: string;
  date: string;
  hours: number;
  sessionsCount: number;
}

interface TicketDistributionData {
  status: "OPEN" | "CLAIMED" | "CLOSED";
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface AnalyticsData {
  sales30Days: {
    totalRevenue: number;
    totalCount: number;
    dailyData: DailySalesData[];
  };
  weeklyWorkHours: {
    totalHours: number;
    avgDailyHours: number;
    dailyData: DailyWorkHoursData[];
  };
  ticketDistribution: {
    totalTickets: number;
    items: TicketDistributionData[];
  };
}

export default function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Line Chart Tooltip State
  const [lineTooltip, setLineTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    title: string;
    amount: number;
    count: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    title: "",
    amount: 0,
    count: 0,
  });

  // Bar Chart Tooltip State
  const [barTooltip, setBarTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    day: string;
    hours: number;
    sessions: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    day: "",
    hours: 0,
    sessions: 0,
  });

  const lineCanvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const donutCanvasRef = useRef<HTMLCanvasElement>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Cannot fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ==========================================
  // Render Line Chart (Canvas)
  // ==========================================
  useEffect(() => {
    if (!data || !lineCanvasRef.current) return;
    const canvas = lineCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const points = data.sales30Days.dailyData;
    if (points.length < 2) return;

    const padding = { top: 20, right: 20, bottom: 35, left: 45 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(...points.map((p) => p.amount), 100);

    // Draw horizontal grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "10px JetBrains Mono, monospace";

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (chartHeight / gridSteps) * i;
      const value = Math.round(maxVal - (maxVal / gridSteps) * i);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.fillText(`฿${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}`, padding.left - 8, y + 3);
    }

    // Coordinates calculation
    const coords: { x: number; y: number; data: DailySalesData }[] = points.map((p, i) => {
      const x = padding.left + (chartWidth / (points.length - 1)) * i;
      const y = padding.top + chartHeight - (p.amount / maxVal) * chartHeight;
      return { x, y, data: p };
    });

    // Draw gradient area fill
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    areaGradient.addColorStop(0, "rgba(41, 151, 255, 0.35)");
    areaGradient.addColorStop(1, "rgba(41, 151, 255, 0.0)");

    ctx.beginPath();
    ctx.moveTo(coords[0].x, height - padding.bottom);
    for (let i = 0; i < coords.length; i++) {
      if (i === 0) {
        ctx.lineTo(coords[i].x, coords[i].y);
      } else {
        const xc = (coords[i].x + coords[i - 1].x) / 2;
        const yc = (coords[i].y + coords[i - 1].y) / 2;
        ctx.quadraticCurveTo(coords[i - 1].x, coords[i - 1].y, xc, yc);
      }
    }
    const last = coords[coords.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.lineTo(last.x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Draw Line
    ctx.beginPath();
    ctx.strokeStyle = "#2997ff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      const xc = (coords[i].x + coords[i - 1].x) / 2;
      const yc = (coords[i].y + coords[i - 1].y) / 2;
      ctx.quadraticCurveTo(coords[i - 1].x, coords[i - 1].y, xc, yc);
    }
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    // Draw x-axis labels (every 5th day)
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "center";
    for (let i = 0; i < coords.length; i += 5) {
      ctx.fillText(coords[i].data.label, coords[i].x, height - 12);
    }
    // Also last day
    ctx.fillText(coords[coords.length - 1].data.label, coords[coords.length - 1].x, height - 12);
  }, [data]);

  // Handle Line Canvas Mouse Hover
  const handleLineMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !lineCanvasRef.current) return;
    const canvas = lineCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const points = data.sales30Days.dailyData;
    const padding = { top: 20, right: 20, bottom: 35, left: 45 };
    const chartWidth = rect.width - padding.left - padding.right;

    if (mouseX < padding.left || mouseX > rect.width - padding.right) {
      setLineTooltip((prev) => ({ ...prev, visible: false }));
      return;
    }

    const index = Math.round(((mouseX - padding.left) / chartWidth) * (points.length - 1));
    const point = points[Math.max(0, Math.min(points.length - 1, index))];

    if (point) {
      setLineTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        title: point.label,
        amount: point.amount,
        count: point.count,
      });
    }
  };

  const handleLineMouseLeave = () => {
    setLineTooltip((prev) => ({ ...prev, visible: false }));
  };

  // ==========================================
  // Render Bar Chart (Canvas)
  // ==========================================
  useEffect(() => {
    if (!data || !barCanvasRef.current) return;
    const canvas = barCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const bars = data.weeklyWorkHours.dailyData;
    const padding = { top: 20, right: 15, bottom: 35, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(...bars.map((b) => b.hours), 8);

    // Draw horizontal grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "10px JetBrains Mono, monospace";

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (chartHeight / steps) * i;
      const value = Math.round(maxVal - (maxVal / steps) * i);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.fillText(`${value}h`, padding.left - 6, y + 3);
    }

    // Bar width and spacing
    const barWidth = Math.min(32, chartWidth / bars.length - 12);
    const stepX = chartWidth / bars.length;

    bars.forEach((bar, i) => {
      const x = padding.left + stepX * i + (stepX - barWidth) / 2;
      const barH = (bar.hours / maxVal) * chartHeight;
      const y = padding.top + chartHeight - barH;

      // Draw Bar Gradient
      const gradient = ctx.createLinearGradient(0, y, 0, padding.top + chartHeight);
      gradient.addColorStop(0, "#30d158");
      gradient.addColorStop(1, "rgba(48, 209, 88, 0.2)");

      ctx.fillStyle = gradient;

      // Rounded Top Bar
      const radius = 6;
      ctx.beginPath();
      if (barH > radius) {
        ctx.moveTo(x, padding.top + chartHeight);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, padding.top + chartHeight);
      } else if (barH > 0) {
        ctx.rect(x, y, barWidth, barH);
      }
      ctx.closePath();
      ctx.fill();

      // Label below bar
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.textAlign = "center";
      ctx.font = "11px Prompt, sans-serif";
      ctx.fillText(bar.shortDay, x + barWidth / 2, height - 14);
    });
  }, [data]);

  // Handle Bar Canvas Hover
  const handleBarMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !barCanvasRef.current) return;
    const canvas = barCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const bars = data.weeklyWorkHours.dailyData;
    const padding = { top: 20, right: 15, bottom: 35, left: 40 };
    const chartWidth = rect.width - padding.left - padding.right;
    const stepX = chartWidth / bars.length;

    const index = Math.floor((mouseX - padding.left) / stepX);
    if (index >= 0 && index < bars.length) {
      const bar = bars[index];
      setBarTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        day: `${bar.dayName} (${bar.date})`,
        hours: bar.hours,
        sessions: bar.sessionsCount,
      });
    } else {
      setBarTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleBarMouseLeave = () => {
    setBarTooltip((prev) => ({ ...prev, visible: false }));
  };

  // ==========================================
  // Render Donut Chart (Canvas)
  // ==========================================
  useEffect(() => {
    if (!data || !donutCanvasRef.current) return;
    const canvas = donutCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const items = data.ticketDistribution.items;
    const total = data.ticketDistribution.totalTickets;

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 14;
    const innerRadius = outerRadius * 0.68;

    if (total === 0) {
      // Empty state donut ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "12px Prompt, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ไม่มีข้อมูล", centerX, centerY + 4);
      return;
    }

    let startAngle = -Math.PI / 2;

    items.forEach((item) => {
      const sliceAngle = (item.count / total) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;

      if (sliceAngle > 0.01) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();

        ctx.fillStyle = item.color;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      startAngle = endAngle;
    });

    // Center total display
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${total}`, centerX, centerY + 2);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "11px Prompt, sans-serif";
    ctx.fillText("ทิกเก็ตทั้งหมด", centerX, centerY + 18);
  }, [data]);

  return (
    <section className="dashboard-analytics-section" style={{ width: "100%", maxWidth: "1080px", margin: "32px auto 0" }}>
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#2997ff",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            ANALYTICS OVERVIEW
          </div>
          <h2
            style={{
              fontSize: "clamp(20px, 2.5vw, 26px)",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            สถิติภาพรวม & แนวโน้มระบบ
          </h2>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "9999px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>{loading ? "กำลังโหลด..." : "อัปเดตข้อมูล"}</span>
        </button>
      </div>

      {/* Grid Bento Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {/* ======================================================== */}
        {/* 1. LINE CHART: ยอดขายยศ 30 วัน (2-columns on large screens) */}
        {/* ======================================================== */}
        <div
          style={{
            gridColumn: "1 / -1",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "24px",
            position: "relative",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "16px" }}>📈</span>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                  ยอดขายยศร้านค้า 30 วันย้อนหลัง
                </h3>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
                กราฟเส้นแสดงแนวโน้มรายรับจากการซื้อยศและแพ็กเกจประจำวัน
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#2997ff" }}>
                ฿{data ? formatCurrency(data.sales30Days.totalRevenue) : "0"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {data ? `${data.sales30Days.totalCount} คำสั่งซื้อเสร็จสิ้น` : "0 คำสั่งซื้อ"}
              </div>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div style={{ position: "relative", width: "100%", height: "220px" }}>
            <canvas
              ref={lineCanvasRef}
              onMouseMove={handleLineMouseMove}
              onMouseLeave={handleLineMouseLeave}
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Interactive Tooltip */}
            {lineTooltip.visible && (
              <div
                style={{
                  position: "absolute",
                  left: `${lineTooltip.x}px`,
                  top: `${Math.max(10, lineTooltip.y - 65)}px`,
                  transform: "translateX(-50%)",
                  background: "rgba(10, 10, 14, 0.95)",
                  border: "1px solid rgba(41, 151, 255, 0.4)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7)",
                  borderRadius: "10px",
                  padding: "6px 12px",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  zIndex: 20,
                  fontSize: "12px",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: "10.5px" }}>{lineTooltip.title}</div>
                <div style={{ color: "#2997ff", fontWeight: 700, fontSize: "13px" }}>
                  ฿{formatCurrency(lineTooltip.amount)}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                  {lineTooltip.count} รายการ
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. BAR CHART: ชั่วโมงทำงานทีมงานรายสัปดาห์ (7 Days)        */}
        {/* ======================================================== */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "24px",
            position: "relative",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "16px" }}>⏱️</span>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                  ชั่วโมงทำงานทีมงาน (7 วัน)
                </h3>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
                รวมเวลากะเข้างานของแอดมินทุกคน
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#30d158" }}>
                {data ? `${data.weeklyWorkHours.totalHours} ชม.` : "0 ชม."}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                เฉลี่ย {data?.weeklyWorkHours.avgDailyHours || 0} ชม./วัน
              </div>
            </div>
          </div>

          {/* Bar Canvas */}
          <div style={{ position: "relative", width: "100%", height: "200px" }}>
            <canvas
              ref={barCanvasRef}
              onMouseMove={handleBarMouseMove}
              onMouseLeave={handleBarMouseLeave}
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Bar Tooltip */}
            {barTooltip.visible && (
              <div
                style={{
                  position: "absolute",
                  left: `${barTooltip.x}px`,
                  top: `${Math.max(10, barTooltip.y - 60)}px`,
                  transform: "translateX(-50%)",
                  background: "rgba(10, 10, 14, 0.95)",
                  border: "1px solid rgba(48, 209, 88, 0.4)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7)",
                  borderRadius: "10px",
                  padding: "6px 12px",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  zIndex: 20,
                  fontSize: "12px",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: "10.5px" }}>{barTooltip.day}</div>
                <div style={{ color: "#30d158", fontWeight: 700, fontSize: "13px" }}>
                  {barTooltip.hours} ชั่วโมง
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                  {barTooltip.sessions} กะการทำงาน
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. DONUT CHART: สัดส่วนสถานะทิกเก็ต (Open/Claimed/Closed) */}
        {/* ======================================================== */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "24px",
            position: "relative",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "16px" }}>🎫</span>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                สัดส่วนสถานะทิกเก็ต
              </h3>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
              ประสิทธิภาพการตอบกลับและปิดเคสช่วยเหลือ
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flex: 1,
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            {/* Donut Canvas */}
            <div style={{ width: "160px", height: "160px", margin: "0 auto", position: "relative" }}>
              <canvas ref={donutCanvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
            </div>

            {/* Legend & Stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, minWidth: "140px" }}>
              {data?.ticketDistribution.items.map((item) => (
                <div
                  key={item.status}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: item.color,
                        boxShadow: `0 0 8px ${item.color}`,
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                      {item.status === "OPEN"
                        ? "รอรับเคส"
                        : item.status === "CLAIMED"
                        ? "กำลังดูแล"
                        : "ปิดสำเร็จ"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff" }}>
                      {item.count}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
