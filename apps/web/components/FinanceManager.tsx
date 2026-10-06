"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

interface FinanceRecord {
  id: string;
  type: "INCOME" | "EXPENSE";
  title: string;
  description: string | null;
  amount: number;
  category: string;
  date: string;
  recordedById: string | null;
  recordedBy: string;
  paymentMethod: string | null;
  reference: string | null;
  attachmentUrl: string | null;
  createdAt: string;
}

interface FinanceStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  totalRecords: number;
}

const CATEGORIES: Record<string, { label: string; defaultType: "INCOME" | "EXPENSE" | "BOTH" }> = {
  SERVER: { label: "เซิร์ฟเวอร์ & VPS", defaultType: "EXPENSE" },
  BOT_API: { label: "ค่าบอท & API", defaultType: "EXPENSE" },
  SALARY: { label: "เงินเดือน & เบี้ยเลี้ยงทีมงาน", defaultType: "EXPENSE" },
  ACTIVITY: { label: "กิจกรรม & ของรางวัล", defaultType: "BOTH" },
  ADS: { label: "การตลาด & โปรโมต", defaultType: "EXPENSE" },
  ROLE_SALE: { label: "ขายยศ & บริการ", defaultType: "INCOME" },
  DONATION: { label: "โดเนทสนับสนุน", defaultType: "INCOME" },
  SPONSOR: { label: "สปอนเซอร์ห้อง/เซิร์ฟ", defaultType: "INCOME" },
  OTHER: { label: "อื่นๆ / เบ็ดเตล็ด", defaultType: "BOTH" },
};

const PAYMENT_METHODS = [
  "โอนเงินผ่านธนาคาร (Bank Transfer)",
  "พร้อมเพย์ (PromptPay)",
  "ทรูมันนี่วอลเล็ท (TrueMoney)",
  "เงินสด (Cash)",
  "เครดิต / บัตร (Card)",
  "อื่นๆ (Other)",
];

export default function FinanceManager() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [stats, setStats] = useState<FinanceStats>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlyNet: 0,
    totalRecords: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">(
    (searchParams?.get("type") as any) || "ALL"
  );
  const [timeframeFilter, setTimeframeFilter] = useState<"ALL" | "TODAY" | "THIS_MONTH" | "THIS_YEAR">(
    (searchParams?.get("timeframe") as any) || "ALL"
  );
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams?.get("category") || "ALL"
  );

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const updateUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (value === "ALL" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    type: "INCOME" as "INCOME" | "EXPENSE",
    title: "",
    description: "",
    amount: "",
    category: "ROLE_SALE",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "โอนเงินผ่านธนาคาร (Bank Transfer)",
    reference: "",
    attachmentUrl: "",
  });

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (timeframeFilter !== "ALL") params.set("timeframe", timeframeFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/finance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch finance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, [typeFilter, categoryFilter, timeframeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFinance();
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormData({
      type: "INCOME",
      title: "",
      description: "",
      amount: "",
      category: "ROLE_SALE",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "โอนเงินผ่านธนาคาร (Bank Transfer)",
      reference: "",
      attachmentUrl: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rec: FinanceRecord) => {
    setEditingRecord(rec);
    setFormData({
      type: rec.type,
      title: rec.title,
      description: rec.description || "",
      amount: rec.amount.toString(),
      category: rec.category,
      date: rec.date.split("T")[0],
      paymentMethod: rec.paymentMethod || "โอนเงินผ่านธนาคาร (Bank Transfer)",
      reference: rec.reference || "",
      attachmentUrl: rec.attachmentUrl || "",
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("กรุณากรอกชื่อรายการ", "error");
      return;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0)", "error");
      return;
    }
    if (amount > 10_000_000) {
      showToast("จำนวนเงินเกินขีดจำกัดที่อนุญาต (สูงสุด 10,000,000 บาท)", "error");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingRecord ? `/api/finance/${editingRecord.id}` : "/api/finance";
      const method = editingRecord ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        showToast(editingRecord ? "แก้ไขรายการสำเร็จ" : "บันทึกรายการสำเร็จ", "success");
        fetchFinance();
      } else {
        const err = await res.json();
        showToast(err.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (err) {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirmId(null);
        showToast("ลบรายการเรียบร้อยแล้ว", "success");
        fetchFinance();
      } else {
        showToast("ไม่สามารถลบรายการได้", "error");
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการลบรายการ", "error");
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast("ไม่มีข้อมูลที่จะส่งออก", "error");
      return;
    }

    const headers = ["วันที่", "ประเภท", "ชื่อรายการ", "จำนวนเงิน (THB)", "หมวดหมู่", "ช่องทางชำระ", "เลขอ้างอิง", "ผู้บันทึก", "รายละเอียด"];
    const rows = records.map((r) => [
      new Date(r.date).toLocaleDateString("th-TH"),
      r.type === "INCOME" ? "รายรับ" : "รายจ่าย",
      `"${r.title.replace(/"/g, '""')}"`,
      r.amount,
      CATEGORIES[r.category]?.label || r.category,
      `"${(r.paymentMethod || "").replace(/"/g, '""')}"`,
      `"${(r.reference || "").replace(/"/g, '""')}"`,
      `"${(r.recordedBy || "").replace(/"/g, '""')}"`,
      `"${(r.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `753BC_Finance_Records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="finance-manager-root">
      {/* Standardized Toast Notification */}
      {toast && (
        <div className="apple-toast-container">
          <div className={`apple-toast ${toast.type}`}>
            <span>{toast.type === "success" ? "✓" : "⚠"}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 1. Summary Bento Grid Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {/* Income Card */}
        <div className="stat-card" style={{ borderTop: "2px solid #30d158" }}>
          <div className="stat-card-header">
            <span className="stat-card-label">รายรับทั้งหมด (Income)</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(48, 209, 88, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#30d158",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#30d158" }}>
            {formatMoney(stats.totalIncome)}
          </div>
          <div className="stat-card-footer" style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.45)" }}>
            เดือนนี้: {formatMoney(stats.monthlyIncome)}
          </div>
        </div>

        {/* Expense Card */}
        <div className="stat-card" style={{ borderTop: "2px solid #ff453a" }}>
          <div className="stat-card-header">
            <span className="stat-card-label">รายจ่ายทั้งหมด (Expense)</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255, 69, 58, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ff453a",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#ff453a" }}>
            {formatMoney(stats.totalExpense)}
          </div>
          <div className="stat-card-footer" style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.45)" }}>
            เดือนนี้: {formatMoney(stats.monthlyExpense)}
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="stat-card" style={{ borderTop: `2px solid ${stats.netBalance >= 0 ? "#0a84ff" : "#ff9f0a"}` }}>
          <div className="stat-card-header">
            <span className="stat-card-label">ยอดคงเหลือสุทธิ (Net Balance)</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: stats.netBalance >= 0 ? "rgba(10, 132, 255, 0.12)" : "rgba(255, 159, 10, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: stats.netBalance >= 0 ? "#2997ff" : "#ff9f0a",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
          </div>
          <div
            className="stat-card-value"
            style={{ color: stats.netBalance >= 0 ? "#2997ff" : "#ff9f0a" }}
          >
            {formatMoney(stats.netBalance)}
          </div>
          <div className="stat-card-footer" style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.45)" }}>
            {stats.netBalance >= 0 ? "สถานะการเงิน: กำไรสะสม" : "สถานะการเงิน: ขาดทุนสะสม"}
          </div>
        </div>

        {/* This Month Net Card */}
        <div className="stat-card" style={{ borderTop: "2px solid #5e5ce6" }}>
          <div className="stat-card-header">
            <span className="stat-card-label">กำไรสุทธิเดือนนี้ (Monthly Net)</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(94, 92, 230, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#5e5ce6",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            </div>
          </div>
          <div
            className="stat-card-value"
            style={{ color: stats.monthlyNet >= 0 ? "#30d158" : "#ff453a" }}
          >
            {formatMoney(stats.monthlyNet)}
          </div>
          <div className="stat-card-footer" style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.45)" }}>
            รายการทั้งหมด: {stats.totalRecords} รายการ
          </div>
        </div>
      </div>

      {/* 2. Control Bar (Filters, Search, Buttons) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: "16px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {/* Left: Type Segmented Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div className="apple-segmented">
                <button
                  type="button"
                  className={`apple-segmented-item ${typeFilter === "ALL" ? "active" : ""}`}
                  onClick={() => {
                    setTypeFilter("ALL");
                    updateUrlParam("type", "ALL");
                  }}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  className={`apple-segmented-item ${typeFilter === "INCOME" ? "active" : ""}`}
                  onClick={() => {
                    setTypeFilter("INCOME");
                    updateUrlParam("type", "INCOME");
                  }}
                  style={{ color: typeFilter === "INCOME" ? "#000" : "#30d158" }}
                >
                  รายรับ
                </button>
                <button
                  type="button"
                  className={`apple-segmented-item ${typeFilter === "EXPENSE" ? "active" : ""}`}
                  onClick={() => {
                    setTypeFilter("EXPENSE");
                    updateUrlParam("type", "EXPENSE");
                  }}
                  style={{ color: typeFilter === "EXPENSE" ? "#000" : "#ff453a" }}
                >
                  รายจ่าย
                </button>
              </div>

              {/* Timeframe Select */}
              <select
                className="select"
                value={timeframeFilter}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setTimeframeFilter(val);
                  updateUrlParam("timeframe", val);
                }}
                style={{ height: 36, padding: "0 12px", fontSize: 12.5 }}
              >
                <option value="ALL">ช่วงเวลาทั้งหมด</option>
                <option value="TODAY">วันนี้</option>
                <option value="THIS_MONTH">เดือนนี้</option>
                <option value="THIS_YEAR">ปีนี้</option>
              </select>

              {/* Category Select */}
              <select
                className="select"
                value={categoryFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategoryFilter(val);
                  updateUrlParam("category", val);
                }}
                style={{ height: 36, padding: "0 12px", fontSize: 12.5 }}
              >
                <option value="ALL">หมวดหมู่ทั้งหมด</option>
                {Object.entries(CATEGORIES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Right: Search & Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="ค้นหาชื่อรายการ, ผู้บันทึก..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ height: 36, minWidth: 200, fontSize: 12.5 }}
                />
                <button type="submit" className="btn btn-secondary btn-sm" style={{ height: 36 }}>
                  ค้นหา
                </button>
              </form>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportCSV}
                title="ส่งออกรายงานเป็น CSV"
                style={{ height: 36, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openCreateModal}
                style={{
                  height: 36,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg, #0a84ff 0%, #0066cc 100%)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>บันทึกรายรับ-รายจ่าย</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Finance Records Table */}
      <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="card-title">รายการบันทึกรายรับ-รายจ่าย</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 10 }}>
              (พบ {records.length} รายการ)
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchFinance}
            disabled={loading}
            style={{ fontSize: 12, height: 32 }}
          >
            {loading ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
              กำลังโหลดข้อมูลการเงิน...
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: "rgba(255, 255, 255, 0.05)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 4 }}>
                ยังไม่มีรายการบันทึก
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                คลิกปุ่ม &quot;บันทึกรายรับ-รายจ่าย&quot; ด้านบนเพื่อเพิ่มรายการใหม่
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openCreateModal}
              >
                + บันทึกรายการแรก
              </button>
            </div>
          ) : (
            <div className="apple-table-wrap">
              <table className="apple-table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>ประเภท</th>
                    <th>ชื่อรายการ & รายละเอียด</th>
                    <th>หมวดหมู่</th>
                    <th>ช่องทาง / เลขอ้างอิง</th>
                    <th>ผู้บันทึก</th>
                    <th style={{ textAlign: "right" }}>จำนวนเงิน</th>
                    <th style={{ textAlign: "center", width: 90 }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const isIncome = rec.type === "INCOME";
                    const catInfo = CATEGORIES[rec.category] || { label: rec.category };

                    return (
                      <tr key={rec.id}>
                        {/* Date */}
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 500, color: "#ffffff" }}>
                            {new Date(rec.date).toLocaleDateString("th-TH", {
                              timeZone: "Asia/Bangkok",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                            {new Date(rec.createdAt).toLocaleTimeString("th-TH", {
                              timeZone: "Asia/Bangkok",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td>
                          {isIncome ? (
                            <span className="apple-pill-badge apple-pill-badge-success">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="12" y1="19" x2="12" y2="5" />
                                <polyline points="5 12 12 5 19 12" />
                              </svg>
                              รายรับ
                            </span>
                          ) : (
                            <span className="apple-pill-badge apple-pill-badge-danger">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <polyline points="19 12 12 19 5 12" />
                              </svg>
                              รายจ่าย
                            </span>
                          )}
                        </td>

                        {/* Title & Description */}
                        <td>
                          <div style={{ fontWeight: 600, color: "#ffffff" }}>
                            {rec.title}
                          </div>
                          {rec.description && (
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                              {rec.description}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td>
                          <span
                            style={{
                              fontSize: 11.5,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              color: "rgba(255, 255, 255, 0.8)",
                            }}
                          >
                            {catInfo.label}
                          </span>
                        </td>

                        {/* Payment & Ref */}
                        <td>
                          <div style={{ fontSize: 12, color: "#ffffff" }}>
                            {rec.paymentMethod || "-"}
                          </div>
                          {rec.reference && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                              Ref: {rec.reference}
                            </div>
                          )}
                        </td>

                        {/* Recorded By */}
                        <td>
                          <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.75)" }}>
                            {rec.recordedBy}
                          </div>
                        </td>

                        {/* Amount */}
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              fontFamily: "var(--font-mono, monospace)",
                              color: isIncome ? "#30d158" : "#ff453a",
                            }}
                          >
                            {isIncome ? "+" : "-"}
                            {formatMoney(rec.amount)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {/* Edit Button */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(rec)}
                              title="แก้ไขรายการ"
                              style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            {deleteConfirmId === rec.id ? (
                              <div style={{ display: "inline-flex", gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(rec.id)}
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: "2px 8px", fontSize: 11, height: 28 }}
                                >
                                  ยืนยัน
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: "2px 6px", fontSize: 11, height: 28 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setDeleteConfirmId(rec.id)}
                                title="ลบรายการ"
                                style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#ff453a" }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Modal: Add / Edit Finance Record */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal-card apple-glass-dialog" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editingRecord ? "แก้ไขรายการการเงิน" : "บันทึกรายรับ-รายจ่ายแมนนวล"}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                style={{ width: 28, height: 28, padding: 0 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Type Selection */}
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: "block" }}>
                    ประเภทรายการ *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: "INCOME", category: "ROLE_SALE" })}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: `1.5px solid ${formData.type === "INCOME" ? "#30d158" : "rgba(255, 255, 255, 0.08)"}`,
                        background: formData.type === "INCOME" ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 255, 255, 0.03)",
                        color: formData.type === "INCOME" ? "#30d158" : "rgba(255, 255, 255, 0.6)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                      รายรับ (Income)
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: "EXPENSE", category: "SERVER" })}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: `1.5px solid ${formData.type === "EXPENSE" ? "#ff453a" : "rgba(255, 255, 255, 0.08)"}`,
                        background: formData.type === "EXPENSE" ? "rgba(255, 69, 58, 0.15)" : "rgba(255, 255, 255, 0.03)",
                        color: formData.type === "EXPENSE" ? "#ff453a" : "rgba(255, 255, 255, 0.6)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                      </svg>
                      รายจ่าย (Expense)
                    </button>
                  </div>
                </div>

                {/* Title & Amount */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label required">ชื่อรายการ</label>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder={formData.type === "INCOME" ? "เช่น ขายยศ VIP, สปอนเซอร์" : "เช่น ค่าต่ออายุ VPS, เงินเดือนสตาฟ"}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label required">จำนวนเงิน (THB)</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      className="input"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      style={{ fontWeight: 600, fontFamily: "var(--font-mono, monospace)" }}
                    />
                  </div>
                </div>

                {/* Category & Date */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">หมวดหมู่</label>
                    <select
                      className="select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {Object.entries(CATEGORIES).map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">วันที่ทำรายการ</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Payment Method & Reference */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">ช่องทางการชำระ</label>
                    <select
                      className="select"
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">เลขอ้างอิง / เลขบิล (ถ้ามี)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="เช่น INV-202610, Tx0982"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description / Notes */}
                <div>
                  <label className="form-label">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="ระบุรายละเอียดเพิ่มเติม หรือที่มาของรายรับ-รายจ่ายนี้..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    background: formData.type === "INCOME" ? "#30d158" : "#ff453a",
                    color: "#ffffff",
                  }}
                >
                  {submitting ? "กำลังบันทึก..." : editingRecord ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
