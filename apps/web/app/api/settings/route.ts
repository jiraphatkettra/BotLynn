export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

// GET - Get all settings
export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ settings: settingsMap, raw: settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST - Update settings (SuperAdmin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "OWNER" && userRole !== "MANAGER" && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบ (ADMIN / OWNER) เท่านั้นที่สามารถเปลี่ยนการตั้งค่าได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body; // object of key-value pairs e.g. { shop_notify_channel: "123..." }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Invalid settings payload" },
        { status: 400 }
      );
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          category: key.startsWith("shop")
            ? "shop"
            : key.startsWith("attendance")
              ? "attendance"
              : key.startsWith("moderation")
                ? "moderation"
                : "general",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: (session?.user as any)?.id,
        action: "อัปเดตการตั้งค่าระบบ",
        category: "SYSTEM",
        details: `SuperAdmin (${(session?.user as any)?.displayName || "Admin"}) บันทึกการตั้งค่าระบบ`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
