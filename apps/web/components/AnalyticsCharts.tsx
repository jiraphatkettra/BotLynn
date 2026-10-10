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
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  // Track Theme Changes for Canvas Repainting
  useEffect(() => {
    const updateTheme = () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      setThemeMode(isLight ? "light" : "dark");
    };
    updateTheme();
    window.addEventListener("theme-changed", updateTheme);

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    return () => {
      window.removeEventListener("theme-changed", updateTheme);
      observer.disconnect();
    };
  }, []);

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

    const isLight = themeMode === "light";
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
    ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.10)" : "rgba(255, 255, 255, 0.10)";
    ctx.lineWidth = 1;
    ctx.fillStyle = isLight ? "#334155" : "#cbd5e1";
    ctx.font = "500 11px Prompt, -apple-system, sans-serif";

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (chartHeight / gridSteps) * i;
      const value = Math.round(maxVal - (maxVal / gridSteps) * i);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.fillText(`฿${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}`, padding.left - 8, y + 4);
    }

    // Coordinates calculation
    const coords: { x: number; y: number; data: DailySalesData }[] = points.map((p, i) => {
      const x = padding.left + (chartWidth / (points.length - 1)) * i;
      const y = padding.top + chartHeight - (p.amount / maxVal) * chartHeight;
      return { x, y, data: p };
    });

    // Draw gradient area fill
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    if (isLight) {
      areaGradient.addColorStop(0, "rgba(0, 113, 227, 0.22)");
      areaGradient.addColorStop(1, "rgba(0, 113, 227, 0.0)");
    } else {
      areaGradient.addColorStop(0, "rgba(41, 151, 255, 0.32)");
      areaGradient.addColorStop(1, "rgba(41, 151, 255, 0.0)");
    }

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
    ctx.strokeStyle = isLight ? "#0071e3" : "#2997ff";
    ctx.lineWidth = 2.8;
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

    // Draw x-axis labels
    ctx.fillStyle = isLight ? "#334155" : "#cbd5e1";
    ctx.font = "500 11px Prompt, -apple-system, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < coords.length; i += 5) {
      ctx.fillText(coords[i].data.label, coords[i].x, height - 12);
    }
    ctx.fillText(coords[coords.length - 1].data.label, coords[coords.length - 1].x, height - 12);
  }, [data, themeMode]);

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

    const isLight = themeMode === "light";
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
    ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.10)" : "rgba(255, 255, 255, 0.10)";
    ctx.lineWidth = 1;
    ctx.fillStyle = isLight ? "#334155" : "#cbd5e1";
    ctx.font = "500 11px Prompt, -apple-system, sans-serif";

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (chartHeight / steps) * i;
      const value = Math.round(maxVal - (maxVal / steps) * i);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.fillText(`${value}h`, padding.left - 6, y + 4);
    }

    // Bar width and spacing
    const barWidth = Math.min(32, chartWidth / bars.length - 12);
    const stepX = chartWidth / bars.length;

    bars.forEach((b, i) => {
      const barX = padding.left + stepX * i + (stepX - barWidth) / 2;
      const barHeight = Math.max(4, (b.hours / maxVal) * chartHeight);
      const barY = padding.top + chartHeight - barHeight;

      // Slot background
      ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.05)" : "rgba(255, 255, 255, 0.04)";
      ctx.beginPath();
      ctx.roundRect(barX, padding.top, barWidth, chartHeight, [6, 6, 0, 0]);
      ctx.fill();

      // Active bar gradient
      const barGrad = ctx.createLinearGradient(0, barY, 0, barY + barHeight);
      barGrad.addColorStop(0, "#16a34a");
      barGrad.addColorStop(1, isLight ? "rgba(22, 163, 74, 0.70)" : "rgba(48, 209, 88, 0.5)");

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, [6, 6, 2, 2]);
      ctx.fill();

      // Day label
      ctx.fillStyle = isLight ? "#334155" : "#cbd5e1";
      ctx.font = "600 11.5px Prompt, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.shortDay, barX + barWidth / 2, height - 12);
    });
  }, [data, themeMode]);

  // Handle Bar Mouse Move
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
      const b = bars[index];
      setBarTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        day: b.dayName,
        hours: b.hours,
        sessions: b.sessionsCount,
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

    const isLight = themeMode === "light";
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
    const outerRadius = Math.min(centerX, centerY) - 8;
    const innerRadius = outerRadius * 0.68;

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
      ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";
      ctx.fill();

      ctx.fillStyle = isLight ? "rgba(28, 28, 30, 0.45)" : "rgba(255, 255, 255, 0.4)";
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
        ctx.fill();
      }

      startAngle = endAngle;
    });

    // Center total display
    ctx.fillStyle = isLight ? "#0a0f1d" : "#ffffff";
    ctx.font = "bold 24px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${total}`, centerX, centerY + 2);

    ctx.fillStyle = isLight ? "#475569" : "rgba(255, 255, 255, 0.65)";
    ctx.font = "500 11px Prompt, sans-serif";
    ctx.fillText("ทิกเก็ตทั้งหมด", centerX, centerY + 18);
  }, [data, themeMode]);

  return (
    <section className="ios-analytics-container">
      {/* Section Header */}
      <div className="ios-analytics-header">
        <div>
          <div className="ios-analytics-eyebrow">
            ANALYTICS OVERVIEW
          </div>
          <h2 className="ios-analytics-title">
            สถิติภาพรวม & แนวโน้มระบบ
          </h2>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          className="ios-glass-btn"
          aria-label="อัปเดตข้อมูลสถิติ"
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
      <div className="ios-analytics-bento-grid">
        {/* ======================================================== */}
        {/* 1. LINE CHART: ยอดขายยศ 30 วัน                           */}
        {/* ======================================================== */}
        <div className="ios-glass-card line-chart-card">
          <div className="ios-chart-top-bar">
            <div>
              <div className="ios-chart-title-group">
                <div className="ios-chart-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <h3 className="ios-chart-title">
                  ยอดขายยศร้านค้า 30 วันย้อนหลัง
                </h3>
              </div>
              <p className="ios-chart-desc">
                กราฟเส้นแสดงแนวโน้มรายรับจากการซื้อยศและแพ็กเกจประจำวัน
              </p>
            </div>

            <div className="ios-chart-stat-right">
              <div className="ios-chart-stat-val">
                ฿{data ? formatCurrency(data.sales30Days.totalRevenue) : "0"}
              </div>
              <div className="ios-chart-stat-sub">
                {data ? `${data.sales30Days.totalCount} คำสั่งซื้อเสร็จสิ้น` : "0 คำสั่งซื้อ"}
              </div>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="ios-canvas-wrap">
            <canvas
              ref={lineCanvasRef}
              onMouseMove={handleLineMouseMove}
              onMouseLeave={handleLineMouseLeave}
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Interactive Tooltip */}
            {lineTooltip.visible && (
              <div
                className="ios-glass-tooltip"
                style={{
                  left: `${lineTooltip.x}px`,
                  top: `${Math.max(10, lineTooltip.y - 65)}px`,
                }}
              >
                <div className="ios-tooltip-date">{lineTooltip.title}</div>
                <div className="ios-tooltip-val">
                  ฿{formatCurrency(lineTooltip.amount)}
                </div>
                <div className="ios-tooltip-sub">
                  {lineTooltip.count} รายการ
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. BAR CHART: ชั่วโมงทำงานทีมงานรายสัปดาห์ (7 Days)        */}
        {/* ======================================================== */}
        <div className="ios-glass-card">
          <div className="ios-chart-top-bar">
            <div>
              <div className="ios-chart-title-group">
                <div className="ios-chart-icon-box success">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="ios-chart-title">
                  ชั่วโมงทำงานทีมงาน (7 วัน)
                </h3>
              </div>
              <p className="ios-chart-desc">
                รวมเวลากะเข้างานของแอดมินทุกคน
              </p>
            </div>

            <div className="ios-chart-stat-right">
              <div className="ios-chart-stat-val success">
                {data ? `${data.weeklyWorkHours.totalHours} ชม.` : "0 ชม."}
              </div>
              <div className="ios-chart-stat-sub">
                เฉลี่ย {data?.weeklyWorkHours.avgDailyHours || 0} ชม./วัน
              </div>
            </div>
          </div>

          {/* Bar Canvas */}
          <div className="ios-canvas-wrap small">
            <canvas
              ref={barCanvasRef}
              onMouseMove={handleBarMouseMove}
              onMouseLeave={handleBarMouseLeave}
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Bar Tooltip */}
            {barTooltip.visible && (
              <div
                className="ios-glass-tooltip"
                style={{
                  left: `${barTooltip.x}px`,
                  top: `${Math.max(10, barTooltip.y - 60)}px`,
                }}
              >
                <div className="ios-tooltip-date">{barTooltip.day}</div>
                <div className="ios-tooltip-val success">
                  {barTooltip.hours} ชั่วโมง
                </div>
                <div className="ios-tooltip-sub">
                  {barTooltip.sessions} กะการทำงาน
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. DONUT CHART: สัดส่วนสถานะทิกเก็ต                         */}
        {/* ======================================================== */}
        <div className="ios-glass-card">
          <div className="ios-chart-top-bar" style={{ marginBottom: "14px" }}>
            <div>
              <div className="ios-chart-title-group">
                <div className="ios-chart-icon-box info">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3 className="ios-chart-title">
                  สัดส่วนสถานะทิกเก็ต
                </h3>
              </div>
              <p className="ios-chart-desc">
                ประสิทธิภาพการตอบกลับและปิดเคสช่วยเหลือ
              </p>
            </div>
          </div>

          <div className="ios-donut-content-split">
            {/* Donut Canvas */}
            <div className="ios-donut-wrap">
              <canvas ref={donutCanvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
            </div>

            {/* Legend & Stats */}
            <div className="ios-donut-legend">
              {data?.ticketDistribution.items.map((item) => (
                <div key={item.status} className="ios-legend-item">
                  <div className="ios-legend-item-left">
                    <span
                      className="ios-legend-dot"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: `0 0 8px ${item.color}`,
                      }}
                    />
                    <span className="ios-legend-label">
                      {item.status === "OPEN"
                        ? "รอรับเคส"
                        : item.status === "CLAIMED"
                        ? "กำลังดูแล"
                        : "ปิดสำเร็จ"}
                    </span>
                  </div>
                  <div className="ios-legend-item-right">
                    <span className="ios-legend-count">{item.count}</span>
                    <span className="ios-legend-pct">({item.percentage}%)</span>
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
