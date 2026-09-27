export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะ SuperAdmin (OWNER) เท่านั้นที่สามารถทดสอบส่งข้อความได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: "กรุณาระบุ Channel ID ที่ต้องการส่งข้อความทดสอบ" },
        { status: 400 }
      );
    }

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "DISCORD_TOKEN ไม่ถูกต้องหรือไม่ได้ตั้งค่า" },
        { status: 500 }
      );
    }

    // Send an Apple-style minimal test notification embed
    const embed = {
      title: "🔔 ทดสอบระบบการแจ้งเตือนจาก LynnBot Dashboard",
      description:
        "ระบบเชื่อมต่อกับช่องแจ้งเตือนนี้สำเร็จเรียบร้อยแล้ว!\nเมื่อมีสมาชิกสั่งซื้อยศผ่านคำสั่ง `/buy` ใน Discord บอทจะส่งใบเสร็จและประกาศมาที่ห้องนี้โดยอัตโนมัติ",
      color: 0x2997ff, // Apple Blue
      fields: [
        {
          name: "ผู้ส่งการทดสอบ",
          value: `<@${(session?.user as any)?.discordId || "Admin"}> (SuperAdmin)`,
          inline: true,
        },
        {
          name: "สถานะระบบ",
          value: "🟢 ออนไลน์ พร้อมใช้งาน",
          inline: true,
        },
      ],
      footer: {
        text: "LynnBot System • Apple Pro Dark Dashboard",
      },
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ embeds: [embed] }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errData.message ||
            "บอทไม่สามารถส่งข้อความเข้าห้องนี้ได้ กรุณาตรวจสอบสิทธิ์ของบอทในห้องดังกล่าว",
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, message: "ส่งข้อความทดสอบสำเร็จแล้ว!" });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการส่งข้อความทดสอบ" },
      { status: 500 }
    );
  }
}
