"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { getDiscordAvatarUrl, isRootOwner } from "@/lib/utils";
import LiveStatusPulse from "@/components/LiveStatusPulse";

interface SubNavItem {
  href: string;
  label: string;
  desc: string;
  badgeKey?: "pendingSlips" | "openTickets";
  badgeColor?: string;
  icon: React.ReactNode;
}

interface NavCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  alignRight?: boolean;
  items: SubNavItem[];
}

interface DirectNavItem {
  href: string;
  label: string;
  badgeKey?: "pendingSlips" | "openTickets";
  icon: React.ReactNode;
}

// 1. Overview direct links
const DASHBOARD_NAV: DirectNavItem = {
  href: "/",
  label: "แดชบอร์ด",
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1.5" />
      <rect width="7" height="5" x="14" y="3" rx="1.5" />
      <rect width="7" height="9" x="14" y="12" rx="1.5" />
      <rect width="7" height="5" x="3" y="16" rx="1.5" />
    </svg>
  ),
};

const ANNOUNCEMENT_NAV: DirectNavItem = {
  href: "/announcements",
  label: "ประกาศ",
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="12" y1="7" x2="12" y2="13" />
    </svg>
  ),
};

// 2. Nav Categories (Dropdowns)
const SERVICES_CATEGORY: NavCategory = {
  id: "services",
  label: "บริการ",
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
    </svg>
  ),
  items: [
    {
      href: "/slips",
      label: "ตรวจสลิป",
      desc: "ตรวจสอบและอนุมัติสลิปโอนเงิน",
      badgeKey: "pendingSlips",
      badgeColor: "#ff9f0a",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      ),
    },
    {
      href: "/shop",
      label: "ร้านค้ายศ",
      desc: "จัดการแพ็กเกจยศ & ประวัติสั่งซื้อ",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      href: "/tickets",
      label: "ทิกเก็ตช่วยเหลือ",
      desc: "จัดการกล่องข้อความและเคสลูกค้า",
      badgeKey: "openTickets",
      badgeColor: "#2997ff",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
  ],
};

const TEAM_CATEGORY: NavCategory = {
  id: "team",
  label: "ทีมงาน",
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  items: [
    {
      href: "/attendance",
      label: "ตอกบัตรเข้างาน",
      desc: "บันทึกเวลาเข้า-ออกงาน & สถิติกะ",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      href: "/leaves",
      label: "ลาหยุด / ลากิจ",
      desc: "ส่งคำขอลาและอนุมัติคำขอลาของทีมงาน",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
          <line x1="10" x2="14" y1="14" y2="18" />
          <line x1="14" x2="10" y1="14" y2="18" />
        </svg>
      ),
    },
    {
      href: "/voice",
      label: "สถิติห้องเสียง",
      desc: "ดูสถิติการเข้าห้อง Voice ของสมาชิก",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      ),
    },
    {
      href: "/admins",
      label: "รายชื่อทีมงาน",
      desc: "จัดการข้อมูลและตำแหน่งผู้ดูแลระบบ",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      href: "/permissions",
      label: "กำหนดสิทธิ์",
      desc: "ตารางสิทธิ์การเข้าถึงรายบุคคล",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
  ],
};

const SYSTEM_CATEGORY: NavCategory = {
  id: "system",
  label: "จัดการระบบ",
  alignRight: true,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  items: [
    {
      href: "/settings",
      label: "ตั้งค่าระบบ",
      desc: "กำหนดห้องแจ้งเตือน & การเงิน",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" x2="20" y1="21" y2="21" />
          <line x1="4" x2="20" y1="14" y2="14" />
          <line x1="4" x2="20" y1="7" y2="7" />
          <circle cx="8" cy="7" r="2" />
          <circle cx="16" cy="14" r="2" />
          <circle cx="10" cy="21" r="2" />
        </svg>
      ),
    },
    {
      href: "/backups",
      label: "สำรองและกู้ยศ",
      desc: "บันทึกและกู้คืนยศสมาชิก Discord",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      ),
    },
    {
      href: "/logs",
      label: "บันทึกกิจกรรม",
      desc: "ตรวจสอบ Audit Log ย้อนหลัง",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      href: "/bot-status",
      label: "สถานะบอท",
      desc: "ข้อมูลการเชื่อมต่อ & ปิงเซิร์ฟเวอร์",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
          <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
          <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
        </svg>
      ),
    },
  ],
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  // Active dropdown state: null | 'services' | 'team' | 'system'
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Badge counts
  const [badges, setBadges] = useState<{ pendingSlips: number; openTickets: number }>({
    pendingSlips: 0,
    openTickets: 0,
  });

  const navLinksRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setOpenDropdown(null);
    setProfileOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Click outside and escape key listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navLinksRef.current && !navLinksRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Poll badges every 30s
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

  // Listen for mobile bottom nav drawer trigger
  useEffect(() => {
    const handleToggleDrawer = () => setMobileMenuOpen((prev) => !prev);
    const handleOpenDrawer = () => setMobileMenuOpen(true);
    const handleCloseDrawer = () => setMobileMenuOpen(false);

    window.addEventListener("toggle-mobile-drawer", handleToggleDrawer);
    window.addEventListener("open-mobile-drawer", handleOpenDrawer);
    window.addEventListener("close-mobile-drawer", handleCloseDrawer);

    return () => {
      window.removeEventListener("toggle-mobile-drawer", handleToggleDrawer);
      window.removeEventListener("open-mobile-drawer", handleOpenDrawer);
      window.removeEventListener("close-mobile-drawer", handleCloseDrawer);
    };
  }, []);

  function handleOpenSearch() {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  }

  const isRoot = isRootOwner(user?.discordId);

  // Helper to check active state
  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isCategoryActive = (category: NavCategory) => {
    return category.items.some((item) => isItemActive(item.href));
  };

  const getCategoryBadgeCount = (category: NavCategory) => {
    return category.items.reduce((sum, item) => {
      if (!item.badgeKey) return sum;
      return sum + (badges[item.badgeKey] || 0);
    }, 0);
  };

  // Render a Category Dropdown Tab
  const renderCategoryDropdown = (category: NavCategory) => {
    const isOpen = openDropdown === category.id;
    const isActive = isCategoryActive(category);
    const categoryBadge = getCategoryBadgeCount(category);

    return (
      <div key={category.id} className="apple-nav-dropdown-wrapper">
        <button
          type="button"
          className={`apple-nav-link ${isActive ? "active" : ""} ${isOpen ? "open" : ""}`}
          onClick={() => {
            setOpenDropdown(isOpen ? null : category.id);
            setProfileOpen(false);
          }}
          onMouseEnter={() => {
            category.items.forEach((item) => {
              try {
                router.prefetch(item.href);
              } catch {}
            });
          }}
          aria-expanded={isOpen}
        >
          <span className="apple-nav-link-icon">{category.icon}</span>
          <span>{category.label}</span>
          {categoryBadge > 0 && (
            <span
              className="apple-nav-badge"
              style={{
                backgroundColor: "#ff9f0a",
                color: "#000",
              }}
            >
              {categoryBadge}
            </span>
          )}
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`apple-dropdown-chevron ${isOpen ? "open" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className={`apple-nav-dropdown-menu ${category.alignRight ? "align-right" : ""}`}>
            {category.items.map((item) => {
              const subActive = isItemActive(item.href);
              const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onMouseEnter={() => {
                    try {
                      router.prefetch(item.href);
                    } catch {}
                  }}
                  onClick={() => setOpenDropdown(null)}
                  className={`apple-dropdown-item ${subActive ? "active" : ""}`}
                >
                  <div className="apple-dropdown-item-icon">{item.icon}</div>
                  <div className="apple-dropdown-item-text">
                    <div className="apple-dropdown-item-header">
                      <span className="apple-dropdown-item-title">{item.label}</span>
                      {badgeCount > 0 && (
                        <span
                          className="apple-dropdown-badge"
                          style={{
                            backgroundColor: item.badgeColor || "#2997ff",
                            color: item.badgeColor === "#ff9f0a" ? "#000" : "#fff",
                          }}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </div>
                    <div className="apple-dropdown-item-desc">{item.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="apple-navbar" id="main-navbar">
      <div className="apple-navbar-container">
        {/* Left: Brand Logo */}
        <Link href="/" className="apple-navbar-brand">
          <div className="apple-navbar-logo">
            <img src="/logo.png" alt="LynnBot Logo" className="brand-logo-img" />
          </div>
          <span className="apple-navbar-title">LynnBot</span>
          <span className="apple-navbar-tag">Pro</span>
        </Link>

        {/* Center: Desktop Categorized Navigation */}
        <div className="apple-navbar-links" ref={navLinksRef}>
          {/* 1. Dashboard (Direct Link) */}
          <Link
            href={DASHBOARD_NAV.href}
            prefetch={true}
            onMouseEnter={() => {
              try {
                router.prefetch(DASHBOARD_NAV.href);
              } catch {}
            }}
            className={`apple-nav-link ${isItemActive(DASHBOARD_NAV.href) ? "active" : ""}`}
          >
            <span className="apple-nav-link-icon">{DASHBOARD_NAV.icon}</span>
            <span>{DASHBOARD_NAV.label}</span>
          </Link>

          {/* 2. Services Dropdown (Slips, Shop, Tickets) */}
          {renderCategoryDropdown(SERVICES_CATEGORY)}

          {/* 3. Team Dropdown (Attendance, Admins, Permissions) */}
          {renderCategoryDropdown(TEAM_CATEGORY)}

          {/* 4. Announcements (Direct Link) */}
          <Link
            href={ANNOUNCEMENT_NAV.href}
            prefetch={true}
            onMouseEnter={() => {
              try {
                router.prefetch(ANNOUNCEMENT_NAV.href);
              } catch {}
            }}
            className={`apple-nav-link ${isItemActive(ANNOUNCEMENT_NAV.href) ? "active" : ""}`}
          >
            <span className="apple-nav-link-icon">{ANNOUNCEMENT_NAV.icon}</span>
            <span>{ANNOUNCEMENT_NAV.label}</span>
          </Link>

          {/* 5. System Dropdown (Settings, Backups, Logs, Bot Status) */}
          {renderCategoryDropdown(SYSTEM_CATEGORY)}
        </div>

        {/* Right: Actions, Search, and Profile */}
        <div className="apple-navbar-right">
          {/* Spotlight Search Trigger */}
          <button
            type="button"
            className="apple-nav-search-btn"
            onClick={handleOpenSearch}
            title="ค้นหาด่วน (⌘K หรือ Ctrl+K)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="apple-nav-search-text">ค้นหา...</span>
            <kbd className="apple-nav-kbd">⌘K</kbd>
          </button>

          {/* Bot Online Status Pill with Live ECG & Radar */}
          <LiveStatusPulse />

          {/* User Profile Pill & Dropdown */}
          <div className="apple-profile-wrapper" ref={profileDropdownRef}>
            <button
              type="button"
              className={`apple-profile-btn ${profileOpen ? "active" : ""}`}
              onClick={() => {
                setProfileOpen(!profileOpen);
                setOpenDropdown(null);
              }}
              aria-label="เมนูผู้ใช้งาน"
            >
              <div className="apple-profile-avatar">
                <img
                  src={getDiscordAvatarUrl(user?.discordId || user?.id, user?.avatar)}
                  alt={user?.displayName || user?.name || "Admin"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                  }}
                />
              </div>
              <div className="apple-profile-name-group">
                <span className="apple-profile-name">
                  {user?.displayName || user?.name || "แอดมิน"}
                </span>
                {isRoot ? (
                  <span className="apple-role-tag root">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                    </svg>
                    Owner
                  </span>
                ) : (
                  <span className="apple-role-tag">{user?.role || "Staff"}</span>
                )}
              </div>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  color: "rgba(255, 255, 255, 0.4)",
                  transition: "transform 0.2s ease",
                  transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="apple-profile-dropdown">
                <div className="apple-profile-dropdown-header">
                  <div className="apple-profile-dropdown-avatar">
                    <img
                      src={getDiscordAvatarUrl(user?.discordId || user?.id, user?.avatar)}
                      alt={user?.displayName || user?.name || "Admin"}
                    />
                  </div>
                  <div>
                    <div className="apple-profile-dropdown-name">
                      {user?.displayName || user?.name || "ผู้ดูแลระบบ"}
                    </div>
                    <div className="apple-profile-dropdown-handle">
                      @{user?.username || user?.name || "discord"}
                    </div>
                    <div className="apple-profile-dropdown-badge">
                      {isRoot ? "👑 เจ้าของสูงสุด (Root Owner)" : `สิทธิ์: ${user?.role || "ADMIN"}`}
                    </div>
                  </div>
                </div>

                <div className="apple-profile-dropdown-divider" />

                <Link
                  href="/permissions"
                  onClick={() => setProfileOpen(false)}
                  className="apple-profile-menu-item"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>ตรวจสอบสิทธิ์ของฉัน</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="apple-profile-menu-item"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>ตั้งค่าระบบ</span>
                </Link>

                <div className="apple-profile-dropdown-divider" />

                <button
                  type="button"
                  className="apple-profile-menu-item logout"
                  onClick={() => {
                    setProfileOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="apple-mobile-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="apple-mobile-drawer">
            {/* Drawer Top Header with Dismiss Button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "14px",
                marginBottom: "16px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                  เมนูนำทางทั้งหมด
                </span>
                <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "rgba(10, 132, 255, 0.2)", color: "#2997ff", fontWeight: 600 }}>
                  LynnBot
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
                aria-label="ปิดเมนู"
              >
                ✕
              </button>
            </div>
          <div className="apple-mobile-drawer-content">
            {/* Section 1: Overview */}
            <div className="apple-mobile-category-block">
              <div className="apple-mobile-section-label">ภาพรวม & ข่าวสาร</div>
              <div className="apple-mobile-nav-grid">
                {[DASHBOARD_NAV, ANNOUNCEMENT_NAV].map((item) => {
                  const isActive = isItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`apple-mobile-nav-item ${isActive ? "active" : ""}`}
                    >
                      <span className="apple-mobile-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Services */}
            <div className="apple-mobile-category-block">
              <div className="apple-mobile-section-label">บริการ & ร้านค้า</div>
              <div className="apple-mobile-nav-grid">
                {SERVICES_CATEGORY.items.map((item) => {
                  const isActive = isItemActive(item.href);
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`apple-mobile-nav-item ${isActive ? "active" : ""}`}
                    >
                      <span className="apple-mobile-icon">{item.icon}</span>
                      <span>{item.label}</span>
                      {badgeCount > 0 && (
                        <span
                          className="apple-mobile-badge"
                          style={{
                            backgroundColor: item.badgeColor || "#2997ff",
                            color: item.badgeColor === "#ff9f0a" ? "#000" : "#fff",
                          }}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Team */}
            <div className="apple-mobile-category-block">
              <div className="apple-mobile-section-label">ทีมงาน & บุคลากร</div>
              <div className="apple-mobile-nav-grid">
                {TEAM_CATEGORY.items.map((item) => {
                  const isActive = isItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`apple-mobile-nav-item ${isActive ? "active" : ""}`}
                    >
                      <span className="apple-mobile-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Section 4: System */}
            <div className="apple-mobile-category-block">
              <div className="apple-mobile-section-label">ระบบ & จัดการ</div>
              <div className="apple-mobile-nav-grid">
                {SYSTEM_CATEGORY.items.map((item) => {
                  const isActive = isItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`apple-mobile-nav-item ${isActive ? "active" : ""}`}
                    >
                      <span className="apple-mobile-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="apple-profile-dropdown-divider" style={{ margin: "20px 0 16px" }} />

            <button
              type="button"
              className="apple-profile-menu-item logout"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                setMobileMenuOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
        </>
      )}
    </nav>
  );
}
