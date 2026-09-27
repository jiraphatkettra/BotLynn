import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backup = await prisma.roleBackup.findUnique({
      where: { id: params.id },
    });

    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    const token = process.env.DISCORD_TOKEN;
    const guildId = backup.guildId;

    if (!token) {
      return NextResponse.json(
        { error: "Discord token not configured" },
        { status: 500 }
      );
    }

    // 1. Fetch current roles
    const curRolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        headers: { Authorization: `Bot ${token}` },
      }
    );

    if (!curRolesRes.ok) {
      throw new Error("Failed to fetch current roles from Discord");
    }

    const curRoles = await curRolesRes.json();
    const curRoleMap = new Map<string, any>(curRoles.map((r: any) => [r.id, r]));
    const curRoleNameMap = new Map<string, any>(
      curRoles.map((r: any) => [r.name.toLowerCase(), r])
    );

    const rolesData = backup.rolesData as any[];
    const membersData = backup.membersData as Record<string, string[]>;

    const roleIdMap: Record<string, string> = {};
    let rolesRecreated = 0;

    for (const r of rolesData) {
      if (curRoleMap.has(r.id)) {
        roleIdMap[r.id] = r.id;
      } else if (curRoleNameMap.has(r.name.toLowerCase())) {
        roleIdMap[r.id] = curRoleNameMap.get(r.name.toLowerCase()).id;
      } else {
        // Recreate role
        try {
          const createRes = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/roles`,
            {
              method: "POST",
              headers: {
                Authorization: `Bot ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: r.name,
                color: r.color,
                hoist: r.hoist,
                permissions: r.permissions,
                mentionable: r.mentionable,
              }),
            }
          );
          if (createRes.ok) {
            const newRole = await createRes.json();
            roleIdMap[r.id] = newRole.id;
            rolesRecreated++;
          }
        } catch (e) {
          console.warn("Could not create role:", r.name, e);
        }
      }
    }

    // 2. Reassign roles to members
    let membersRestored = 0;
    for (const [memberId, roleIds] of Object.entries(membersData)) {
      const validRoleIds = roleIds
        .map((oldId) => roleIdMap[oldId])
        .filter(Boolean);

      for (const roleId of validRoleIds) {
        try {
          await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bot ${token}`,
                "X-Audit-Log-Reason": `กู้คืนยศจากจุดสำรอง ${backup.name}`,
              },
            }
          );
        } catch (e) {
          // Continue
        }
      }
      membersRestored++;
    }

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "BACKUP_ROLES_RESTORED",
        category: "BACKUP",
        details: `กู้คืนยศจากจุดสำรอง: ${backup.name} (สร้างยศใหม่ ${rolesRecreated}, กู้คืนสมาชิก ${membersRestored} คน)`,
      },
    });

    return NextResponse.json({
      success: true,
      backupName: backup.name,
      rolesRecreated,
      membersRestored,
    });
  } catch (error: any) {
    console.error("POST restore backup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to restore backup" },
      { status: 500 }
    );
  }
}
