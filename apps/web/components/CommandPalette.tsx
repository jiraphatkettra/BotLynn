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

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K or custom event
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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
          background: "rgba(22, 22, 26, 0.92)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "20px",
          boxShadow: "0 30px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)",
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
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
              color: "#fff",
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
                    <span style={{ fontSize: "18px", width: "24px", textAlign: "center" }}>
                      {item.icon}
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
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--text-muted)",
            background: "rgba(0, 0, 0, 0.2)",
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
