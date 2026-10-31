import { EmbedBuilder } from "discord.js";

/**
 * 🎨 Fanday Theme Tokens & Embed Generators
 * Exactly matches the design language of the 753BC Activities reference panel:
 * - Brand Divider: "୨ৎ . 753BC . ୨ৎ"
 * - Wave Divider: "◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠"
 * - Warm Clay/Caramel Brown Color: 0xA0714F
 * - Clear structure: Title -> ## Player Count -> ### Room Status -> diff hint block -> Divider -> Recent Players -> Banner
 */

export const FANDAY_COLORS = {
  theme: 0xa0714f,     // Warm Clay Brown from reference image
  primary: 0x9b59b6,   // Soft Purple Accent
  pink: 0xff6b8b,      // Fanday Romantic Pink
  success: 0x30d158,   // Active Green
  warning: 0xffd60a,   // Amber Warning
  danger: 0xff453a,    // Danger / Leave Red
  surface: 0x1a1a24,   // Dark Surface
} as const;

export const BRAND_DIVIDER = "୨ৎ . 753BC . ୨ৎ";
export const WAVE_DIVIDER = "◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠";

export const DEFAULT_FANDAY_BANNER =
  "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1000&q=80";

export interface FandayPanelEmbedOptions {
  title?: string;
  playerCount?: number;
  minPlayers?: number;
  statusLabel?: string;
  statusEmoji?: string;
  recentPlayerNames?: string[];
  bannerUrl?: string | null;
  color?: number;
}

/**
 * Builds the default 753BC Fanday Panel Embed matching the reference screenshot
 */
export function buildFandayPanelEmbed(options: FandayPanelEmbedOptions = {}): EmbedBuilder {
  const title = options.title || "กิจกรรมแฟนเดย์ • 753BC";
  const playerCount = options.playerCount ?? 0;
  const minPlayers = options.minPlayers ?? 7;
  const statusLabel = options.statusLabel || "เปิดรับสมัครผู้เข้าร่วม";
  const statusEmoji = options.statusEmoji || "🟢";
  const bannerUrl = options.bannerUrl ?? DEFAULT_FANDAY_BANNER;
  const color = options.color ?? FANDAY_COLORS.theme;

  const names = options.recentPlayerNames && options.recentPlayerNames.length > 0
    ? options.recentPlayerNames.slice(0, 10).map((n) => `• \`${n}\``).join("\n")
    : "- *ยังไม่มีผู้เข้าร่วมในขณะนี้*";

  const description = [
    `## จำนวนผู้เล่นปัจจุบัน`,
    `\`${playerCount} คน (ต้องการขั้นต่ำ ${minPlayers} คน)\``,
    ``,
    `### สถานะห้อง: ${statusEmoji} \`${statusLabel}\``,
    ``,
    `\`\`\`diff`,
    `+ กดปุ่มด้านล่างเพื่อเข้าร่วม อ่านกติกา`,
    `+ หรือตรวจสอบบทบาทของตัวเองได้เลย`,
    `\`\`\``,
    ``,
    BRAND_DIVIDER,
    ``,
    WAVE_DIVIDER,
    ``,
    `📝 **รายชื่อผู้เข้าร่วมล่าสุด**`,
    names,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: "ระบบกิจกรรม แฟนเดย์ 753BC • มาร่วมสนุกไปด้วยกันน้า",
    })
    .setTimestamp();

  if (bannerUrl) {
    embed.setImage(bannerUrl);
  }

  return embed;
}

/**
 * Standard Fanday Sub-Embed Generator (for ephemeral replies, DMs, modals, and confirmations)
 * Ensures every single bot reply is a consistent, beautiful embed.
 */
export function createFandayEmbed(opts: {
  title: string;
  description: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  thumbnail?: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(opts.color ?? FANDAY_COLORS.theme)
    .setTitle(opts.title)
    .setDescription(`${opts.description}\n\n${BRAND_DIVIDER}`)
    .setFooter({
      text: opts.footer || "753BC Activities System • Fanday",
    })
    .setTimestamp();

  if (opts.fields && opts.fields.length > 0) {
    embed.addFields(opts.fields);
  }

  if (opts.thumbnail) {
    embed.setThumbnail(opts.thumbnail);
  }

  return embed;
}

