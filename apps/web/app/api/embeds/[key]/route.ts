import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, LogCategory } from "@lynnbot/database";
import { DEFAULT_EMBED_PRESETS, type EmbedConfigData } from "@/lib/embedPresets";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = params;
    const defaultPreset = DEFAULT_EMBED_PRESETS[key];
    if (!defaultPreset) {
      return NextResponse.json(
        { error: "ไม่พบประเภท Embed ที่ระบุในระบบ" },
        { status: 404 }
      );
    }

    const setting = await prisma.setting.findUnique({
      where: { key: `embed_config:${key}` },
    });

    if (setting) {
      try {
        const custom = JSON.parse(setting.value);
        return NextResponse.json({
          embed: {
            ...defaultPreset,
            ...custom,
            isCustomized: true,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      embed: {
        ...defaultPreset,
        isCustomized: false,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/embeds/[key]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { key } = params;
    const defaultPreset = DEFAULT_EMBED_PRESETS[key];

    if (!defaultPreset) {
      return NextResponse.json(
        { error: "ไม่พบประเภท Embed ที่ระบุในระบบ" },
        { status: 404 }
      );
    }

    const body: Partial<EmbedConfigData> = await req.json();

    // Clean & normalize payload
    const normalizedData = {
      key,
      category: defaultPreset.category,
      name: body.name || defaultPreset.name,
      description: defaultPreset.description,
      supportedVariables: defaultPreset.supportedVariables,
      author: {
        enabled: Boolean(body.author?.enabled),
        name: body.author?.name || "",
        iconUrl: body.author?.iconUrl || "",
        url: body.author?.url || "",
      },
      title: {
        enabled: Boolean(body.title?.enabled),
        text: body.title?.text || "",
        url: body.title?.url || "",
      },
      descriptionText: {
        enabled: Boolean(body.descriptionText?.enabled),
        text: body.descriptionText?.text || "",
      },
      color: {
        enabled: Boolean(body.color?.enabled),
        hex: body.color?.hex || defaultPreset.color.hex,
      },
      thumbnail: {
        enabled: Boolean(body.thumbnail?.enabled),
        url: body.thumbnail?.url || "",
      },
      image: {
        enabled: Boolean(body.image?.enabled),
        url: body.image?.url || "",
      },
      fields: {
        enabled: Boolean(body.fields?.enabled),
        items: Array.isArray(body.fields?.items)
          ? body.fields.items.map((f, idx) => ({
              id: f.id || `f-${idx}`,
              name: f.name || "",
              value: f.value || "",
              inline: Boolean(f.inline),
              enabled: Boolean(f.enabled),
            }))
          : [],
      },
      footer: {
        enabled: Boolean(body.footer?.enabled),
        text: body.footer?.text || "",
        iconUrl: body.footer?.iconUrl || "",
      },
      timestamp: {
        enabled: Boolean(body.timestamp?.enabled),
      },
    };

    // Save to Setting table
    await prisma.setting.upsert({
      where: { key: `embed_config:${key}` },
      create: {
        key: `embed_config:${key}`,
        value: JSON.stringify(normalizedData),
        category: "embed_config",
        description: `Custom Embed Configuration for ${defaultPreset.name}`,
      },
      update: {
        value: JSON.stringify(normalizedData),
        updatedAt: new Date(),
      },
    });

    // Write audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_EMBED_CONFIG",
          category: LogCategory.SYSTEM,
          details: `ปรับแต่งการตั้งค่า Discord Embed: ${defaultPreset.name} (${key})`,
          metadata: {
            embedKey: key,
            category: defaultPreset.category,
            by: user.displayName || user.name || "Admin",
          },
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      embed: {
        ...normalizedData,
        isCustomized: true,
      },
    });
  } catch (error: any) {
    console.error("Error in PUT /api/embeds/[key]:", error);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกการตั้งค่าได้" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { key } = params;
    const defaultPreset = DEFAULT_EMBED_PRESETS[key];

    if (!defaultPreset) {
      return NextResponse.json(
        { error: "ไม่พบประเภท Embed ที่ระบุในระบบ" },
        { status: 404 }
      );
    }

    await prisma.setting.deleteMany({
      where: { key: `embed_config:${key}` },
    });

    // Write audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "RESET_EMBED_CONFIG",
          category: LogCategory.SYSTEM,
          details: `รีเซ็ตการตั้งค่า Discord Embed กลับเป็นค่าเริ่มต้น: ${defaultPreset.name} (${key})`,
          metadata: {
            embedKey: key,
            by: user.displayName || user.name || "Admin",
          },
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      embed: {
        ...defaultPreset,
        isCustomized: false,
      },
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/embeds/[key]:", error);
    return NextResponse.json(
      { error: "ไม่สามารถรีเซ็ตการตั้งค่าได้" },
      { status: 500 }
    );
  }
}
