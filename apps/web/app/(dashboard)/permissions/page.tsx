import Header from "@/components/Header";
import { prisma } from "@lynnbot/database";
import { getRoleInfo, getDiscordAvatarUrl } from "@/lib/utils";

const PERMISSION_LIST = [
  { key: "attendance.view", label: "ดูตอกบัตร", category: "ตอกบัตร" },
  { key: "attendance.manage", label: "จัดการตอกบัตร", category: "ตอกบัตร" },
  { key: "shop.view", label: "ดูร้านค้า", category: "ร้านค้า" },
  { key: "shop.manage", label: "จัดการร้านค้า", category: "ร้านค้า" },
  { key: "shop.sell", label: "ขายยศ", category: "ร้านค้า" },
  { key: "admin.view", label: "ดูแอดมิน", category: "แอดมิน" },
  { key: "admin.manage", label: "จัดการแอดมิน", category: "แอดมิน" },
  { key: "admin.permissions", label: "จัดการสิทธิ์", category: "แอดมิน" },
  { key: "logs.view", label: "ดูประวัติ", category: "ระบบ" },
  { key: "bot.manage", label: "จัดการบอท", category: "ระบบ" },
  { key: "settings.manage", label: "จัดการตั้งค่า", category: "ระบบ" },
];

async function getPermissionsData() {
  const [users, permissions] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { role: "asc" },
      select: {
        id: true,
        discordId: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
      },
    }),
    prisma.permission.findMany(),
  ]);

  return { users, permissions };
}

export default async function PermissionsPage() {
  const data = await getPermissionsData();

  // Group permissions by category
  const categories = [...new Set(PERMISSION_LIST.map((p) => p.category))];

  return (
    <>
      <Header
        title="สิทธิ์การใช้งาน"
        subtitle="จัดการสิทธิ์ของแอดมินแต่ละคน"
      />

      <div className="page-content">
        {/* Role Hierarchy Info */}
        <div className="card mb-24" id="role-hierarchy-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">👑</span>
              ลำดับชั้นสิทธิ์
            </h3>
          </div>
          <div className="card-body">
            <div className="flex gap-16" style={{ flexWrap: "wrap" }}>
              {(["OWNER", "MANAGER", "ADMIN", "MODERATOR"] as const).map(
                (role) => {
                  const info = getRoleInfo(role);
                  const count = data.users.filter(
                    (u) => u.role === role
                  ).length;

                  return (
                    <div
                      key={role}
                      className="flex items-center gap-12"
                      style={{
                        padding: "12px 20px",
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "var(--radius-md)",
                        minWidth: "180px",
                      }}
                    >
                      <span className={`role-badge ${info.className}`}>
                        {info.label}
                      </span>
                      <span className="text-muted text-sm">
                        {count} คน
                      </span>
                    </div>
                  );
                }
              )}
            </div>
            <p className="text-sm text-muted mt-16">
              💡 Owner มีสิทธิ์ทุกอย่าง → Manager → Admin → Moderator (สิทธิ์น้อยที่สุด)
            </p>
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="card" id="permission-matrix-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">🔐</span>
              ตารางสิทธิ์
            </h3>
          </div>
          <div className="card-body">
            {data.users.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>แอดมิน</th>
                      <th>ตำแหน่ง</th>
                      {PERMISSION_LIST.map((p) => (
                        <th key={p.key} style={{ textAlign: "center", fontSize: 11 }}>
                          {p.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((user) => {
                      const userPerms = data.permissions.filter(
                        (p) => p.userId === user.id
                      );
                      const roleInfo = getRoleInfo(user.role);
                      const isOwner = user.role === "OWNER";

                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="table-user">
                              <div className="table-avatar">
                                <img
                                  src={getDiscordAvatarUrl(user.discordId, user.avatar)}
                                  alt={user.displayName || user.username}
                                />
                              </div>
                              <div className="table-user-name">
                                {user.displayName || user.username}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge ${roleInfo.className}`}>
                              {roleInfo.label}
                            </span>
                          </td>
                          {PERMISSION_LIST.map((perm) => {
                            const hasIt =
                              isOwner ||
                              userPerms.some(
                                (p) => p.permission === perm.key && p.granted
                              );
                            return (
                              <td
                                key={perm.key}
                                style={{ textAlign: "center" }}
                              >
                                {hasIt ? (
                                  <span style={{ color: "var(--success-400)", fontSize: 18 }}>
                                    ✓
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--text-disabled)", fontSize: 18 }}>
                                    ✗
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🔐</div>
                <p className="empty-state-title">ยังไม่มีข้อมูล</p>
                <p className="empty-state-text">
                  เพิ่มแอดมินเพื่อจัดการสิทธิ์
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
