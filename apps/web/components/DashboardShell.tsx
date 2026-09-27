"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar drawer automatically when navigating to another page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Handle ESC key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <div className="dashboard-layout">
      {/* Mobile & Tablet Header Bar (sticky at top, <= 1024px) */}
      <header className="mobile-topbar" id="mobile-topbar">
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "ปิดแถบเมนู" : "เปิดแถบเมนู"}
          id="mobile-menu-toggle"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {mobileOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </>
            )}
          </svg>
        </button>

        <div className="mobile-topbar-brand">
          <div className="mobile-topbar-logo">
            <img src="/logo.png" alt="LynnBot Logo" className="brand-logo-img" />
          </div>
          <span className="mobile-topbar-title">LynnBot</span>
        </div>

        <div className="mobile-topbar-right">
          <div className="bot-status-indicator" style={{ padding: "3px 8px", fontSize: 11 }}>
            <span className="bot-status-dot online" />
            <span>Online</span>
          </div>
        </div>
      </header>

      {/* Backdrop Overlay for Mobile Drawer */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      {/* Sidebar Drawer */}
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main Page Content */}
      <main className="main-content">{children}</main>
    </div>
  );
}
