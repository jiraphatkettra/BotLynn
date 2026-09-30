import React from "react";

export default function DashboardLoading() {
  return (
    <div className="dashboard-loading-container">
      {/* Sub-Header Skeleton */}
      <div className="page-header-container">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="skeleton-bar" style={{ width: "70px", height: "14px" }} />
            <div style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "12px" }}>/</div>
            <div className="skeleton-bar" style={{ width: "110px", height: "14px" }} />
          </div>
          <div className="skeleton-bar" style={{ width: "240px", height: "28px", borderRadius: "8px" }} />
          <div className="skeleton-bar" style={{ width: "320px", height: "14px", opacity: 0.6 }} />
        </div>
      </div>

      {/* Page Content Skeleton */}
      <div className="page-content" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* 4 Bento Metric Cards Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                minHeight: "100px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton-bar" style={{ width: "90px", height: "14px" }} />
                <div className="skeleton-circle" style={{ width: "24px", height: "24px" }} />
              </div>
              <div className="skeleton-bar" style={{ width: "110px", height: "28px" }} />
            </div>
          ))}
        </div>

        {/* Main Content Skeleton (Table or Grid) */}
        <div
          className="skeleton-card"
          style={{
            minHeight: "340px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="skeleton-bar" style={{ width: "220px", height: "36px", borderRadius: "10px" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <div className="skeleton-bar" style={{ width: "100px", height: "36px", borderRadius: "10px" }} />
              <div className="skeleton-bar" style={{ width: "120px", height: "36px", borderRadius: "10px" }} />
            </div>
          </div>

          {/* Fake rows */}
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="skeleton-circle" style={{ width: "36px", height: "36px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div className="skeleton-bar" style={{ width: "160px", height: "14px" }} />
                  <div className="skeleton-bar" style={{ width: "100px", height: "10px", opacity: 0.5 }} />
                </div>
              </div>
              <div className="skeleton-bar" style={{ width: "90px", height: "14px" }} />
              <div className="skeleton-bar" style={{ width: "70px", height: "22px", borderRadius: "12px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
