import { EmbedBuilder } from "discord.js";

/**
 * Apple Pro Minimalist Dark Design Tokens for Discord Embeds
 * Matching the LynnBot Web Dashboard aesthetic:
 * Clean, breathable, bilingual, and free of visual clutter.
 */
export const THEME_COLORS = {
  // Deep OLED surface darks
  surface: 0x16161c,
  card: 0x101014,
  pureDark: 0x08080a,

  // Accent & Functional Status Colors (Apple Human Interface Guidelines inspired)
  accent: 0x2997ff,     // Apple Blue (Action, Primary)
  success: 0x30d158,    // Apple Green (Clock-in, Approved, Online)
  danger: 0xff453a,     // Apple Coral Red (Clock-out, Rejected, Error)
  warning: 0xffd60a,    // Apple Amber/Gold (Pending, Caution)
  purple: 0x8b5cf6,     // Apple Violet (Admin, System, Premium)
  muted: 0x86868b,      // Apple Muted Slate
} as const;

export interface MinimalEmbedOptions {
  title?: string;
  subtitle?: string;
  description?: string;
  color?: number;
  footerText?: string;
  timestamp?: boolean;
}

/**
 * Creates a consistent Apple Pro Dark Minimalist Embed
 */
export function createAppleEmbed(options: MinimalEmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(options.color ?? THEME_COLORS.surface);

  if (options.title) {
    embed.setTitle(options.title);
  }

  let desc = "";
  if (options.subtitle) {
    desc += `${options.subtitle}\n\n`;
  }
  if (options.description) {
    desc += options.description;
  }
  if (desc.trim().length > 0) {
    embed.setDescription(desc.trim());
  }

  const footer = options.footerText || "Lynn Operations • Pro Minimal Dark";
  embed.setFooter({ text: footer });

  if (options.timestamp !== false) {
    embed.setTimestamp();
  }

  return embed;
}
