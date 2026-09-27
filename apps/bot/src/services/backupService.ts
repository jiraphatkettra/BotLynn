import { type Guild } from "discord.js";
import { prisma } from "@lynnbot/database";

export interface StoredRoleData {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
}

export async function createGuildRoleBackup(guild: Guild, creatorName = "SYSTEM") {
  // Fetch fresh roles & members
  const roles = await guild.roles.fetch();
  const members = await guild.members.fetch();

  const rolesData: StoredRoleData[] = roles
    .filter((r) => r.id !== guild.id && !r.managed)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      position: r.position,
      permissions: r.permissions.bitfield.toString(),
      mentionable: r.mentionable,
    }));

  const membersData: Record<string, string[]> = {};
  members.forEach((m) => {
    const userRoles = m.roles.cache
      .filter((r) => r.id !== guild.id && !r.managed)
      .map((r) => r.id);

    if (userRoles.length > 0) {
      membersData[m.id] = userRoles;
    }
  });

  const now = new Date();
  const timeStr = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("th-TH");

  const backup = await prisma.roleBackup.create({
    data: {
      name: `จุดสำรอง ${dateStr} เวลา ${timeStr}`,
      guildId: guild.id,
      totalRoles: rolesData.length,
      totalMembers: Object.keys(membersData).length,
      rolesData: rolesData as any,
      membersData: membersData as any,
      createdBy: creatorName,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "BACKUP_ROLES_CREATED",
      category: "BACKUP",
      details: `สร้างจุดสำรองยศ: ${backup.name} (${rolesData.length} ยศ, ${Object.keys(membersData).length} สมาชิก)`,
    },
  });

  return backup;
}

export async function restoreGuildRoleBackup(guild: Guild, backupId: string) {
  const backup = await prisma.roleBackup.findUnique({
    where: { id: backupId },
  });

  if (!backup) {
    throw new Error("ไม่พบจุดสำรองข้อมูลที่ระบุ");
  }

  const rolesData = backup.rolesData as unknown as StoredRoleData[];
  const membersData = backup.membersData as Record<string, string[]>;

  const currentRoles = await guild.roles.fetch();
  const roleIdMap: Record<string, string> = {}; // oldId -> currentOrNewId

  let rolesRecreated = 0;

  // 1. Verify all roles exist, or recreate them
  for (const r of rolesData) {
    let existingRole = currentRoles.get(r.id);
    if (!existingRole) {
      // Find by exact name if id changed
      existingRole = currentRoles.find(
        (cur) => cur.name.toLowerCase() === r.name.toLowerCase() && !cur.managed
      );
    }

    if (existingRole) {
      roleIdMap[r.id] = existingRole.id;
    } else {
      try {
        const newRole = await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          permissions: BigInt(r.permissions),
          mentionable: r.mentionable,
          reason: `กู้คืนยศจากจุดสำรอง: ${backup.name}`,
        });
        roleIdMap[r.id] = newRole.id;
        rolesRecreated++;
      } catch (err) {
        console.warn(`Could not recreate role ${r.name}:`, err);
      }
    }
  }

  // 2. Re-assign roles to members
  const members = await guild.members.fetch();
  let membersRestored = 0;

  for (const [memberId, roleIds] of Object.entries(membersData)) {
    const member = members.get(memberId);
    if (!member) continue;

    const targetRoleIds = roleIds
      .map((oldId) => roleIdMap[oldId])
      .filter((id): id is string => Boolean(id));

    if (targetRoleIds.length === 0) continue;

    try {
      const currentMemberRoleIds = new Set(member.roles.cache.keys());
      const rolesToAdd = targetRoleIds.filter((id) => !currentMemberRoleIds.has(id));

      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd, `กู้คืนยศจากจุดสำรอง ${backup.name}`);
        membersRestored++;
      }
    } catch (err) {
      console.warn(`Failed to reassign roles to member ${memberId}:`, err);
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "BACKUP_ROLES_RESTORED",
      category: "BACKUP",
      details: `กู้คืนยศจากจุดสำรอง ${backup.name} (สร้างยศใหม่ ${rolesRecreated}, อัปเดตสมาชิก ${membersRestored} คน)`,
    },
  });

  return {
    backupName: backup.name,
    rolesRecreated,
    membersRestored,
  };
}
