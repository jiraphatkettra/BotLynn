"use client";

import React from "react";

export default function PublicRulesFooter() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="public-rules-footer">
      <div className="public-footer-container">
        <div className="public-footer-left">
          <div className="public-footer-brand">
            753 BC DISCORD SERVER • คู่มือระเบียบและกฎทีมงานฉบับทางการ
          </div>
          <div className="public-footer-copy">
            เอกสารนี้จัดทำขึ้นเพื่อใช้บังคับและเป็นแนวทางปฏิบัติหน้าที่ของผู้ดูแลระบบภายในเซิร์ฟเวอร์
            ห้ามมิให้ดัดแปลง ทำซ้ำ หรือนำไปใช้ในเชิงพาณิชย์โดยไม่ได้รับอนุญาต • ดูแลระบบและความปลอดภัยโดย LynnBot
          </div>
        </div>

        <div className="public-footer-right">
          <button
            type="button"
            className="public-scroll-top-btn"
            onClick={scrollToTop}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
            <span>กลับสู่ด้านบน</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
