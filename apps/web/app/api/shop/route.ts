export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

// GET - List shop roles or transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "roles";

    if (type === "transactions") {
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const userId = searchParams.get("userId");

      const where: any = {};
      if (userId) where.userId = userId;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: { user: true, role: true },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.transaction.count({ where }),
      ]);

      return NextResponse.json({
        data: transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    const roles = await prisma.shopRole.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { transactions: true } } },
    });

    return NextResponse.json({ data: roles });
  } catch (error) {
    console.error("Error fetching shop data:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop data" },
      { status: 500 }
    );
  }
}

// POST - Create a new shop role (SuperAdmin) or process purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Purchase action (from bot or client)
    if (action === "purchase") {
      const { discordId, roleId } = body;
      if (!discordId || !roleId) {
        return NextResponse.json(
          { error: "discordId and roleId are required" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({ where: { discordId } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const role = await prisma.shopRole.findUnique({ where: { id: roleId } });
      if (!role || !role.isActive) {
        return NextResponse.json({ error: "Role not available" }, { status: 400 });
      }

      if (role.stock !== null && role.stock <= 0) {
        return NextResponse.json({ error: "Role is out of stock" }, { status: 400 });
      }

      const existingPurchases = await prisma.transaction.count({
        where: {
          userId: user.id,
          roleId: role.id,
          status: "COMPLETED",
        },
      });

      if (existingPurchases >= role.maxPerUser) {
        return NextResponse.json(
          { error: "Maximum purchases reached" },
          { status: 400 }
        );
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          roleId: role.id,
          price: role.price,
          status: "COMPLETED",
        },
        include: { user: true, role: true },
      });

      if (role.stock !== null) {
        await prisma.shopRole.update({
          where: { id: role.id },
          data: { stock: role.stock - 1 },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "ซื้อยศ",
          category: "SHOP",
          details: `${user.displayName || user.username} ซื้อยศ "${role.name}" ราคา ${role.price}`,
        },
      });

      return NextResponse.json({ data: transaction }, { status: 201 });
    }

    // Creating a new role requires SuperAdmin (OWNER)
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะ SuperAdmin (OWNER) เท่านั้นที่สามารถเพิ่มยศในร้านค้าได้" },
        { status: 403 }
      );
    }

    const {
      name,
      discordRoleId,
      price,
      description,
      color,
      icon,
      category,
      stock,
      maxPerUser,
      isActive,
    } = body;

    if (!name || !discordRoleId || price === undefined) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อยศ, Discord Role ID และราคาให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // Check if role already exists with same discordRoleId
    const existingRole = await prisma.shopRole.findUnique({
      where: { discordRoleId },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: `ยศนี้ถูกเพิ่มในร้านค้าอยู่แล้ว (${existingRole.name})` },
        { status: 400 }
      );
    }

    const role = await prisma.shopRole.create({
      data: {
        name,
        discordRoleId,
        price: parseFloat(price),
        description: description || null,
        color: color || "#2997ff",
        icon: icon || null,
        category: category || "general",
        stock: stock !== null && stock !== undefined && stock !== "" ? parseInt(stock) : null,
        maxPerUser: maxPerUser ? parseInt(maxPerUser) : 1,
        isActive: isActive !== false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session?.user as any)?.id,
        action: "สร้างยศในร้านค้า",
        category: "SHOP",
        details: `เพิ่มยศ "${name}" ราคา ฿${price} ในร้านค้า`,
      },
    });

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (error: any) {
    console.error("Error in shop POST:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

// PATCH - Update a shop role (SuperAdmin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะ SuperAdmin (OWNER) เท่านั้นที่สามารถแก้ไขยศได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, price, stock, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Role id is required" }, { status: 400 });
    }

    const updateData: any = { ...rest };
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stock !== undefined) {
      updateData.stock = stock !== null && stock !== "" ? parseInt(stock) : null;
    }

    const role = await prisma.shopRole.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: (session?.user as any)?.id,
        action: "อัปเดตยศในร้านค้า",
        category: "SHOP",
        details: `อัปเดตยศ "${role.name}"`,
      },
    });

    return NextResponse.json({ data: role });
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update role" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a shop role (SuperAdmin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะ SuperAdmin (OWNER) เท่านั้นที่สามารถลบยศได้" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all");

    if (all === "true") {
      const count = await prisma.shopRole.count();
      await prisma.shopRole.deleteMany({});

      await prisma.auditLog.create({
        data: {
          userId: (session?.user as any)?.id,
          action: "ลบยศทั้งหมดออกจากร้านค้า",
          category: "SHOP",
          details: `ลบยศทั้งหมดจำนวน ${count} รายการออกจากร้านค้า`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `ลบยศทั้งหมด ${count} รายการออกจากร้านค้าเรียบร้อยแล้ว`,
      });
    }

    if (!id) {
      return NextResponse.json({ error: "Role id is required" }, { status: 400 });
    }

    const role = await prisma.shopRole.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await prisma.shopRole.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: (session?.user as any)?.id,
        action: "ลบยศออกจากร้านค้า",
        category: "SHOP",
        details: `ลบยศ "${role.name}" (ID: ${role.discordRoleId}) ออกจากร้านค้า`,
      },
    });

    return NextResponse.json({ success: true, message: `ลบยศ ${role.name} สำเร็จ` });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete role" },
      { status: 500 }
    );
  }
}
