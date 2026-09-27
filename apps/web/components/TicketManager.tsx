"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

interface Ticket {
  id: string;
  ticketId: string;
  channelId: string;
  creatorId: string;
  creatorName: string;
  subject: string | null;
  status: "OPEN" | "CLAIMED" | "CLOSED";
  claimedById: string | null;
  claimedBy?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  } | null;
  closedAt: string | null;
  closedBy: string | null;
  transcript: string | null;
  createdAt: string;
}

interface TicketStats {
  total: number;
  open: number;
  claimed: number;
  closed: number;
}

export default function TicketManager() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    claimed: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedTranscript, setSelectedTranscript] = useState<Ticket | null>(
    null
  );
  const [closingId, setClosingId] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (filterStatus !== "ALL") query.set("status", filterStatus);
      if (search.trim()) query.set("search", search.trim());

      const res = await fetch(`/api/tickets?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleCloseTicket = async (ticket: Ticket) => {
    if (!confirm(`คุณต้องการปิด ${ticket.ticketId} ใช่หรือไม่?`)) return;

    try {
      setClosingId(ticket.id);
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });

      if (res.ok) {
        await fetchTickets();
      } else {
        alert("ไม่สามารถปิดทิกเก็ตได้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 4-Metric Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(255,255,255,0.05)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-label">ทิกเก็ตทั้งหมด</div>
        </div>

        <div className="stat-card" style={{ borderColor: "rgba(255,149,0,0.2)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(255,149,0,0.1)", color: "#ff9500" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#ff9500" }}>
            {stats.open}
          </div>
          <div className="stat-card-label">รอดำเนินการ (Open)</div>
        </div>

        <div className="stat-card" style={{ borderColor: "rgba(52,199,89,0.2)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(52,199,89,0.1)", color: "#34c759" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#34c759" }}>
            {stats.claimed}
          </div>
          <div className="stat-card-label">กำลังดูแล (Claimed)</div>
        </div>

        <div className="stat-card" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(255,255,255,0.05)", color: "#86868b" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#86868b" }}>
            {stats.closed}
          </div>
          <div className="stat-card-label">ปิดเรียบร้อย (Closed)</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "#080808",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "ทั้งหมด" },
            { id: "OPEN", label: "รอดำเนินการ" },
            { id: "CLAIMED", label: "กำลังดูแล" },
            { id: "CLOSED", label: "ปิดแล้ว" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                border: "1px solid",
                borderColor:
                  filterStatus === tab.id
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.06)",
                background:
                  filterStatus === tab.id ? "#ffffff" : "rgba(255,255,255,0.03)",
                color: filterStatus === tab.id ? "#000000" : "#86868b",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", gap: "8px", minWidth: "min(100%, 240px)", flex: "1 1 240px", maxWidth: "420px" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#86868b"
              strokeWidth="2"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหารหัส หรือชื่อผู้เปิด..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ padding: "8px 14px", fontSize: "13px" }}
          >
            ค้นหา
          </button>
        </form>
      </div>

      {/* Tickets Table */}
      <div className="card" style={{ padding: "0px", overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
            รายการทิกเก็ตทั้งหมด ({tickets.length})
          </h3>
          <span style={{ fontSize: "12px", color: "#86868b" }}>
            จัดการคำขอและตรวจดูบันทึกการสนทนา
          </span>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  รหัสทิกเก็ต
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ผู้เปิด
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  หัวข้อ / ประเภท
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  สถานะ
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ผู้ดูแล
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  วันที่สร้าง
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "right" }}>
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#86868b" }}>
                    กำลังโหลดข้อมูลทิกเก็ต...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#86868b" }}>
                    ไม่พบข้อมูลทิกเก็ตในระบบ
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                      {t.ticketId}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ color: "#ffffff", fontWeight: 500 }}>
                          {t.creatorName}
                        </span>
                        <span style={{ fontSize: "11px", color: "#86868b" }}>
                          ID: {t.creatorId}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "#86868b" }}>
                      {t.subject || "บริการทั่วไป"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {t.status === "OPEN" && (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "rgba(255,149,0,0.12)",
                            color: "#ff9500",
                            border: "1px solid rgba(255,149,0,0.2)",
                          }}
                        >
                          รอดำเนินการ
                        </span>
                      )}
                      {t.status === "CLAIMED" && (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "rgba(52,199,89,0.12)",
                            color: "#34c759",
                            border: "1px solid rgba(52,199,89,0.2)",
                          }}
                        >
                          กำลังดูแล
                        </span>
                      )}
                      {t.status === "CLOSED" && (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 500,
                            background: "rgba(255,255,255,0.05)",
                            color: "#86868b",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          ปิดแล้ว
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "#86868b" }}>
                      {t.claimedBy ? (
                        <span style={{ color: "#ffffff", fontWeight: 500 }}>
                          {t.claimedBy.displayName || t.claimedBy.username}
                        </span>
                      ) : (
                        <span style={{ color: "#48484a" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#86868b" }}>
                      {formatDate(t.createdAt)}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        {t.transcript && (
                          <button
                            onClick={() => setSelectedTranscript(t)}
                            className="btn btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "12px" }}
                          >
                            ดูประวัติแชท
                          </button>
                        )}
                        {t.status !== "CLOSED" && (
                          <button
                            onClick={() => handleCloseTicket(t)}
                            disabled={closingId === t.id}
                            style={{
                              padding: "5px 10px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              background: "rgba(255,59,48,0.1)",
                              color: "#ff453a",
                              border: "1px solid rgba(255,59,48,0.2)",
                              cursor: "pointer",
                            }}
                          >
                            {closingId === t.id ? "กำลังปิด..." : "ปิดทิกเก็ต"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Modal */}
      {selectedTranscript && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedTranscript(null)}
        >
          <div
            style={{
              background: "#0c0c0c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                  บันทึกประวัติการสนทนา • {selectedTranscript.ticketId}
                </h3>
                <span style={{ fontSize: "12px", color: "#86868b" }}>
                  ผู้เปิด: {selectedTranscript.creatorName} ({selectedTranscript.creatorId})
                </span>
              </div>
              <button
                onClick={() => setSelectedTranscript(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#86868b",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body / Chat Transcript */}
            <div
              style={{
                padding: "20px 24px",
                overflowY: "auto",
                flex: 1,
                fontFamily: "monospace",
                fontSize: "13px",
                lineHeight: "1.6",
                background: "rgba(0,0,0,0.5)",
                color: "#e5e5e7",
                whiteSpace: "pre-wrap",
                borderRadius: "0 0 16px 16px",
              }}
            >
              {selectedTranscript.transcript || "ไม่มีข้อความในประวัติ"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
