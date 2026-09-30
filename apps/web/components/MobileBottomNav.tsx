"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [badges, setBadges] = useState<{ pendingSlips: number; openTickets: number }>({
    pendingSlips: 0,
    openTickets: 0,
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchBadges() {
      try {
        const res = await fetch("/api/badges");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setBadges({
              pendingSlips: Number(data.pendingSlips) || 0,
              openTickets: Number(data.openTickets) || 0,
            });
          }
        }
      } catch {}
    }

    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  const handleOpenMobileMenu = () => {
    window.dispatchEvent(new CustomEvent("toggle-mobile-drawer"));
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="แถบนำทางด่วนบนมือถือ">
      <div className="mobile-bottom-nav-inner">
        {/* 1. Home / Overview */}
        <Link
          href="/"
          className={`mobile-nav-btn ${isItemActive("/") ? "active" : ""}`}
        >
          <div className="mobile-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="9" x="3" y="3" rx="1.5" />
              <rect width="7" height="5" x="14" y="3" rx="1.5" />
              <rect width="7" height="9" x="14" y="12" rx="1.5" />
              <rect width="7" height="5" x="3" y="16" rx="1.5" />
            </svg>
          </div>
          <span className="mobile-nav-label">ภาพรวม</span>
        </Link>

        {/* 2. Slips */}
        <Link
          href="/slips"
          className={`mobile-nav-btn ${isItemActive("/slips") ? "active" : ""}`}
        >
          <div className="mobile-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            {badges.pendingSlips > 0 && (
              <span className="mobile-nav-badge warning">
                {badges.pendingSlips > 99 ? "99+" : badges.pendingSlips}
              </span>
            )}
          </div>
          <span className="mobile-nav-label">สลิป</span>
        </Link>

        {/* 3. Search / Spotlight (Center Action) */}
        <button
          type="button"
          onClick={handleOpenSearch}
          className="mobile-nav-btn center-action"
          aria-label="ค้นหาด่วน"
        >
          <div className="mobile-nav-center-orb">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <span className="mobile-nav-label">ค้นหา</span>
        </button>

        {/* 4. Tickets */}
        <Link
          href="/tickets"
          className={`mobile-nav-btn ${isItemActive("/tickets") ? "active" : ""}`}
        >
          <div className="mobile-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {badges.openTickets > 0 && (
              <span className="mobile-nav-badge info">
                {badges.openTickets > 99 ? "99+" : badges.openTickets}
              </span>
            )}
          </div>
          <span className="mobile-nav-label">ทิกเก็ต</span>
        </Link>

        {/* 5. Menu Drawer Trigger */}
        <button
          type="button"
          onClick={handleOpenMobileMenu}
          className="mobile-nav-btn"
          aria-label="เปิดเมนูทั้งหมด"
        >
          <div className="mobile-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </div>
          <span className="mobile-nav-label">เมนู</span>
        </button>
      </div>
    </nav>
  );
}
