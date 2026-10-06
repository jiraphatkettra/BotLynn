export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    // Member search endpoint for live typing / auto-complete
    if (search !== null) {
      const query = search.trim();
      if (query.length < 2) {
        return NextResponse.json({ members: [] });
      }
      const token = process.env.DISCORD_TOKEN;
      const guildId = process.env.DISCORD_GUILD_ID;

      const resultsMap = new Map<string, {
        id: string;
        name: string;
        username: string;
        avatarUrl: string;
      }>();

      const getAvatarUrl = (userId: string, userAvatar?: string | null, memberAvatar?: string | null) => {
        if (guildId && memberAvatar) {
          return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${memberAvatar}.png?size=64`;
        }
        if (userAvatar) {
          return `https://cdn.discordapp.com/avatars/${userId}/${userAvatar}.png?size=64`;
        }
        try {
          const index = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
          return `https://cdn.discordapp.com/embed/avatars/${Math.abs(index) % 6}.png`;
        } catch {
          return "https://cdn.discordapp.com/embed/avatars/0.png";
        }
      };

      // 1. Direct Discord ID match if 17-20 digits
      const isIdMatch = /^\d{17,20}$/.test(query);
      if (isIdMatch && token) {
        try {
          if (guildId) {
            const mRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${query}`, {
              headers: { Authorization: `Bot ${token}` },
            });
            if (mRes.ok) {
              const m = await mRes.json();
              if (m.user) {
                resultsMap.set(m.user.id, {
                  id: m.user.id,
                  name: m.nick || m.user.global_name || m.user.username,
                  username: m.user.username,
                  avatarUrl: getAvatarUrl(m.user.id, m.user.avatar, m.avatar),
                });
              }
            }
          }
          if (!resultsMap.has(query)) {
            const uRes = await fetch(`https://discord.com/api/v10/users/${query}`, {
              headers: { Authorization: `Bot ${token}` },
            });
            if (uRes.ok) {
              const u = await uRes.json();
              resultsMap.set(u.id, {
                id: u.id,
                name: u.global_name || u.username,
                username: u.username,
                avatarUrl: getAvatarUrl(u.id, u.avatar),
              });
            }
          }
        } catch (e) {
          console.error("Error fetching direct Discord user by ID:", e);
        }
      }

      // 2. Search Guild members via Discord API
      if (token && guildId) {
        try {
          const endpoint = query.length > 0
            ? `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=15`
            : `https://discord.com/api/v10/guilds/${guildId}/members?limit=15`;
          const dRes = await fetch(endpoint, {
            headers: { Authorization: `Bot ${token}` },
          });
          if (dRes.ok) {
            const members = await dRes.json();
            if (Array.isArray(members)) {
              for (const m of members) {
                if (m.user && !resultsMap.has(m.user.id)) {
                  resultsMap.set(m.user.id, {
                    id: m.user.id,
                    name: m.nick || m.user.global_name || m.user.username,
                    username: m.user.username,
                    avatarUrl: getAvatarUrl(m.user.id, m.user.avatar, m.avatar),
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error("Error searching Discord guild members:", e);
        }
      }

      // 3. Search local Database users
      try {
        const dbUsers = await prisma.user.findMany({
          where: query
            ? {
                OR: [
                  { username: { contains: query, mode: "insensitive" } },
                  { displayName: { contains: query, mode: "insensitive" } },
                  { discordId: { contains: query } },
                ],
              }
            : undefined,
          take: 10,
        });

        for (const u of dbUsers) {
          if (!resultsMap.has(u.discordId)) {
            resultsMap.set(u.discordId, {
              id: u.discordId,
              name: u.displayName || u.username,
              username: u.username,
              avatarUrl: getAvatarUrl(u.discordId, u.avatar),
            });
          }
        }
      } catch (e) {
        console.error("Error searching DB users:", e);
      }

      // 4. Past warnings to include past penalized members
      if (query && resultsMap.size < 10) {
        try {
          const pastWarns = await prisma.warning.findMany({
            where: {
              OR: [
                { discordName: { contains: query, mode: "insensitive" } },
                { discordId: { contains: query } },
              ],
            },
            take: 5,
            select: { discordId: true, discordName: true },
          });
          for (const w of pastWarns) {
            if (!resultsMap.has(w.discordId)) {
              resultsMap.set(w.discordId, {
                id: w.discordId,
                name: w.discordName,
                username: w.discordName,
                avatarUrl: getAvatarUrl(w.discordId),
              });
            }
          }
        } catch {}
      }

      return NextResponse.json({
        members: Array.from(resultsMap.values()),
      });
    }

    const severity = searchParams.get("severity");

    const warnings = await prisma.warning.findMany({
      where: severity && severity !== "ALL" ? { severity } : {},
      orderBy: { createdAt: "desc" },
    });

    const totalActive = warnings.filter((w) => w.isActive).length;

    return NextResponse.json({
      warnings,
      totalActive,
      totalCount: warnings.length,
    });
  } catch (error: any) {
    console.error("Error in GET /api/moderation:", error);
    return NextResponse.json({ error: error.message || "Failed to load warnings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { discordId, discordName, reason, severity, action, customIssuer } = body;

    if (!discordId || !reason) {
      return NextResponse.json(
        { error: "กรุณาระบุไอดีสมาชิก (Discord ID) และเหตุผลในการลงโทษ" },
        { status: 400 }
      );
    }

    // Clean Discord ID
    const idMatch = String(discordId).match(/\d{17,20}/);
    if (!idMatch) {
      return NextResponse.json(
        { error: "รูปแบบ Discord ID ไม่ถูกต้อง กรุณาระบุเลขไอดี 17-20 หลัก" },
        { status: 400 }
      );
    }
    const cleanId = idMatch[0];

    const cleanSeverity = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)
      ? severity
      : "LOW";

    const sessionUser = session.user as any;
    const issuedById = sessionUser?.discordId || sessionUser?.id || "web-admin";
    const issuedBy = customIssuer?.trim() || sessionUser?.displayName || sessionUser?.name || "Web Admin";

    let finalDiscordName = discordName ? String(discordName).trim() : "";

    // 1. Fetch live user details from Discord API if available
    const token = process.env.DISCORD_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (token && (!finalDiscordName || finalDiscordName.startsWith("User-"))) {
      try {
        const uRes = await fetch(`https://discord.com/api/v10/users/${cleanId}`, {
          headers: { Authorization: `Bot ${token}` },
        });
        if (uRes.ok) {
          const uData = await uRes.json();
          finalDiscordName = uData.global_name || uData.username || `User-${cleanId}`;
        }
      } catch {}
    }
    if (!finalDiscordName) finalDiscordName = `User-${cleanId}`;

    // 2. Perform Discord Action (Timeout or Kick) if requested
    let actionResultNote = "ไม่มี";
    if (token && guildId && action && action !== "WARN") {
      try {
        if (action === "TIMEOUT_10M" || action === "TIMEOUT_1H" || action === "TIMEOUT_1D") {
          const minutes = action === "TIMEOUT_10M" ? 10 : action === "TIMEOUT_1H" ? 60 : 1440;
          const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
          const patchRes = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${cleanId}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bot ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ communication_disabled_until: until }),
            }
          );
          if (patchRes.ok) {
            actionResultNote = `ปิดปากสำเร็จ (${minutes < 60 ? `${minutes} นาที` : minutes === 60 ? "1 ชั่วโมง" : "24 ชั่วโมง"})`;
          }
        } else if (action === "KICK") {
          const kickRes = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${cleanId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bot ${token}` },
            }
          );
          if (kickRes.ok) {
            actionResultNote = "เตะออกจากเซิร์ฟเวอร์สำเร็จ";
          }
        }
      } catch (actErr: any) {
        console.warn("Could not execute Discord action from web:", actErr.message);
      }
    }

    // 3. Save Warning to Database
    const warning = await prisma.warning.create({
      data: {
        discordId: cleanId,
        discordName: finalDiscordName,
        issuedById,
        issuedBy,
        reason: String(reason).trim(),
        severity: cleanSeverity,
        isActive: true,
      },
    });

    // 4. Try sending DM notification to user
    if (token) {
      try {
        const dmChannelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient_id: cleanId }),
        });
        if (dmChannelRes.ok) {
          const dmChan = await dmChannelRes.json();
          await fetch(`https://discord.com/api/v10/channels/${dmChan.id}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bot ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              embeds: [
                {
                  title: "⚠️ DISCIPLINARY NOTICE • แจ้งเตือนการกระทำผิด",
                  description:
                    `คุณได้รับการตักเตือนในเซิร์ฟเวอร์\n\n` +
                    `• **สาเหตุ / ความผิด:** ${reason}\n` +
                    `• **ระดับความรุนแรง:** \`${cleanSeverity}\`\n` +
                    `• **ผู้บันทึก:** **${issuedBy}**\n` +
                    (actionResultNote !== "ไม่มี" ? `• **มาตรการที่ใช้:** **${actionResultNote}**\n\n` : "\n") +
                    `> *โปรดปฏิบัติตามกฎระเบียบของเซิร์ฟเวอร์เพื่อความสงบเรียบร้อยของคอมมูนิตี้*`,
                  color: cleanSeverity === "CRITICAL" ? 0xff453a : cleanSeverity === "HIGH" ? 0xff6b00 : cleanSeverity === "MEDIUM" ? 0xff9f0a : 0x2997ff,
                  footer: { text: `Warning ID: ${warning.id}` },
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          });
        }
      } catch {}
    }

    // 5. Send Server Announcement if moderation_notify_channel is configured
    if (token) {
      try {
        const notifySetting = await prisma.setting.findUnique({
          where: { key: "moderation_notify_channel" },
        });
        if (notifySetting?.value) {
          const sevColor =
            cleanSeverity === "CRITICAL"
              ? 0xff453a
              : cleanSeverity === "HIGH"
              ? 0xff6b00
              : cleanSeverity === "MEDIUM"
              ? 0xff9f0a
              : 0x2997ff;

          await fetch(`https://discord.com/api/v10/channels/${notifySetting.value}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bot ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              embeds: [
                {
                  title: "⚖️  PUNISHMENT LOGGED • บันทึกการลงโทษสมาชิก",
                  description:
                    `ดำเนินการบันทึกการกระทำผิดและบทลงโทษเรียบร้อยแล้ว\n\n` +
                    `👤 **สมาชิกที่ถูกลงโทษ:** <@${cleanId}> (\`${finalDiscordName}\`)\n` +
                    `📝 **สาเหตุ / ความผิด:** ${reason}\n` +
                    `⚡ **ระดับความรุนแรง:** \`${cleanSeverity}\`\n` +
                    `🛡️ **ผู้ลงโทษ (Moderator):** **${issuedBy}**\n` +
                    `🔨 **มาตรการที่ใช้:** **${actionResultNote}**\n\n` +
                    `-# ดำเนินการผ่านระบบ LynnBot Moderation Dashboard`,
                  color: sevColor,
                  footer: { text: `Warning ID: ${warning.id} • LynnBot Security` },
                  timestamp: new Date().toISOString(),
                },
              ],
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 5,
                      label: "เปิดหน้ารายงานบนเว็บ • Web Dashboard",
                      emoji: { name: "🌐" },
                      url:
                        process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
                          ? `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/moderation`
                          : "https://bot-lynn-web-g3sg.vercel.app/moderation",
                    },
                  ],
                },
              ],
            }),
          });
        }
      } catch (notifyErr: any) {
        console.warn("Could not send warning announcement to Discord channel:", notifyErr.message);
      }
    }

    // 6. Audit Log
    if (sessionUser?.id) {
      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: "WARN_CREATE",
          category: "MODERATION",
          details: `ออกใบเตือนสมาชิก ${finalDiscordName} (${cleanId}) โดย ${issuedBy} สาเหตุ: ${reason} [${cleanSeverity}]`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, warning, actionResult: actionResultNote });
  } catch (error: any) {
    console.error("Error in POST /api/moderation:", error);
    return NextResponse.json({ error: error.message || "Failed to create warning" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Warning ID required" }, { status: 400 });
    }

    const updated = await prisma.warning.update({
      where: { id },
      data: { isActive },
    });

    if (session.user) {
      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "WARN_STATUS_UPDATE",
          category: "MODERATION",
          details: `อัปเดตสถานะใบเตือน #${id} เป็น ${isActive ? "กำลังมีผล (ACTIVE)" : "ยกเลิกแล้ว (INACTIVE)"}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, warning: updated });
  } catch (error: any) {
    console.error("Error in PUT /api/moderation:", error);
    return NextResponse.json({ error: error.message || "Failed to update warning" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const existing = await prisma.warning.findUnique({ where: { id } });

    await prisma.warning.delete({
      where: { id },
    });

    if (session.user) {
      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "WARN_DELETE",
          category: "MODERATION",
          details: `ลบใบเตือน #${id} ของ ${existing?.discordName || existing?.discordId || id}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/moderation:", error);
    return NextResponse.json({ error: error.message || "Failed to delete warning" }, { status: 500 });
  }
}
