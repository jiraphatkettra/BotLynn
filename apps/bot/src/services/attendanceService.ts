import { type Client } from "discord.js";
import { prisma } from "@lynnbot/database";

export async function checkAutoClockOut(client?: Client) {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "auto_clockout_hours" },
    });
    const maxHours = parseInt(setting?.value || "12", 10);
    const thresholdDate = new Date(Date.now() - maxHours * 60 * 60 * 1000);

    // Find all unclosed attendances older than maxHours
    const expiredAttendances = await prisma.attendance.findMany({
      where: {
        clockOut: null,
        clockIn: { lte: thresholdDate },
      },
      include: {
        user: true,
      },
    });

    if (expiredAttendances.length === 0) return;

    console.log(`⏰ [Auto Clock-out] Found ${expiredAttendances.length} expired session(s)`);

    for (const att of expiredAttendances) {
      // Auto close with standard 8-hour shift or capped at maxHours
      const autoOutTime = new Date(att.clockIn.getTime() + 8 * 60 * 60 * 1000);
      const durationMins = Math.floor(
        (autoOutTime.getTime() - att.clockIn.getTime()) / 60000
      );

      await prisma.attendance.update({
        where: { id: att.id },
        data: {
          clockOut: autoOutTime,
          duration: durationMins,
          note: "[ระบบตัดเวลาออกงานอัตโนมัติ (ลืมตอกบัตรออก)]",
        },
      });

      // Try sending a friendly DM to the user if client is available
      if (client && att.user.discordId) {
        try {
          const discordUser = await client.users.fetch(att.user.discordId);
          if (discordUser) {
            await discordUser.send({
              content: `⏰ **แจ้งเตือนการตอกบัตร LynnBot**\nระบบได้ทำการบันทึกเวลาออกงานให้อัตโนมัติ (เนื่องจากพบว่าตอกบัตรเข้าเกิน ${maxHours} ชั่วโมง และไม่ได้ใช้คำสั่ง \`/clockout\`)\n• วันที่เข้างาน: ${att.clockIn.toLocaleDateString("th-TH")}\n• เวลาเข้างาน: ${att.clockIn.toLocaleTimeString("th-TH")}\n• เวลาออกงานอัตโนมัติ: ${autoOutTime.toLocaleTimeString("th-TH")}`,
            });
          }
        } catch (dmErr) {
          // User might have DMs closed
        }
      }
    }
  } catch (error) {
    console.error("❌ Error in checkAutoClockOut:", error);
  }
}
