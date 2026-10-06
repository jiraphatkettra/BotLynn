import { EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";

export interface CustomEmbedField {
  id?: string;
  name: string;
  value: string;
  inline?: boolean;
  enabled?: boolean;
}

export interface CustomEmbedData {
  key?: string;
  category?: string;
  author?: {
    enabled?: boolean;
    name?: string;
    iconUrl?: string;
    url?: string;
  };
  title?: {
    enabled?: boolean;
    text?: string;
    url?: string;
  };
  descriptionText?: {
    enabled?: boolean;
    text?: string;
  };
  color?: {
    enabled?: boolean;
    hex?: string;
  };
  thumbnail?: {
    enabled?: boolean;
    url?: string;
  };
  image?: {
    enabled?: boolean;
    url?: string;
  };
  fields?: {
    enabled?: boolean;
    items?: CustomEmbedField[];
  };
  footer?: {
    enabled?: boolean;
    text?: string;
    iconUrl?: string;
  };
  timestamp?: {
    enabled?: boolean;
  };
}

/**
 * Replace placeholders like {user}, {price}, {role_name} in strings
 */
function replacePlaceholders(text: string, variables: Record<string, string | number | undefined>): string {
  if (!text) return "";
  let result = text;
  for (const [key, val] of Object.entries(variables)) {
    if (val !== undefined && val !== null) {
      // Replace both {key} and key
      const token = key.startsWith("{") && key.endsWith("}") ? key : `{${key}}`;
      result = result.replaceAll(token, String(val));
    }
  }
  return result;
}

/**
 * Render a Discord embed with custom DB configuration if set,
 * or fall back gracefully to the provided default embed.
 */
export async function renderCustomEmbed(
  key: string,
  defaultEmbed: EmbedBuilder,
  variables: Record<string, string | number | undefined> = {}
): Promise<EmbedBuilder> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: `embed_config:${key}` },
    });

    if (!setting?.value) {
      return defaultEmbed;
    }

    const config: CustomEmbedData = JSON.parse(setting.value);
    const customEmbed = new EmbedBuilder();

    // 1. Color
    if (config.color?.enabled && config.color.hex) {
      const cleanHex = config.color.hex.replace("#", "");
      const colorInt = parseInt(cleanHex, 16);
      if (!isNaN(colorInt)) {
        customEmbed.setColor(colorInt);
      }
    } else if (defaultEmbed.data.color) {
      customEmbed.setColor(defaultEmbed.data.color);
    }

    // 2. Author
    if (config.author?.enabled && config.author.name) {
      const authorName = replacePlaceholders(config.author.name, variables);
      const iconUrl = replacePlaceholders(config.author.iconUrl || "", variables);
      const url = replacePlaceholders(config.author.url || "", variables);
      customEmbed.setAuthor({
        name: authorName,
        iconURL: iconUrl || undefined,
        url: url || undefined,
      });
    }

    // 3. Title
    if (config.title?.enabled && config.title.text) {
      const titleText = replacePlaceholders(config.title.text, variables);
      customEmbed.setTitle(titleText);
      if (config.title.url) {
        customEmbed.setURL(replacePlaceholders(config.title.url, variables));
      }
    }

    // 4. Description
    if (config.descriptionText?.enabled && config.descriptionText.text) {
      const descText = replacePlaceholders(config.descriptionText.text, variables);
      customEmbed.setDescription(descText);
    }

    // 5. Thumbnail
    if (config.thumbnail?.enabled && config.thumbnail.url) {
      const thumbUrl = replacePlaceholders(config.thumbnail.url, variables);
      if (thumbUrl.startsWith("http://") || thumbUrl.startsWith("https://")) {
        customEmbed.setThumbnail(thumbUrl);
      }
    }

    // 6. Image
    if (config.image?.enabled && config.image.url) {
      const imgUrl = replacePlaceholders(config.image.url, variables);
      if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) {
        customEmbed.setImage(imgUrl);
      }
    }

    // 7. Fields
    if (config.fields?.enabled && Array.isArray(config.fields.items)) {
      const activeFields = config.fields.items.filter(
        (f) => f.enabled !== false && f.name && f.value
      );
      for (const field of activeFields) {
        customEmbed.addFields({
          name: replacePlaceholders(field.name, variables),
          value: replacePlaceholders(field.value, variables),
          inline: Boolean(field.inline),
        });
      }
    }

    // 8. Footer
    if (config.footer?.enabled && config.footer.text) {
      const footerText = replacePlaceholders(config.footer.text, variables);
      const footerIcon = replacePlaceholders(config.footer.iconUrl || "", variables);
      customEmbed.setFooter({
        text: footerText,
        iconURL: footerIcon || undefined,
      });
    }

    // 9. Timestamp
    if (config.timestamp?.enabled) {
      customEmbed.setTimestamp();
    }

    return customEmbed;
  } catch (error) {
    console.error(`❌ [EmbedService] Error loading custom embed '${key}':`, error);
    return defaultEmbed;
  }
}
