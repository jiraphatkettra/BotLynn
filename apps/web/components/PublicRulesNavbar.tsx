"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getDiscordAvatarUrl, isRootOwner } from "@/lib/utils";

export default function PublicRulesNavbar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const isRoot = isRootOwner(user?.discordId);

  return (
    <header className="public-rules-navbar">
      <div className="public-navbar-container">
        {/* Left: Brand / Community Info */}
        <div className="public-navbar-brand-group">
          <Link href="/rules" className="public-navbar-brand">
            <div className="public-brand-logo">
              <img src="/logo.png" alt="753 BC Logo" className="brand-logo-img" />
            </div>
            <div className="public-brand-titles">
              <div className="public-brand-main">
                <span className="public-brand-name">753 BC</span>
                <span className="public-brand-divider">/</span>
                <span className="public-brand-sub">ระเบียบทีมงาน</span>
              </div>
              <span className="public-brand-caption">753 BC DISCORD SERVER</span>
            </div>
          </Link>
          <span className="public-doc-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            เอกสารทางการ (Public)
          </span>
        </div>

        {/* Right: Actions & Staff Portal Button */}
        <div className="public-navbar-actions">
          {/* Quick Share / Copy URL Button */}
          <button
            type="button"
            className="public-action-btn"
            onClick={handleCopyLink}
            title="คัดลอกลิงก์ระเบียบนี้"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ color: "#30d158" }}>คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>แชร์ลิงก์</span>
              </>
            )}
          </button>

          {/* Print Document Button */}
          <button
            type="button"
            className="public-action-btn hide-mobile"
            onClick={handlePrint}
            title="พิมพ์หรือบันทึกเป็น PDF"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>พิมพ์</span>
          </button>

          <div className="public-navbar-divider" />

          {/* Conditional: Logged-in Staff vs Guest Member */}
          {user ? (
            <div className="public-staff-portal-auth">
              <div className="public-staff-user-info hide-mobile">
                <img
                  src={getDiscordAvatarUrl(user?.discordId || user?.id, user?.avatar)}
                  alt={user?.displayName || user?.name || "Staff"}
                  className="public-staff-avatar"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                  }}
                />
                <div className="public-staff-names">
                  <span className="public-staff-displayname">
                    {user?.displayName || user?.name || "Staff"}
                  </span>
                  <span className="public-staff-role-badge">
                    {isRoot ? "👑 Root Owner" : user?.role || "Staff"}
                  </span>
                </div>
              </div>

              <Link href="/" className="public-dashboard-btn">
                <span>แดชบอร์ดทีมงาน</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          ) : (
            <Link href="/login?callbackUrl=/rules" className="public-login-btn" id="staff-login-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>เข้าสู่ระบบทีมงาน</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
