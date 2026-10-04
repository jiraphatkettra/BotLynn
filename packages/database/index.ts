import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  process.env.DATABASE_URL = url;
}

if (process.env.DIRECT_URL) {
  let url = process.env.DIRECT_URL.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  process.env.DIRECT_URL = url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.DEBUG_PRISMA === "true"
        ? ["query", "error", "warn"]
        : ["error"],
  });

globalForPrisma.prisma = prisma;

/**
 * =========================================================================
 * ROOT OWNER CONFIGURATION (เจ้าของสูงสุดของระบบ)
 * =========================================================================
 * กำหนด Discord ID ของเจ้าของสูงสุดเพียงผู้เดียว
 * - สิทธิ์ในระบบ: OWNER
 * - Owner คนอื่นไม่สามารถลบ หรือแก้ไข/ลดสิทธิ์เจ้าของสูงสุดได้
 * - การแก้ไขหรือเปลี่ยน Discord ID จะต้องเข้ามาแก้ในไฟล์นี้เท่านั้น
 */
export const ROOT_OWNER_DISCORD_ID = "1078869442609561691";

/**
 * ฟังก์ชันตรวจสอบว่าเป็นเจ้าของสูงสุด (Root Owner) หรือไม่
 */
export function isRootOwner(discordId?: string | null): boolean {
  if (!discordId) return false;
  return discordId === ROOT_OWNER_DISCORD_ID;
}

export * from "@prisma/client";
export default prisma;

