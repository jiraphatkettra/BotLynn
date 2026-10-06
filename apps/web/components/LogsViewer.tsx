"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatDateTime, formatRelativeTime, getDiscordAvatarUrl } from "@/lib/utils";

interface LogItem {
  id: string;
  action: string;
  category: string;
  details: string | null;
  metadata?: any;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    discordId: string;
  } | null;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string; badgeClass: string }> = {
  ALL: { label: "ทุกหมวดหมู่", icon: "📋", badgeClass: "badge-neutral" },
  AUTH: { label: "การเข้าสู่ระบบ", icon: "🔐", badgeClass: "badge-info" },
  ATTENDANCE: { label: "ตอกบัตร", icon: "⏰", badgeClass: "badge-success" },
  SHOP: { label: "ร้านค้า", icon: "🏷️", badgeClass: "badge-purple" },
  ADMIN: { label: "แอดมิน", icon: "👤", badgeClass: "badge-neutral" },
  SYSTEM: { label: "ระบบ", icon: "⚙️", badgeClass: "badge-neutral" },
  BOT: { label: "บอท", icon: "🤖", badgeClass: "badge-warning" },
  PERMISSION: { label: "สิทธิ์", icon: "🔑", badgeClass: "badge-purple" },
  VOICE: { label: "ห้องเสียง", icon: "🎙️", badgeClass: "badge-info" },
  TICKET: { label: "ทิกเก็ต", icon: "🎫", badgeClass: "badge-info" },
  BACKUP: { label: "สำรองข้อมูล", icon: "💾", badgeClass: "badge-warning" },
  WALLET: { label: "กระเป๋าเงิน", icon: "💰", badgeClass: "badge-success" },
  ANNOUNCEMENT: { label: "ประกาศ", icon: "📢", badgeClass: "badge-purple" },
  LEAVE: { label: "ลาหยุด", icon: "🏖️", badgeClass: "badge-warning" },
  SLIP: { label: "สลิป", icon: "🧾", badgeClass: "badge-success" },
};

export default function LogsViewer() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters from URL
  const initialCategory = searchParams.get("category") || "ALL";
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (newCat && newCat !== "ALL") {
      params.set("category", newCat);
    } else {
      params.delete("category");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Debounce search - standardized to 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "25");

      if (category && category !== "ALL") {
        params.set("category", category);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (startDate) {
        params.set("startDate", startDate);
      }
      if (endDate) {
        params.set("endDate", endDate);
      }

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, category, debouncedSearch, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    handleCategoryChange("ALL");
    setSearch("");
    setDebouncedSearch("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const isFiltered = category !== "ALL" || debouncedSearch !== "" || startDate !== "" || endDate !== "";

  return (
    <div className="card" id="logs-viewer-card">
      <div className="card-header" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "8px" }}>
          <h3 className="card-title">
            <span className="card-title-icon">📝</span>
            บันทึกกิจกรรม ({total.toLocaleString()} รายการ)
          </h3>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            width: "100%",
            background: "rgba(255, 255, 255, 0.02)",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          {/* Category Dropdown */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#86868b", marginBottom: "6px" }}>
              หมวดหมู่กิจกรรม
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
              }}
            >
              {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                <option key={key} value={key} style={{ background: "#1c1c1e", color: "#ffffff" }}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#86868b", marginBottom: "6px" }}>
              ค้นหาชื่อ หรือ รายละเอียด
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="พิมพ์เพื่อค้นหา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#86868b"
                strokeWidth="2"
                style={{ position: "absolute", left: "10px", top: "11px" }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#86868b", marginBottom: "6px" }}>
              ตั้งแต่วันที่
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#86868b", marginBottom: "6px" }}>
              ถึงวันที่
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#86868b" }}>
            <div style={{ fontSize: "14px", marginBottom: "8px" }}>กำลังโหลดข้อมูลบันทึกกิจกรรม...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">ไม่พบบันทึกกิจกรรม</p>
            <p className="empty-state-text">
              {isFiltered ? "ลองปรับหรือล้างตัวกรองเพื่อค้นหาข้อมูลใหม่อีกครั้ง" : "กิจกรรมจะถูกบันทึกอัตโนมัติเมื่อมีการใช้งาน"}
            </p>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center" }}>#</th>
                  <th style={{ width: "160px" }}>เวลา</th>
                  <th style={{ width: "220px" }}>ผู้ใช้</th>
                  <th style={{ width: "140px" }}>ประเภท</th>
                  <th style={{ width: "160px" }}>การกระทำ</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const catConfig = CATEGORY_MAP[log.category] || {
                    label: log.category,
                    icon: "📋",
                    badgeClass: "badge-neutral",
                  };
                  const rowNum = (page - 1) * 25 + idx + 1;

                  return (
                    <tr key={log.id}>
                      <td style={{ textAlign: "center", color: "#86868b", fontSize: "12px" }}>
                        {rowNum}
                      </td>
                      <td>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff" }}>
                            {formatRelativeTime(log.createdAt)}
                          </div>
                          <div className="text-muted" style={{ fontSize: "11px" }}>
                            {formatDateTime(log.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td>
                        {log.user ? (
                          <div className="table-user">
                            <div className="table-avatar">
                              <img
                                src={getDiscordAvatarUrl(log.user.discordId, log.user.avatar)}
                                alt={log.user.displayName || log.user.username}
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                            <div>
                              <div className="table-user-name">
                                {log.user.displayName || log.user.username}
                              </div>
                              <div className="table-user-sub">@{log.user.username}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: "12px" }}>
                            ⚙️ ระบบ (System)
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${catConfig.badgeClass}`}>
                          {catConfig.icon} {catConfig.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#ffffff", fontSize: "13px" }}>
                        {log.action}
                      </td>
                      <td className="text-muted text-sm" style={{ wordBreak: "break-word" }}>
                        {log.details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              background: "rgba(255, 255, 255, 0.01)",
            }}
          >
            <div style={{ fontSize: "13px", color: "#86868b" }}>
              แสดงหน้า <span style={{ color: "#ffffff", fontWeight: 600 }}>{page}</span> จากทั้งหมด{" "}
              <span style={{ color: "#ffffff", fontWeight: 600 }}>{totalPages}</span> หน้า (รวม {total.toLocaleString()} รายการ)
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1 || loading}
                className="btn btn-secondary"
                style={{ padding: "6px 10px", fontSize: "12px", opacity: page === 1 ? 0.4 : 1 }}
              >
                « หน้าแรก
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "12px", opacity: page === 1 ? 0.4 : 1 }}
              >
                ‹ ก่อนหน้า
              </button>
              <span style={{ fontSize: "12px", color: "#ffffff", padding: "0 6px" }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "12px", opacity: page === totalPages ? 0.4 : 1 }}
              >
                ถัดไป ›
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages || loading}
                className="btn btn-secondary"
                style={{ padding: "6px 10px", fontSize: "12px", opacity: page === totalPages ? 0.4 : 1 }}
              >
                หน้าสุดท้าย »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
