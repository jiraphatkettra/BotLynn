"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  type: "slip" | "ticket" | "leave";
  title: string;
  description: string;
  timestamp: string;
  link: string;
  priority: "high" | "medium" | "low";
  iconType: "slip" | "ticket" | "leave";
  badgeText?: string;
}

interface NotificationResponse {
  totalCount: number;
  counts: {
    pendingSlips: number;
    openTickets: number;
    pendingLeaves: number;
  };
  notifications: NotificationItem[];
  lastUpdated?: string;
}

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "slip" | "ticket" | "leave">("all");
  const [data, setData] = useState<NotificationResponse>({
    totalCount: 0,
    counts: { pendingSlips: 0, openTickets: 0, pendingLeaves: 0 },
    notifications: [],
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setIsRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json: NotificationResponse = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 30000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filteredNotifications = data.notifications.filter((item) => {
    if (activeTab === "all") return true;
    return item.type === activeTab;
  });

  const handleItemClick = (link: string) => {
    setIsOpen(false);
    router.push(link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "slip":
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        );
      case "ticket":
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        );
      case "leave":
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <line x1="10" x2="14" y1="14" y2="18" />
            <line x1="14" x2="10" y1="14" y2="18" />
          </svg>
        );
      default:
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="2.2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
    }
  };

  return (
    <div className="apple-notification-wrapper" ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        type="button"
        className={`apple-nav-icon-btn ${isOpen ? "active" : ""}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(false);
        }}
        aria-label="การแจ้งเตือน"
        title="การแจ้งเตือนระบบ"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: isOpen ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)",
          border: "1px solid",
          borderColor: isOpen ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.09)",
          color: isOpen ? "#ffffff" : "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <svg
          className={`notification-bell ${isRefreshing ? "refreshing" : ""}`}
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge counter */}
        {data.totalCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              borderRadius: "9999px",
              background: "#ff9f0a",
              color: "#000000",
              fontSize: "11px",
              fontWeight: 700,
              lineHeight: "18px",
              textAlign: "center",
              boxShadow: "0 0 10px rgba(255, 159, 10, 0.6)",
              pointerEvents: "none",
            }}
          >
            {data.totalCount > 99 ? "99+" : data.totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="apple-notification-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "360px",
            maxWidth: "calc(100vw - 32px)",
            background: "rgba(18, 18, 22, 0.94)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.08)",
            zIndex: 1000,
            overflow: "hidden",
            animation: "appleDropdownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                การแจ้งเตือน
              </span>
              {data.totalCount > 0 && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: "rgba(255, 159, 10, 0.15)",
                    color: "#ff9f0a",
                    border: "1px solid rgba(255, 159, 10, 0.3)",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {data.totalCount} รายการค้าง
                </span>
              )}
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => fetchNotifications(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "6px",
                transition: "color 0.15s ease",
              }}
              title="รีเฟรชข้อมูล"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                style={{
                  animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              padding: "8px 12px",
              background: "rgba(255, 255, 255, 0.02)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              overflowX: "auto",
            }}
          >
            {[
              { id: "all", label: "ทั้งหมด", count: data.totalCount },
              { id: "slip", label: "สลิป", count: data.counts.pendingSlips },
              { id: "ticket", label: "ทิกเก็ต", count: data.counts.openTickets },
              { id: "leave", label: "ลางาน", count: data.counts.pendingLeaves },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === tab.id ? "rgba(255, 255, 255, 0.12)" : "transparent",
                  color: activeTab === tab.id ? "#ffffff" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      opacity: 0.8,
                      background: activeTab === tab.id ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      padding: "1px 5px",
                      borderRadius: "10px",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div
            style={{
              maxHeight: "360px",
              overflowY: "auto",
              padding: "6px",
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "rgba(48, 209, 88, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "10px",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" }}>
                  ไม่มีรายการค้างในขณะนี้
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                  ระบบอัปเดตสถานะแบบเรียลไทม์
                </div>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.link)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Type Icon Badge */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background:
                        item.type === "slip"
                          ? "rgba(255, 159, 10, 0.12)"
                          : item.type === "ticket"
                          ? "rgba(41, 151, 255, 0.12)"
                          : "rgba(48, 209, 88, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    {getIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "6px",
                        marginBottom: "3px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#ffffff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.title}
                      </span>
                      {item.badgeText && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background:
                              item.type === "slip"
                                ? "rgba(255, 159, 10, 0.18)"
                                : item.type === "ticket"
                                ? "rgba(41, 151, 255, 0.18)"
                                : "rgba(48, 209, 88, 0.18)",
                            color:
                              item.type === "slip"
                                ? "#ff9f0a"
                                : item.type === "ticket"
                                ? "#2997ff"
                                : "#30d158",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginBottom: "4px",
                      }}
                    >
                      {item.description}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {formatRelativeTime(item.timestamp)}
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      color: "rgba(255, 255, 255, 0.3)",
                      alignSelf: "center",
                      flexShrink: 0,
                    }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              ))
            )}
          </div>

          {/* Footer Quick Links */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1px",
              background: "rgba(255, 255, 255, 0.06)",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Link
              href="/slips"
              onClick={() => setIsOpen(false)}
              style={{
                padding: "10px 4px",
                textAlign: "center",
                fontSize: "11.5px",
                fontWeight: 500,
                color: "#ff9f0a",
                background: "rgba(18, 18, 22, 0.95)",
                textDecoration: "none",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 159, 10, 0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(18, 18, 22, 0.95)")}
            >
              ตรวจสลิป →
            </Link>
            <Link
              href="/tickets"
              onClick={() => setIsOpen(false)}
              style={{
                padding: "10px 4px",
                textAlign: "center",
                fontSize: "11.5px",
                fontWeight: 500,
                color: "#2997ff",
                background: "rgba(18, 18, 22, 0.95)",
                textDecoration: "none",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(41, 151, 255, 0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(18, 18, 22, 0.95)")}
            >
              ทิกเก็ต →
            </Link>
            <Link
              href="/leaves"
              onClick={() => setIsOpen(false)}
              style={{
                padding: "10px 4px",
                textAlign: "center",
                fontSize: "11.5px",
                fontWeight: 500,
                color: "#30d158",
                background: "rgba(18, 18, 22, 0.95)",
                textDecoration: "none",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(48, 209, 88, 0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(18, 18, 22, 0.95)")}
            >
              อนุมัติลา →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
