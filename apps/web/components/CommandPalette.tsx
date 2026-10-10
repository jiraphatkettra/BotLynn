"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  title: string;
  category: "หน้าการทำงาน" | "คำสั่งด่วน";
  icon: string;
  href: string;
  keywords?: string[];
  description?: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  // Pages
  {
    id: "dashboard",
    title: "แดชบอร์ดภาพรวม",
    category: "หน้าการทำงาน",
    icon: "📊",
    href: "/",
    keywords: ["home", "dashboard", "สถิติ", "หน้าแรก", "ภาพรวม"],
    description: "ดูสถิติรายได้, ผู้ใช้งาน, กิจกรรมล่าสุด",
  },
  {
    id: "attendance",
    title: "ระบบตอกบัตรเข้า-ออกงาน",
    category: "หน้าการทำงาน",
    icon: "⏱️",
    href: "/attendance",
    keywords: ["attendance", "clockin", "clockout", "ตอกบัตร", "เข้างาน", "ออกงาน"],
    description: "ตรวจสอบบันทึกเวลาทำงานของแอดมิน",
  },
  {
    id: "shop",
    title: "ร้านค้ายศ Discord",
    category: "หน้าการทำงาน",
    icon: "🛍️",
    href: "/shop",
    keywords: ["shop", "role", "ร้านค้า", "ยศ", "ซื้อยศ", "ขายยศ"],
    description: "จัดการยศ, สต๊อก, ราคา และโปรโมชั่น",
  },
  {
    id: "slips",
    title: "จัดการสลิปโอนเงิน",
    category: "หน้าการทำงาน",
    icon: "🧾",
    href: "/slips",
    keywords: ["slip", "สลิป", "โอนเงิน", "อนุมัติ", "ตรวจสลิป"],
    description: "ตรวจสอบและอนุมัติสลิปโอนเงินจากสมาชิก",
  },
  {
    id: "finance",
    title: "บัญชีรายรับ-รายจ่าย",
    category: "หน้าการทำงาน",
    icon: "💰",
    href: "/finance",
    keywords: ["finance", "income", "expense", "รายรับ", "รายจ่าย", "เงิน", "บัญชี", "งบประมาณ", "กำไร", "ขาดทุน", "cashflow"],
    description: "บันทึกรายรับ-รายจ่ายแมนนวล สรุปงบประมาณและกำไรขาดทุน",
  },
  {
    id: "tickets",
    title: "ระบบทิกเก็ตและช่วยเหลือ",
    category: "หน้าการทำงาน",
    icon: "🎫",
    href: "/tickets",
    keywords: ["ticket", "ทิกเก็ต", "เคส", "ช่วยเหลือ", "แจ้งปัญหา"],
    description: "ดูแลห้องแชททิกเก็ตและตอบคำถามสมาชิก",
  },
  {
    id: "admins",
    title: "ทีมแอดมินและผู้ดูแล",
    category: "หน้าการทำงาน",
    icon: "👥",
    href: "/admins",
    keywords: ["admin", "staff", "ทีมงาน", "แอดมิน", "ผู้ดูแล", "รายชื่อ"],
    description: "จัดการสมาชิกทีมงาน, สิทธิ์ และซิงค์ยศ",
  },
  {
    id: "rules",
    title: "กฎทีมงานและระเบียบปฏิบัติ",
    category: "หน้าการทำงาน",
    icon: "⚖️",
    href: "/rules",
    keywords: ["rules", "กฎ", "ระเบียบ", "กฎแอดมิน", "จรรยาบรรณ", "บทลงโทษ", "753bc"],
    description: "คู่มือระเบียบ จริยธรรม และตารางระดับโทษทีมงาน",
  },
  {
    id: "permissions",
    title: "ตารางสิทธิ์การใช้งาน",
    category: "หน้าการทำงาน",
    icon: "🔐",
    href: "/permissions",
    keywords: ["permission", "สิทธิ์", "สิทธิ์รายบุคคล", "บทบาท"],
    description: "ดูและกำหนดสิทธิ์รายฟังก์ชันของแอดมิน",
  },
  {
    id: "announcements",
    title: "สตูดิโอประกาศ Discord",
    category: "หน้าการทำงาน",
    icon: "📢",
    href: "/announcements",
    keywords: ["announce", "ประกาศ", "embed", "ส่งข้อความ"],
    description: "สร้างและส่งประกาศเข้าห้อง Discord",
  },
  {
    id: "leaves",
    title: "ระบบลาหยุด / ลากิจ",
    category: "หน้าการทำงาน",
    icon: "📅",
    href: "/leaves",
    keywords: ["leave", "ลาหยุด", "ลาป่วย", "ลากิจ", "พักร้อน", "วันลา"],
    description: "ส่งคำขอลาและอนุมัติคำขอลาของทีมงาน",
  },
  {
    id: "voice",
    title: "สถิติห้องเสียง (Voice)",
    category: "หน้าการทำงาน",
    icon: "🎙️",
    href: "/voice",
    keywords: ["voice", "เสียง", "ห้องเสียง", "voice chat", "vc", "พูดคุย"],
    description: "ดูสถิติการเข้าห้อง Voice และ Leaderboard",
  },
  {
    id: "backups",
    title: "สำรองและกู้ยศสมาชิก",
    category: "หน้าการทำงาน",
    icon: "💾",
    href: "/backups",
    keywords: ["backup", "restore", "สำรอง", "กู้คืน", "ยศหาย"],
    description: "บันทึกและกู้คืนยศสมาชิก Discord",
  },
  {
    id: "logs",
    title: "ประวัติกิจกรรม (Audit Logs)",
    category: "หน้าการทำงาน",
    icon: "📜",
    href: "/logs",
    keywords: ["logs", "audit", "ประวัติ", "ตรวจสอบ"],
    description: "บันทึกการทำงานและกิจกรรมย้อนหลังในระบบ",
  },
  {
    id: "bot-status",
    title: "สถานะการทำงานของบอท",
    category: "หน้าการทำงาน",
    icon: "🤖",
    href: "/bot-status",
    keywords: ["bot", "status", "สถานะ", "uptime", "ปิง"],
    description: "ตรวจสอบการเชื่อมต่อ, latency และ memory",
  },
  {
    id: "settings",
    title: "ตั้งค่าระบบและห้อง Discord",
    category: "หน้าการทำงาน",
    icon: "⚙️",
    href: "/settings",
    keywords: ["setting", "ตั้งค่า", "ห้อง", "promptpay", "พร้อมเพย์", "ช่อง"],
    description: "กำหนดห้องแจ้งเตือน, บัญชีรับเงิน และระบบหลัก",
  },

  // Quick Actions
  {
    id: "action-check-slips",
    title: "ตรวจสลิปที่รอดำเนินการ",
    category: "คำสั่งด่วน",
    icon: "⚡",
    href: "/slips?status=PENDING",
    keywords: ["ตรวจสลิปด่วน", "สลิปรอตรวจ", "pending slip"],
    description: "เปิดดูเฉพาะสลิปที่ยังรอการอนุมัติทันที",
  },
  {
    id: "action-open-tickets",
    title: "ดูทิกเก็ตที่ยังเปิดอยู่",
    category: "คำสั่งด่วน",
    icon: "⚡",
    href: "/tickets?status=OPEN",
    keywords: ["ทิกเก็ตค้าง", "เคสเปิดอยู่", "open ticket"],
    description: "เปิดดูทิกเก็ตที่ยังไม่มีผู้รับเคสหรือกำลังดำเนินเรื่อง",
  },
  {
    id: "action-sync-admins",
    title: "ไปหน้าซิงค์ยศแอดมิน Discord",
    category: "คำสั่งด่วน",
    icon: "🔄",
    href: "/admins",
    keywords: ["sync admin", "ดึงแอดมิน", "ซิงค์ยศ"],
    description: "ตรวจสอบและอัปเดตสมาชิกตามยศของ Discord",
  },
  {
    id: "action-settings-channels",
    title: "ตั้งค่าห้องแจ้งเตือน Discord",
    category: "คำสั่งด่วน",
    icon: "📢",
    href: "/settings",
    keywords: ["ตั้งค่าห้อง", "channel setting", "แจ้งเตือน discord"],
    description: "เลือกห้องสำหรับรับใบเสร็จ, ตอกบัตร และสลิป",
  },
];

function renderCommandVectorIcon(id: string) {
  switch (id) {
    case "dashboard":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/></svg>;
    case "attendance":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "shop":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
    case "slips":
    case "action-check-slips":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
    case "finance":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case "tickets":
    case "action-open-tickets":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
    case "admins":
    case "action-sync-admins":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "rules":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "permissions":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "announcements":
    case "action-settings-channels":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>;
    case "leaves":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "voice":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
    case "backups":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
    case "logs":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case "bot-status":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>;
    case "settings":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    default:
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
  }
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K or custom event
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.code === "KeyK" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    function handleOpenEvent() {
      setIsOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpenEvent);
    };
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter items
  const filteredItems = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);
      const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return titleMatch || descMatch || keywordMatch;
    });
  }, [query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle arrow navigation
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      executeItem(filteredItems[selectedIndex]);
    }
  }

  function executeItem(item: CommandItem) {
    setIsOpen(false);
    router.push(item.href);
  }

  if (!isOpen) return null;

  return (
    <div
      className="apple-spotlight-backdrop"
      onClick={() => setIsOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "min(14vh, 120px)",
        paddingLeft: "16px",
        paddingRight: "16px",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        className="apple-spotlight-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "var(--bg-elevated)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid var(--border-default)",
          borderRadius: "20px",
          boxShadow: "var(--shadow-glass)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Search Bar Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2997ff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="ค้นหาหน้า, ตอกบัตร, สลิป, หรือการตั้งค่า... (พิมพ์เพื่อค้นหา)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "16px",
              fontWeight: "450",
              outline: "none",
            }}
          />
          <kbd
            style={{
              padding: "3px 8px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "var(--text-muted)",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          style={{
            maxHeight: "380px",
            overflowY: "auto",
            padding: "10px",
          }}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: isSelected ? "rgba(41, 151, 255, 0.15)" : "transparent",
                    border: isSelected ? "1px solid rgba(41, 151, 255, 0.3)" : "1px solid transparent",
                    transition: "all 0.12s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <span style={{ width: "24px", height: "24px", display: "inline-flex", alignItems: "center", justifyContent: "center", color: isSelected ? "#2997ff" : "var(--text-secondary)", flexShrink: 0 }}>
                      {renderCommandVectorIcon(item.id)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: isSelected ? "600" : "500",
                          color: isSelected ? "#fff" : "var(--text-primary)",
                        }}
                      >
                        {item.title}
                      </div>
                      {item.description && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "11px",
                        color: isSelected ? "#2997ff" : "var(--text-muted)",
                        background: isSelected ? "rgba(41, 151, 255, 0.15)" : "rgba(255, 255, 255, 0.04)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {item.category}
                    </span>
                    <span style={{ color: isSelected ? "#2997ff" : "rgba(255, 255, 255, 0.2)", fontSize: "14px" }}>
                      ›
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔍</div>
              <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
                ไม่พบผลลัพธ์ที่ตรงกับ "{query}"
              </div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                ลองพิมพ์คำอื่น เช่น "สลิป", "ตอกบัตร", "ยศ", หรือ "ตั้งค่า"
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--text-muted)",
            background: "var(--bg-card-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: "16px" }}>
            <span><kbd style={{ fontSize: "10px", padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "4px" }}>↑↓</kbd> นำทาง</span>
            <span><kbd style={{ fontSize: "10px", padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "4px" }}>↵</kbd> เปิด</span>
            <span><kbd style={{ fontSize: "10px", padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "4px" }}>esc</kbd> ปิด</span>
          </div>
          <div style={{ color: "#2997ff", fontWeight: "500", fontSize: "11px" }}>
            Spotlight Search
          </div>
        </div>
      </div>
    </div>
  );
}
