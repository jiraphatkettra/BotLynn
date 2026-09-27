import Header from "@/components/Header";
import ShopManager from "@/components/ShopManager";
import { prisma } from "@lynnbot/database";
import { formatCurrency, formatRelativeTime, getDiscordAvatarUrl } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getShopData() {
  const [roles, totalSold, totalRevenue, recentTransactions, notifySetting] =
    await Promise.all([
      prisma.shopRole.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { transactions: true } },
        },
      }),
      prisma.transaction.count({ where: { status: "COMPLETED" } }),
      prisma.transaction.aggregate({
        where: { status: "COMPLETED" },
        _sum: { price: true },
      }),
      prisma.transaction.findMany({
        take: 15,
        orderBy: { createdAt: "desc" },
        include: { user: true, role: true },
      }),
      prisma.setting.findUnique({
        where: { key: "shop_notify_channel" },
      }),
    ]);

  return {
    roles,
    totalSold,
    totalRevenue: totalRevenue._sum.price || 0,
    recentTransactions,
    notifyChannel: notifySetting?.value || "",
  };
}

export default async function ShopPage() {
  const [data, session] = await Promise.all([
    getShopData(),
    getServerSession(authOptions),
  ]);

  const isSuperAdmin = (session?.user as any)?.role === "OWNER";

  return (
    <>
      <Header
        title="ร้านค้ายศ"
        subtitle={
          isSuperAdmin
            ? "จัดการยศ, สต๊อก, ราคา และห้องแจ้งเตือนสำหรับบอท (สิทธิ์ SuperAdmin)"
            : "รายการยศและประวัติการสั่งซื้อในระบบ"
        }
      />

      <div className="page-content">
        {/* Interactive Shop Manager Component */}
        <ShopManager
          initialRoles={data.roles}
          isSuperAdmin={isSuperAdmin}
          initialNotifyChannel={data.notifyChannel}
          totalSold={data.totalSold}
          totalRevenue={data.totalRevenue}
        />

        {/* Transaction History */}
        <div className="card" id="shop-transactions-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </span>
              ประวัติการซื้อยศล่าสุด
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.recentTransactions.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ผู้ซื้อ</th>
                      <th>ยศ</th>
                      <th>ราคา</th>
                      <th>สถานะ</th>
                      <th>วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          <div className="table-user">
                            <div className="table-avatar">
                              <img
                                src={getDiscordAvatarUrl(tx.user.discordId, tx.user.avatar)}
                                alt={tx.user.displayName || tx.user.username}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                                }}
                              />
                            </div>
                            <div>
                              <div className="table-user-name">
                                {tx.user.displayName || tx.user.username}
                              </div>
                              <div className="table-user-sub">
                                @{tx.user.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge badge-purple"
                            style={{
                              borderColor: tx.role.color
                                ? `${tx.role.color}40`
                                : undefined,
                              color: tx.role.color || undefined,
                            }}
                          >
                            {tx.role.name}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {formatCurrency(tx.price)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              tx.status === "COMPLETED"
                                ? "badge-success"
                                : tx.status === "REFUNDED"
                                  ? "badge-warning"
                                  : "badge-error"
                            }`}
                          >
                            {tx.status === "COMPLETED"
                              ? "สำเร็จ"
                              : tx.status === "REFUNDED"
                                ? "คืนเงิน"
                                : "ยกเลิก"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {formatRelativeTime(tx.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state-title">ยังไม่มีรายการซื้อยศ</p>
                <p className="empty-state-text">
                  ประวัติจะแสดงเมื่อมีสมาชิกซื้อยศผ่านคำสั่ง /buy
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
