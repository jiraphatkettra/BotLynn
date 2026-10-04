export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      channelId,
      title,
      message,
      color,
      bannerUrl,
      rulesChannelId,
      showFields,
      showAuthor,
      authorText,
    } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: "กรุณาระบุห้องสำหรับส่งข้อความต้อนรับ (Channel ID)" },
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

    const user = session.user as any;
    const authorDiscordId = user?.discordId || "1234567890";
    const authorName = user?.displayName || user?.name || "Member";
    const serverName = "753 BC Community";

    // Format template variables
    const rulesText = rulesChannelId ? `<#${rulesChannelId}>` : "ห้องกฎระเบียบ";
    const rawMsg =
      message ||
      `ยินดีต้อนรับคุณ {user} สู่ครอบครัว **{server}** อย่างเป็นทางการครับ! 🎉\n\n` +
      `ขอให้เพลิดเพลินกับการพูดคุย แลกเปลี่ยน และร่วมกิจกรรมในเซิร์ฟเวอร์นะครับ\n` +
      `• อย่าลืมแวะอ่านข้อตกลงและกฎระเบียบได้ที่ห้อง {rules}\n` +
      `• หากพบปัญหาหรือต้องการความช่วยเหลือ สามารถเปิดทิกเก็ตติดต่อทีมงานได้ตลอด 24 ชม.`;

    const formattedDesc = rawMsg
      .replace(/\{user\}/g, `<@${authorDiscordId}>`)
      .replace(/\{username\}/g, authorName)
      .replace(/\{name\}/g, authorName)
      .replace(/\{server\}/g, serverName)
      .replace(/\{count\}/g, "60")
      .replace(/\{rules\}/g, rulesText);

    let colorNum = 0x2997ff; // Apple Blue default
    if (color) {
      const cleanHex = color.replace("#", "").trim();
      const parsed = parseInt(cleanHex, 16);
      if (!isNaN(parsed)) colorNum = parsed;
    }

    const avatarUrl = user?.image || "https://cdn.discordapp.com/embed/avatars/0.png";

    const embedFields: any[] = [];
    if (showFields === true || showFields === "true") {
      embedFields.push(
        {
          name: "👤 ข้อมูลสมาชิก",
          value: `<@${authorDiscordId}>\n\`${authorName}\``,
          inline: true,
        },
        {
          name: "👥 ลำดับสมาชิก",
          value: `คนที่ **#60**\nในเซิร์ฟเวอร์`,
          inline: true,
        },
        {
          name: "📅 สร้างบัญชีเมื่อ",
          value: `<t:${Math.floor(Date.now() / 1000)}:D>\n(จำลอง)`,
          inline: true,
        }
      );
    }

    if (rulesChannelId) {
      embedFields.push({
        name: "📜 เริ่มต้นใช้งาน",
        value: `อ่านกฎระเบียบก่อนเริ่มคุย: <#${rulesChannelId}>`,
        inline: false,
      });
    }

    const embed: any = {
      color: colorNum,
      description: formattedDesc,
      thumbnail: {
        url: avatarUrl,
      },
      fields: embedFields,
      footer: {
        text: `${serverName} • LynnBot Welcome System (Dashboard Test)`,
      },
      timestamp: new Date().toISOString(),
    };

    if (showAuthor !== false && showAuthor !== "false") {
      const rawAuthor = authorText || `${authorName} เข้าร่วมเซิร์ฟเวอร์ ✨`;
      embed.author = {
        name: rawAuthor
          .replace(/\{user\}/g, `<@${authorDiscordId}>`)
          .replace(/\{name\}/g, authorName)
          .replace(/\{username\}/g, authorName)
          .replace(/\{server\}/g, serverName),
        icon_url: avatarUrl,
      };
    }

    if (title && title.trim()) {
      const formattedTitle = title.trim()
        .replace(/\{server\}/g, serverName)
        .replace(/\{user\}/g, authorName);
      embed.title = formattedTitle;
    }

    if (bannerUrl && bannerUrl.startsWith("http")) {
      embed.image = { url: bannerUrl };
    }

    const components: any[] = [];
    if (rulesChannelId) {
      components.push({
        type: 1, // ActionRow
        components: [
          {
            type: 2, // Button
            style: 5, // Link Button
            label: "📖 กฎระเบียบเซิร์ฟเวอร์",
            url: `https://discord.com/channels/${process.env.DISCORD_GUILD_ID || "guild"}/${rulesChannelId}`,
          },
        ],
      });
    }

    const payload: any = {
      content: `<@${authorDiscordId}>`,
      embeds: [embed],
    };
    if (components.length > 0) {
      payload.components = components;
    }

    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

    return NextResponse.json({
      success: true,
      message: "ส่งข้อความต้อนรับทดสอบเข้า Discord สำเร็จแล้ว!",
    });
  } catch (error: any) {
    console.error("Error sending welcome test:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการส่งข้อความทดสอบ" },
      { status: 500 }
    );
  }
}
