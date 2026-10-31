"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { getDiscordAvatarUrl, isRootOwner } from "@/lib/utils";
import LiveStatusPulse from "@/components/LiveStatusPulse";
import NotificationCenter from "@/components/NotificationCenter";
import {
  Receipt,
  Wallet,
  ShoppingBag,
  MessageSquare,
  Volume2,
  Gift,
  Clock,
  Calendar,
  Users,
  Shield,
  BookOpen,
  FileText,
  CheckSquare,
  AlertTriangle,
  Settings,
  Database,
  Activity,
  BarChart3,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Bell,
  Megaphone,
} from "lucide-react";

interface SubNavItem {
  href: string;
  label: string;
  desc: string;
  badgeKey?: "pendingSlips" | "openTickets";
  icon: React.ComponentType<{ className?: string }>;
}

interface NavCategory {
  id: string;
  label: string;
  items: SubNavItem[];
}

const FINANCE_CATEGORY: NavCategory = {
  id: "finance",
  label: "การเงิน",
  items: [
    {
      href: "/slips",
      label: "ตรวจสลิปโอนเงิน",
      desc: "อนุมัติสลิป & ตรวจ QR Slip อัตโนมัติ",
      badgeKey: "pendingSlips",
      icon: Receipt,
    },
    {
      href: "/finance",
      label: "รายรับ-รายจ่าย",
      desc: "บันทึกบัญชี & งบประมาณเซิร์ฟเวอร์",
      icon: Wallet,
    },
    {
      href: "/shop",
      label: "ร้านค้ายศ Discord",
      desc: "จัดการแพ็กเกจยศ & ออเดอร์",
      icon: ShoppingBag,
    },
  ],
};

const SERVICES_CATEGORY: NavCategory = {
  id: "services",
  label: "บริการ & ชุมชน",
  items: [
    {
      href: "/tickets",
      label: "ทิกเก็ตช่วยเหลือ",
      desc: "รับเรื่อง & สนทนาซัพพอร์ตสมาชิก",
      badgeKey: "openTickets",
      icon: MessageSquare,
    },
    {
      href: "/announcements",
      label: "สตูดิโอประกาศ",
      desc: "ออกแบบ Embed & ประกาศผ่านบอท",
      icon: Megaphone,
    },
    {
      href: "/voice",
      label: "จัดการห้องเสียง",
      desc: "Dynamic Voice & สถิติสแตนด์บาย",
      icon: Volume2,
    },
    {
      href: "/giveaways",
      label: "กิจกรรมแจกของ",
      desc: "สุ่มของรางวัล & แจกยศอัตโนมัติ",
      icon: Gift,
    },
  ],
};

const TEAM_CATEGORY: NavCategory = {
  id: "team",
  label: "ทีมงาน",
  items: [
    {
      href: "/attendance",
      label: "ตอกบัตร & เวลาทำงาน",
      desc: "บันทึกเวลาปฏิบัติงาน & กะงาน",
      icon: Clock,
    },
    {
      href: "/leaves",
      label: "คำขอลางาน",
      desc: "ตรวจสอบ & อนุมัติการลางาน",
      icon: Calendar,
    },
    {
      href: "/admins",
      label: "รายชื่อแอดมิน",
      desc: "จัดการทีมงาน & สิทธิ์รายบุคคล",
      icon: Users,
    },
    {
      href: "/permissions",
      label: "สิทธิ์การเข้าถึง",
      desc: "ตั้งค่า Role Matrix ในแดชบอร์ด",
      icon: Shield,
    },
    {
      href: "/rules",
      label: "กฎระเบียบปฏิบัติ",
      desc: "คู่มือจริยธรรม & มาตรฐานทีมงาน",
      icon: BookOpen,
    },
    {
      href: "/notes",
      label: "โน้ตลับทีมงาน",
      desc: "สมุดบันทึก & ส่งต่องานเวร",
      icon: FileText,
    },
    {
      href: "/tasks",
      label: "กระดานงาน (Tasks)",
      desc: "Kanban Board ติดตามงาน",
      icon: CheckSquare,
    },
    {
      href: "/moderation",
      label: "ลงโทษสมาชิก",
      desc: "บันทึกเตือน แบน มิวต์ & ประวัติ",
      icon: AlertTriangle,
    },
  ],
};

const SYSTEM_CATEGORY: NavCategory = {
  id: "system",
  label: "ระบบ",
  items: [
    {
      href: "/settings",
      label: "ตั้งค่าระบบบอท",
      desc: "Config หลัก & เชื่อมต่อ Discord API",
      icon: Settings,
    },
    {
      href: "/backups",
      label: "สำรองและกู้ยศ",
      desc: "Snapshot ยศสมาชิก & Backup ฐานข้อมูล",
      icon: Database,
    },
    {
      href: "/logs",
      label: "บันทึกกิจกรรม (Audit)",
      desc: "ประวัติการทำงานย้อนหลังทุกมิติ",
      icon: Activity,
    },
    {
      href: "/bot-status",
      label: "สถานะการเชื่อมต่อ",
      desc: "Gateway, Ping & ประวัติ Uptime",
      icon: Activity,
    },
    {
      href: "/reports",
      label: "สร้างรายงานสรุป",
      desc: "Export PDF/Excel & วิเคราะห์ข้อมูล",
      icon: BarChart3,
    },
  ],
};

const ALL_CATEGORIES = [FINANCE_CATEGORY, SERVICES_CATEGORY, TEAM_CATEGORY, SYSTEM_CATEGORY];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [badges, setBadges] = useState<{ pendingSlips: number; openTickets: number }>({
    pendingSlips: 0,
    openTickets: 0,
  });

  const navRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on path change
  useEffect(() => {
    setOpenDropdown(null);
    setProfileOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Outside click & escape listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenDropdown(null);
        setProfileOpen(false);
        setMobileMenuOpen(false);
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

  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isCategoryActive = (category: NavCategory) => {
    return category.items.some((item) => isItemActive(item.href));
  };

  const getCategoryBadge = (category: NavCategory) => {
    return category.items.reduce((sum, item) => {
      if (!item.badgeKey) return sum;
      return sum + (badges[item.badgeKey] || 0);
    }, 0);
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <>
      <header
        className={`sticky top-0 left-0 right-0 z-50 h-16 transition-colors duration-200 select-none ${
          scrolled || mobileMenuOpen
            ? "bg-[#070809]/95 backdrop-blur-md border-b border-white/[0.08]"
            : "bg-[#070809]/80 backdrop-blur-sm border-b border-white/[0.06]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          {/* Left: Brand Identity (Sharp Technical Blueprint) */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity shrink-0 group"
          >
            {/* Minimalist Discord SVG Brand Icon */}
            <div className="w-6 h-6 flex items-center justify-center bg-white/[0.04] border border-white/[0.1] text-white group-hover:border-white/30 transition-colors">
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 127.14 96.36"
                aria-hidden="true"
              >
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.86,53,48.81,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold tracking-tight text-white font-sans">
                LynnBot
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-white/[0.04] border border-white/[0.08] text-neutral-400 tracking-wider">
                PORTAL
              </span>
            </div>
          </Link>

          {/* Center: Desktop Categorized Navigation (Sharp Bento Links) */}
          <div className="hidden lg:flex items-center gap-1.5" ref={navRef}>
            {/* Overview / Dashboard */}
            <Link
              href="/"
              className={`px-3 py-1.5 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                pathname === "/"
                  ? "text-white bg-white/[0.08] border border-white/[0.15]"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-neutral-400" />
              <span>ภาพรวม</span>
            </Link>

            {/* Dropdown Categories */}
            {ALL_CATEGORIES.map((category) => {
              const isOpen = openDropdown === category.id;
              const active = isCategoryActive(category);
              const badgeCount = getCategoryBadge(category);

              return (
                <div key={category.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(isOpen ? null : category.id)}
                    className={`px-3 py-1.5 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                      active || isOpen
                        ? "text-white bg-white/[0.08] border border-white/[0.15]"
                        : "text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <span>{category.label}</span>
                    {badgeCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {badgeCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3 h-3 text-neutral-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Sharp Technical Dropdown Panel */}
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-[#070809] border border-white/[0.12] shadow-2xl p-2 z-50 flex flex-col gap-1 anim-fade-in">
                      <div className="px-2.5 py-1 text-[9px] font-mono text-neutral-500 border-b border-white/[0.06] mb-1">
                        MODULE // {category.id.toUpperCase()}
                      </div>
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const isSubActive = isItemActive(item.href);
                        const itemBadge = item.badgeKey ? badges[item.badgeKey] : 0;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`p-2.5 flex items-start gap-3 border transition-colors ${
                              isSubActive
                                ? "bg-white/[0.06] border-white/[0.15] text-white"
                                : "bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/[0.06] text-neutral-300 hover:text-white"
                            }`}
                          >
                            <div className="w-7 h-7 flex items-center justify-center bg-white/[0.03] border border-white/[0.06] shrink-0 mt-0.5 text-neutral-400">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold truncate font-sans">
                                  {item.label}
                                </span>
                                {itemBadge > 0 && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                    {itemBadge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 truncate mt-0.5 font-sans leading-tight">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Actions, Search, Live Pulse, and User Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Command Palette Trigger (⌘K) */}
            <button
              type="button"
              onClick={handleOpenSearch}
              className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 text-neutral-400 hover:text-white text-xs font-mono transition-colors"
              title="ค้นหาด่วน (⌘K หรือ Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline">ค้นหา...</span>
              <kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.06] border border-white/[0.1] text-neutral-400">
                ⌘K
              </kbd>
            </button>

            {/* Notification Center */}
            <NotificationCenter />

            {/* Live Bot Gateway Status */}
            <LiveStatusPulse />

            {/* User Profile Pill & Dropdown */}
            {user && (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 transition-colors cursor-pointer"
                  aria-label="เมนูผู้ใช้งาน"
                >
                  <img
                    src={getDiscordAvatarUrl(user?.discordId || user?.id, user?.avatar)}
                    alt={user?.displayName || user?.name || "Admin"}
                    className="w-6 h-6 object-cover border border-white/20 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://cdn.discordapp.com/embed/avatars/0.png";
                    }}
                  />
                  <span className="hidden md:inline text-xs font-medium text-white max-w-[90px] truncate">
                    {user?.displayName || user?.name || "Admin"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-neutral-400 hidden sm:inline" />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#070809] border border-white/[0.12] shadow-2xl p-2 z-50 flex flex-col gap-1 anim-fade-in">
                    <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                      <div className="text-xs font-semibold text-white truncate">
                        {user?.displayName || user?.name || "Admin"}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate mt-0.5 flex items-center justify-between">
                        <span>{user?.role || "ADMIN"}</span>
                        {isRootOwner(user?.discordId) && (
                          <span className="text-amber-400 text-[9px]">ROOT_OWNER</span>
                        )}
                      </div>
                    </div>

                    <Link
                      href="/settings"
                      className="px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-neutral-400" />
                      <span>ตั้งค่าระบบ</span>
                    </Link>

                    <Link
                      href="/rules"
                      className="px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-2"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                      <span>กฎระเบียบปฏิบัติ</span>
                    </Link>

                    <div className="border-t border-white/[0.08] my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Hamburger (Phones & Tablets) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-neutral-400 hover:text-white bg-white/[0.03] border border-white/[0.08] transition-colors"
              aria-label="เปิดเมนูนำทาง"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (Slide-down overlay) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-[#070809]/95 backdrop-blur-xl border-b border-white/[0.1] overflow-y-auto p-4 sm:p-6 pb-28">
          <div className="space-y-6 max-w-lg mx-auto">
            {/* Search row on mobile */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenSearch();
              }}
              className="w-full flex items-center justify-between p-3 bg-white/[0.04] border border-white/[0.1] text-neutral-300 text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-neutral-400" />
                <span>ค้นหาเมนูหรือคำสั่งด่วน...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.08] border border-white/[0.1]">
                ⌘K
              </kbd>
            </button>

            {/* Direct Link: Dashboard */}
            <Link
              href="/"
              className={`p-3 flex items-center gap-3 border text-xs font-mono ${
                pathname === "/"
                  ? "bg-white/[0.08] border-white/20 text-white"
                  : "bg-white/[0.02] border-white/[0.06] text-neutral-400"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-white">00 // ภาพรวมแดชบอร์ด</span>
            </Link>

            {/* Categorized Modules */}
            {ALL_CATEGORIES.map((cat, idx) => (
              <div key={cat.id} className="space-y-2">
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest px-1">
                  0{idx + 1} // {cat.label}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href);
                    const itemBadge = item.badgeKey ? badges[item.badgeKey] : 0;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`p-2.5 flex items-center justify-between border transition-colors ${
                          active
                            ? "bg-white/[0.08] border-white/20 text-white"
                            : "bg-white/[0.02] border-white/[0.06] text-neutral-300 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span className="text-xs font-medium truncate font-sans">
                            {item.label}
                          </span>
                        </div>
                        {itemBadge > 0 && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {itemBadge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
