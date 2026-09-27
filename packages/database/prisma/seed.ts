import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // Create default settings
  const defaultSettings = [
    {
      key: "server_name",
      value: "LynnBot Server",
      category: "general",
      description: "ชื่อเซิร์ฟเวอร์",
    },
    {
      key: "language",
      value: "th",
      category: "general",
      description: "ภาษาที่ใช้",
    },
    {
      key: "attendance_enabled",
      value: "true",
      category: "attendance",
      description: "เปิด/ปิดระบบตอกบัตร",
    },
    {
      key: "attendance_start_time",
      value: "09:00",
      category: "attendance",
      description: "เวลาเข้างาน",
    },
    {
      key: "attendance_end_time",
      value: "18:00",
      category: "attendance",
      description: "เวลาเลิกงาน",
    },
    {
      key: "attendance_notify",
      value: "true",
      category: "attendance",
      description: "แจ้งเตือนเมื่อตอกบัตร",
    },
    {
      key: "shop_enabled",
      value: "true",
      category: "shop",
      description: "เปิด/ปิดร้านค้ายศ",
    },
    {
      key: "shop_notify",
      value: "true",
      category: "shop",
      description: "แจ้งเตือนเมื่อมีการซื้อ",
    },
    {
      key: "shop_notify_channel",
      value: "",
      category: "shop",
      description: "Channel ID สำหรับแจ้งเตือน",
    },
    {
      key: "bot_session_tracking",
      value: "true",
      category: "bot",
      description: "บันทึก Session ของบอท",
    },
    {
      key: "audit_log_enabled",
      value: "true",
      category: "bot",
      description: "เปิดการบันทึก Audit Log",
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log(`✅ Created ${defaultSettings.length} default settings`);

  // Create sample shop roles
  const sampleRoles = [
    {
      name: "VIP",
      discordRoleId: "REPLACE_WITH_REAL_ROLE_ID_1",
      price: 99,
      description: "สิทธิ์พิเศษสำหรับสมาชิก VIP พร้อมสิทธิ์เข้าถึงห้องพิเศษ",
      color: "#FFD700",
      icon: "⭐",
      category: "premium",
      isActive: false,
      stock: null,
      maxPerUser: 1,
      sortOrder: 1,
    },
    {
      name: "Premium",
      discordRoleId: "REPLACE_WITH_REAL_ROLE_ID_2",
      price: 199,
      description:
        "สมาชิก Premium พร้อมสิทธิ์พิเศษมากมาย",
      color: "#9333EA",
      icon: "💎",
      category: "premium",
      isActive: false,
      stock: 50,
      maxPerUser: 1,
      sortOrder: 2,
    },
    {
      name: "Legendary",
      discordRoleId: "REPLACE_WITH_REAL_ROLE_ID_3",
      price: 499,
      description:
        "ยศที่หายากที่สุด มีจำนวนจำกัด!",
      color: "#EF4444",
      icon: "🔥",
      category: "exclusive",
      isActive: false,
      stock: 10,
      maxPerUser: 1,
      sortOrder: 3,
    },
  ];

  for (const role of sampleRoles) {
    const existing = await prisma.shopRole.findUnique({
      where: { discordRoleId: role.discordRoleId },
    });

    if (!existing) {
      await prisma.shopRole.create({ data: role });
    }
  }

  console.log(`✅ Created ${sampleRoles.length} sample shop roles`);

  // Create system audit log
  await prisma.auditLog.create({
    data: {
      action: "ระบบถูกตั้งค่าเริ่มต้น",
      category: "SYSTEM",
      details: "Database seeded with default settings and sample data",
    },
  });

  console.log("✅ Seed completed!");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
