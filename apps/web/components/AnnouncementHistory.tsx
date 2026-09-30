"use client";

import React, { useEffect, useState } from "react";
import { formatDateTime, formatRelativeTime, getDiscordAvatarUrl } from "@/lib/utils";

interface AnnouncementHistoryItem {
  id: string;
  action: string;
  details: string | null;
  metadata: {
    title?: string;
    description?: string;
    channelId?: string;
    channelName?: string;
    mention?: string;
    mentionRoles?: string[];
    customMention?: string;
    color?: string;
    messageId?: string;
  } | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    discordId: string;
  } | null;
}

export default function AnnouncementHistory() {
  const [history, setHistory] = useState<AnnouncementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await fetch("/api/announcements/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch announcement history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="card" id="announcement-history-card" style={{ marginTop: "24px" }}>
      <div
        className="card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h3 className="card-title">
          <span className="card-title-icon">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          ประวัติการส่งประกาศล่าสุด
        </h3>

        <button
          type="button"
          onClick={() => fetchHistory(true)}
          disabled={loading || refreshing}
          className="btn btn-secondary"
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            cursor: loading || refreshing ? "not-allowed" : "pointer",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          {refreshing ? "กำลังรีเฟรช..." : "รีเฟรชประวัติ"}
        </button>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "36px", textAlign: "center", color: "#86868b" }}>
            กำลังโหลดประวัติประกาศ...
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📢</div>
            <p className="empty-state-title">ยังไม่มีประวัติการส่งประกาศ</p>
            <p className="empty-state-text">
              เมื่อส่งประกาศลงห้อง Discord แล้ว ประวัติและรายละเอียดจะแสดงที่นี่
            </p>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "180px" }}>เวลาที่ส่ง</th>
                  <th>หัวข้อประกาศ</th>
                  <th>ห้อง Discord</th>
                  <th>แท็กแจ้งเตือน</th>
                  <th>ผู้ส่งประกาศ</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const meta = item.metadata || {};
                  const title = meta.title || item.details?.replace(/ส่งประกาศหัวข้อ "(.*?)" .*/, "$1") || "ประกาศ";
                  const channel = meta.channelName || meta.channelId || "-";
                  const color = meta.color || "#5865F2";

                  let mentionLabel = "ไม่มี";
                  if (meta.mention === "everyone") {
                    mentionLabel = "@everyone";
                  } else if (meta.mention === "here") {
                    mentionLabel = "@here";
                  } else if (meta.mentionRoles && meta.mentionRoles.length > 0) {
                    mentionLabel = `${meta.mentionRoles.length} ยศ`;
                  } else if (meta.customMention) {
                    mentionLabel = meta.customMention;
                  }

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff" }}>
                          {formatRelativeTime(item.createdAt)}
                        </div>
                        <div style={{ fontSize: "11px", color: "#86868b" }}>
                          {formatDateTime(item.createdAt)}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: color,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 600, color: "#ffffff" }}>
                            {title}
                          </span>
                        </div>
                        {meta.description && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#86868b",
                              marginTop: "4px",
                              maxWidth: "340px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {meta.description}
                          </div>
                        )}
                      </td>

                      <td>
                        <span
                          className="badge badge-neutral"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontFamily: "monospace",
                          }}
                        >
                          # {channel.replace(/^#/, "")}
                        </span>
                      </td>

                      <td>
                        {mentionLabel === "ไม่มี" ? (
                          <span style={{ fontSize: "12px", color: "#86868b" }}>
                            ไม่แท็ก
                          </span>
                        ) : (
                          <span
                            className="badge badge-purple"
                            style={{ fontSize: "11px" }}
                          >
                            {mentionLabel}
                          </span>
                        )}
                      </td>

                      <td>
                        {item.user ? (
                          <div className="table-user">
                            <div className="table-avatar">
                              <img
                                src={getDiscordAvatarUrl(
                                  item.user.discordId,
                                  item.user.avatar
                                )}
                                alt={item.user.displayName || item.user.username}
                              />
                            </div>
                            <div>
                              <div className="table-user-name">
                                {item.user.displayName || item.user.username}
                              </div>
                              <div className="table-user-sub">
                                @{item.user.username}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#86868b", fontSize: "12px" }}>
                            ระบบ / ไม่ระบุ
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
