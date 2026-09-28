import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary, #000000)",
        color: "var(--text-primary, #f5f5f7)",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <h1
        style={{
          fontSize: "4rem",
          fontWeight: 700,
          margin: 0,
          color: "var(--accent, #2997ff)",
        }}
      >
        404
      </h1>
      <h2 style={{ fontSize: "1.25rem", margin: "12px 0 24px", color: "var(--text-secondary, #a1a1a6)" }}>
        ไม่พบหน้าที่คุณต้องการ (Page Not Found)
      </h2>
      <Link
        href="/"
        className="btn btn-primary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 20px",
          borderRadius: "8px",
          background: "var(--accent, #2997ff)",
          color: "#fff",
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        กลับสู่หน้าหลัก
      </Link>
    </div>
  );
}
