import { type UserRole } from "@lynnbot/database";

/**
 * =========================================================================
 * ROOT OWNER CONFIGURATION (เจ้าของสูงสุดของระบบ)
 * =========================================================================
 * กำหนด Discord ID ของเจ้าของสูงสุดเพียงผู้เดียว
 * - สิทธิ์ในระบบ: OWNER
 * - Owner คนอื่นไม่สามารถลบ หรือแก้ไข/ลดสิทธิ์เจ้าของสูงสุดได้
 * - การแก้ไขหรือเปลี่ยน Discord ID จะต้องเข้ามาแก้ในไฟล์นี้หรือ packages/database/index.ts เท่านั้น
 */
export const ROOT_OWNER_DISCORD_ID = "1078869442609561691";

/**
 * ฟังก์ชันตรวจสอบว่าเป็นเจ้าของสูงสุด (Root Owner) หรือไม่
 */
export function isRootOwner(discordId?: string | null): boolean {
  if (!discordId) return false;
  return discordId === ROOT_OWNER_DISCORD_ID;
}

// Format date to Thai locale
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format time
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format datetime
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// Format relative time
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "เมื่อสักครู่";
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return formatDate(date);
}

// Format duration in minutes to readable string
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} ชั่วโมง`;
  return `${hours} ชม. ${mins} น.`;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH").format(amount);
}

// Get role display info
export function getRoleInfo(role: UserRole | string): {
  label: string;
  color: string;
  className: string;
} {
  const roles: Record<string, { label: string; color: string; className: string }> = {
    OWNER: { label: "Owner", color: "#fbbf24", className: "owner" },
    MANAGER: { label: "Manager", color: "#a78bfa", className: "manager" },
    SUPERADMIN: { label: "Super Admin", color: "#a78bfa", className: "manager" },
    ADMIN: { label: "Admin", color: "#60a5fa", className: "admin" },
    MODERATOR: { label: "Moderator", color: "#34d399", className: "moderator" },
    STAFF: { label: "Staff", color: "#34d399", className: "moderator" },
    MEMBER: { label: "Member", color: "#9ca3af", className: "member" },
  };
  return roles[role] || { label: String(role || "Member"), color: "#9ca3af", className: "member" };
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Check permission hierarchy
export function hasPermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  const hierarchy: Record<UserRole, number> = {
    OWNER: 4,
    MANAGER: 3,
    ADMIN: 2,
    MODERATOR: 1,
    MEMBER: 0,
  };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

// Generate random color from string (for avatars)
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

// Truncate text
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

// Resolve Discord Avatar URL (handles full URLs, hashes, and default avatar fallbacks)
export function getDiscordAvatarUrl(
  discordId?: string | null,
  avatar?: string | null
): string {
  if (!avatar) {
    if (discordId) {
      try {
        const defaultIndex = Number((BigInt(discordId) >> BigInt(22)) % BigInt(6));
        return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
      } catch {
        return "https://cdn.discordapp.com/embed/avatars/0.png";
      }
    }
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

  if (discordId) {
    const ext = avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=128`;
  }

  return "https://cdn.discordapp.com/embed/avatars/0.png";
}

