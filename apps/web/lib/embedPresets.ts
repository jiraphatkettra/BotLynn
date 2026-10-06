/**
 * ============================================================================
 * DISCORD EMBED CONFIGURATION PRESETS & SCHEMA
 * ============================================================================
 * Provides central definitions, schema, and defaults for all Discord Embeds
 * that can be customized from the LynnBot Web Dashboard.
 */

export interface EmbedFieldConfig {
  id: string;
  name: string;
  value: string;
  inline: boolean;
  enabled: boolean;
}

export interface EmbedConfigData {
  key: string;              // Unique identifier e.g. "shop_catalog"
  category: string;         // e.g. "shop", "moderation", "tickets", "attendance", "leaves", "wallet"
  name: string;             // Display name in Thai
  description: string;      // What this embed is for
  supportedVariables: { key: string; label: string; example: string }[];

  author: {
    enabled: boolean;
    name: string;
    iconUrl: string;
    url: string;
  };
  title: {
    enabled: boolean;
    text: string;
    url: string;
  };
  descriptionText: {
    enabled: boolean;
    text: string;
  };
  color: {
    enabled: boolean;
    hex: string;
  };
  thumbnail: {
    enabled: boolean;
    url: string;
  };
  image: {
    enabled: boolean;
    url: string;
  };
  fields: {
    enabled: boolean;
    items: EmbedFieldConfig[];
  };
  footer: {
    enabled: boolean;
    text: string;
    iconUrl: string;
  };
  timestamp: {
    enabled: boolean;
  };
}

export const EMBED_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "shop", label: "ร้านค้ายศ (Shop)", icon: "🛒" },
  { id: "moderation", label: "ระบบลงโทษ (Moderation)", icon: "⚖️" },
  { id: "tickets", label: "ระบบทิกเก็ต (Tickets)", icon: "🎫" },
  { id: "attendance", label: "ตอกบัตรเข้างาน (Attendance)", icon: "⏰" },
  { id: "leaves", label: "ระบบลางาน (Leaves)", icon: "🏖️" },
  { id: "wallet", label: "กระเป๋าเงิน & สลิป (Wallet & Slips)", icon: "💳" },
  { id: "welcome", label: "ต้อนรับสมาชิก (Welcome)", icon: "👋" },
];

export const DEFAULT_EMBED_PRESETS: Record<string, EmbedConfigData> = {
  // ==========================================
  // 1. SHOP EMBEDS
  // ==========================================
  shop_catalog: {
    key: "shop_catalog",
    category: "shop",
    name: "แผงร้านค้า / รายการยศที่เปิดขาย",
    description: "แผงข้อความหลักที่แสดงรายการยศให้สมาชิกเลือกซื้อผ่านปุ่มเลือกยศใน Discord",
    supportedVariables: [
      { key: "{server_name}", label: "ชื่อเซิร์ฟเวอร์", example: "LynnBot Community" },
      { key: "{roles_count}", label: "จำนวนยศทั้งหมด", example: "8" },
      { key: "{user}", label: "เมนชั่นผู้ใช้งาน", example: "@สมาชิก" },
      { key: "{username}", label: "ชื่อผู้ใช้งาน", example: "Jiraphat" },
    ],
    author: {
      enabled: true,
      name: "LynnBot Operations System • Role Shop",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🛒  AVAILABLE ROLES • รายการยศที่เปิดจำหน่าย",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "พบยศที่เปิดจำหน่ายทั้งหมด **{roles_count} รายการ**\nกรุณาคลิกเลือกยศจากเมนูด้านล่าง เพื่อดูข้อมูลและยืนยันการสั่งซื้อ\n\n> 💡 ยอดเงินจะถูกหักจากกระเป๋าเงินดิจิทัล (Wallet) ของคุณโดยอัตโนมัติ",
    },
    color: {
      enabled: true,
      hex: "#2997ff",
    },
    thumbnail: {
      enabled: true,
      url: "https://cdn.discordapp.com/emojis/1105478431871213598.webp?size=96&quality=lossless",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: true,
      items: [
        {
          id: "f1",
          name: "💳 ช่องทางการชำระ",
          value: "ตัดยอดคงเหลือในกระเป๋าเงิน Discord ทันที",
          inline: true,
          enabled: true,
        },
        {
          id: "f2",
          name: "⚡ การส่งมอบยศ",
          value: "บอทเพิ่มยศเข้าบัญชีอัตโนมัติหลังยืนยัน",
          inline: true,
          enabled: true,
        },
      ],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Shop",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  shop_purchase_success: {
    key: "shop_purchase_success",
    category: "shop",
    name: "ใบเสร็จสั่งซื้อยศสำเร็จ",
    description: "ส่งแจ้งเตือนตอบกลับผู้ซื้อเมื่อระบบหักเงินและมอบยศเรียบร้อยแล้ว",
    supportedVariables: [
      { key: "{user}", label: "เมนชั่นผู้ซื้อ", example: "@สมาชิก" },
      { key: "{username}", label: "ชื่อผู้ซื้อ", example: "Jiraphat" },
      { key: "{role_name}", label: "ชื่อยศที่ซื้อ", example: "VIP Member" },
      { key: "{price}", label: "ราคายศ (บาท)", example: "150" },
      { key: "{balance_left}", label: "ยอดเงินคงเหลือ", example: "350" },
      { key: "{role_status}", label: "สถานะการมอบยศ", example: "เพิ่มยศเข้าบัญชี Discord สำเร็จแล้ว ✨" },
    ],
    author: {
      enabled: false,
      name: "",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "✅  PURCHASE SUCCESSFUL • สั่งซื้อยศสำเร็จ",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "ยินดีด้วยคุณ {user}! คุณได้สั่งซื้อยศ **{role_name}** เรียบร้อยแล้ว\n\n• **ยอดเงินที่หัก:** ฿{price}\n• **ยอดเงินคงเหลือ:** ฿{balance_left}\n• **สถานะยศ:** {role_status}",
    },
    color: {
      enabled: true,
      hex: "#30d158",
    },
    thumbnail: {
      enabled: true,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Shop",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  shop_insufficient_funds: {
    key: "shop_insufficient_funds",
    category: "shop",
    name: "แจ้งเตือนยอดเงินในกระเป๋าไม่พอ",
    description: "ส่งข้อความเตือนเมื่อผู้ใช้กดซื้อยศแต่ยอดเงินในกระเป๋าเงินไม่เพียงพอ",
    supportedVariables: [
      { key: "{user}", label: "เมนชั่นผู้ซื้อ", example: "@สมาชิก" },
      { key: "{role_name}", label: "ชื่อยศที่ต้องการ", example: "VIP Member" },
      { key: "{price}", label: "ราคายศ", example: "150" },
      { key: "{current_balance}", label: "ยอดเงินปัจจุบัน", example: "45" },
      { key: "{missing_amount}", label: "จำนวนเงินที่ขาด", example: "105" },
    ],
    author: {
      enabled: false,
      name: "",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "❌  INSUFFICIENT BALANCE • ยอดเงินไม่เพียงพอ",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "ไม่สามารถทำรายการสั่งซื้อยศ **{role_name}** ได้\n\n• **ราคายศ:** `฿{price}`\n• **ยอดเงินปัจจุบัน:** `฿{current_balance}`\n• **จำนวนที่ขาด:** `฿{missing_amount}`\n\n> 💡 คุณสามารถเติมเงินเข้ากระเป๋าได้ที่แผงกระเป๋าเงิน หรือกดปุ่มแจ้งส่งสลิป",
    },
    color: {
      enabled: true,
      hex: "#ff453a",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Shop",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  shop_log_notify: {
    key: "shop_log_notify",
    category: "shop",
    name: "แจ้งเตือนแอดมินเมื่อมียอดสั่งซื้อ",
    description: "ส่ง Embed สรุปการสั่งซื้อเข้าห้อง Log สำหรับทีมงานและเจ้าของร้าน",
    supportedVariables: [
      { key: "{user}", label: "เมนชั่นผู้ซื้อ", example: "@สมาชิก" },
      { key: "{username}", label: "ชื่อผู้ซื้อ", example: "Jiraphat" },
      { key: "{user_id}", label: "Discord ID ผู้ซื้อ", example: "1078869442609561691" },
      { key: "{role_name}", label: "ชื่อยศ", example: "VIP Member" },
      { key: "{price}", label: "ราคายศ", example: "150" },
      { key: "{timestamp}", label: "เวลาที่ทำรายการ", example: "วันนี้ 18:00" },
    ],
    author: {
      enabled: true,
      name: "Shop Transaction Audit",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🎉  NEW SHOP PURCHASE • มีการสั่งซื้อยศใหม่",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "{user} ได้สั่งซื้อยศ **{role_name}** ผ่านระบบร้านค้า\n\n• **ผู้ซื้อ:** {user} (`{user_id}`)\n• **สินค้า:** `{role_name}`\n• **ราคา:** `฿{price}`\n• **เวลา:** {timestamp}",
    },
    color: {
      enabled: true,
      hex: "#30d158",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Shop Audit",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  // ==========================================
  // 2. MODERATION EMBEDS
  // ==========================================
  moderation_warn_member: {
    key: "moderation_warn_member",
    category: "moderation",
    name: "ใบเตือนส่งหาสมาชิก / ประกาศลงโทษ",
    description: "การ์ดใบเตือนที่ส่งแจ้งเตือนสมาชิกเมื่อกระทำผิดกฎระเบียบของเซิร์ฟเวอร์",
    supportedVariables: [
      { key: "{target_user}", label: "เมนชั่นผู้ถูกลงโทษ", example: "@ผู้ทำผิด" },
      { key: "{target_name}", label: "ชื่อผู้ถูกลงโทษ", example: "BadActor" },
      { key: "{moderator}", label: "เมนชั่นแอดมินผู้ลงโทษ", example: "@Admin" },
      { key: "{reason}", label: "สาเหตุการลงโทษ", example: "ใช้ถ้อยคำไม่สุภาพในห้องสนทนา" },
      { key: "{severity}", label: "ระดับความรุนแรง", example: "MEDIUM" },
      { key: "{action}", label: "มาตรการที่ใช้", example: "ตักเตือน (Warn) / พักการใช้งาน 1 ชม." },
      { key: "{warn_count}", label: "จำนวนครั้งที่ถูกเตือนสะสม", example: "2" },
      { key: "{warn_id}", label: "รหัสใบเตือน", example: "WARN-0104" },
    ],
    author: {
      enabled: true,
      name: "🛡️ LynnBot Moderation Center",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "⚠️  OFFICIAL WARNING • แจ้งเตือนการทำผิดกฎระเบียบ",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "เรียนสมาชิก {target_user}\nคุณได้รับการแจ้งเตือนการกระทำผิดกฎระเบียบของคอมมูนิตี้\n\n📌 **เหตุผล:** {reason}\n⚡ **ระดับความรุนแรง:** `{severity}`\n🛡️ **ผู้ลงโทษ:** {moderator}\n🔨 **มาตรการ:** **{action}**\n📊 **การเตือนสะสม:** **{warn_count} ครั้ง**\n\n> ⚠️ กรุณาปฏิบัติตามกฎของเซิร์ฟเวอร์ การกระทำผิดซ้ำอาจส่งผลให้ถูกระงับสิทธิ์ถาวร",
    },
    color: {
      enabled: true,
      hex: "#ff9f0a",
    },
    thumbnail: {
      enabled: true,
      url: "https://cdn.discordapp.com/emojis/1105478431871213598.webp?size=96&quality=lossless",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Moderation",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  moderation_warn_log: {
    key: "moderation_warn_log",
    category: "moderation",
    name: "บันทึกใบเตือนในห้อง Log แอดมิน",
    description: "ส่งสรุปหลักฐานและรายละเอียดการตักเตือนเข้าห้องบันทึกงานของทีมแอดมิน",
    supportedVariables: [
      { key: "{target_user}", label: "เมนชั่นผู้ถูกลงโทษ", example: "@ผู้ทำผิด" },
      { key: "{target_id}", label: "Discord ID ผู้ถูกลงโทษ", example: "123456789012345678" },
      { key: "{moderator}", label: "เมนชั่นแอดมิน", example: "@Admin" },
      { key: "{reason}", label: "สาเหตุ", example: "สแปมลิงก์เชิญชวน" },
      { key: "{severity}", label: "ระดับความรุนแรง", example: "HIGH" },
      { key: "{action}", label: "มาตรการ", example: "Timeout 24 ชั่วโมง" },
      { key: "{warn_count}", label: "เตือนสะสม", example: "3" },
    ],
    author: {
      enabled: true,
      name: "Security & Moderation Audit",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🔨  MEMBER PUNISHMENT LOG • บันทึกการลงโทษสมาชิก",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "มีการลงโทษสมาชิกในเซิร์ฟเวอร์เรียบร้อยแล้ว\n\n• **เป้าหมาย:** {target_user} (`{target_id}`)\n• **ผู้ดำเนินการ:** {moderator}\n• **เหตุผล:** {reason}\n• **ระดับ:** `{severity}`\n• **มาตรการ:** {action}\n• **ประวัติเตือน:** {warn_count} ครั้ง",
    },
    color: {
      enabled: true,
      hex: "#ff453a",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Moderation Audit",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  moderation_panel: {
    key: "moderation_panel",
    category: "moderation",
    name: "แผงควบคุมระบบ Moderation (Staff Panel)",
    description: "แผงปุ่มเครื่องมือสำหรับแอดมินในการคลิกสร้างใบเตือน ตรวจสอบประวัติ หรือสั่งลงโทษ",
    supportedVariables: [
      { key: "{server_name}", label: "ชื่อเซิร์ฟเวอร์", example: "LynnBot Community" },
      { key: "{active_warns}", label: "จำนวนใบเตือนในระบบ", example: "42" },
    ],
    author: {
      enabled: true,
      name: "LynnBot Operations System",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🛡️  MODERATION HUB • ศูนย์ควบคุมความปลอดภัย",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "ระบบควบคุมและรักษาระเบียบวินัยคอมมูนิตี้สำหรับทีมงานและผู้ดูแล\n\nกรุณาคลิกเลือกคำสั่งที่ต้องการดำเนินการจากปุ่มด้านล่าง:\n• **สร้างใบเตือน / ลงโทษ:** ออกใบเตือนพร้อมสั่งการลงโทษสมาชิก\n• **เช็คประวัติใบเตือน:** ค้นหาประวัติการกระทำผิดย้อนหลังด้วย Discord ID\n• **แผงจัดการบนเว็บ:** เปิดดูสถิติและจัดการใบเตือนทั้งหมดผ่าน Web Dashboard",
    },
    color: {
      enabled: true,
      hex: "#2997ff",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Moderation",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  // ==========================================
  // 3. TICKET EMBEDS
  // ==========================================
  ticket_panel: {
    key: "ticket_panel",
    category: "tickets",
    name: "แผงปุ่มเปิดทิกเก็ตในห้องรับเรื่อง",
    description: "แผงข้อความหลักที่ส่งไว้ในห้องกลาง เพื่อให้สมาชิกกดปุ่มสร้างห้องคุยส่วนตัวกับทีมงาน",
    supportedVariables: [
      { key: "{server_name}", label: "ชื่อเซิร์ฟเวอร์", example: "LynnBot Community" },
    ],
    author: {
      enabled: true,
      name: "LynnBot Support System",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🎫  TICKET SUPPORT • ศูนย์บริการช่วยเหลือและติดต่อทีมงาน",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "ยินดีต้อนรับเข้าสู่ศูนย์บริการช่วยเหลือของ {server_name}\nหากคุณต้องการติดต่อทีมงาน แจ้งปัญหา แจ้งเติมเงิน หรือสอบถามข้อมูลเพิ่มเติม\n\n> 🔒 **ความเป็นส่วนตัว:** ห้องสนทนาที่ถูกสร้างจะเป็นห้องส่วนตัวที่มีเพียงคุณและทีมงานเท่านั้นที่เข้าถึงได้\n\nคลิกปุ่มด้านล่างเพื่อเปิดห้องสนทนาใหม่ได้ทันทีครับ",
    },
    color: {
      enabled: true,
      hex: "#2997ff",
    },
    thumbnail: {
      enabled: true,
      url: "https://cdn.discordapp.com/emojis/1105478431871213598.webp?size=96&quality=lossless",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: true,
      items: [
        {
          id: "t1",
          name: "⏰ เวลาทำการ",
          value: "บริการทุกวัน 24 ชั่วโมง",
          inline: true,
          enabled: true,
        },
        {
          id: "t2",
          name: "⚡ ความเร็วในการตอบกลับ",
          value: "เฉลี่ย 2 - 10 นาที",
          inline: true,
          enabled: true,
        },
      ],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Tickets",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  ticket_welcome: {
    key: "ticket_welcome",
    category: "tickets",
    name: "ข้อความต้อนรับเมื่อเปิดห้องทิกเก็ต",
    description: "ข้อความแรกสุดที่บอทส่งทักทายลูกค้าทันทีที่ห้องทิกเก็ตถูกสร้างขึ้น",
    supportedVariables: [
      { key: "{user}", label: "เมนชั่นผู้เปิดทิกเก็ต", example: "@สมาชิก" },
      { key: "{ticket_id}", label: "รหัสทิกเก็ต", example: "TICKET-0042" },
      { key: "{subject}", label: "เรื่องที่ติดต่อ", example: "บริการทั่วไป & แจ้งปัญหา" },
    ],
    author: {
      enabled: false,
      name: "",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🎫  TICKET #{ticket_id} • ศูนย์บริการช่วยเหลือ",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "ยินดีต้อนรับคุณ {user} สู่ระบบบริการลูกค้า\n\nกรุณาระบุรายละเอียดปัญหา เรื่องที่ต้องการสอบถาม หรือแนบหลักฐานรูปภาพทิ้งไว้ในห้องนี้ได้เลยครับ\nทีมผู้ดูแลจะเข้ามาตรวจสอบและให้บริการอย่างรวดเร็วที่สุด\n\n> 🔒 **ความปลอดภัย:** ห้องนี้เป็นห้องส่วนตัว มีเพียงคุณและสตาฟที่ได้รับอนุญาตเท่านั้นที่มองเห็น\n\n-# คลิกปุ่มด้านล่างเพื่อปิดทิกเก็ตเมื่อเสร็จสิ้นการสนทนา (Close Ticket)",
    },
    color: {
      enabled: true,
      hex: "#2997ff",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Tickets",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  ticket_claimed: {
    key: "ticket_claimed",
    category: "tickets",
    name: "แจ้งเตือนเมื่อแอดมินรับเคส",
    description: "ส่งแจ้งเตือนในห้องเมื่อมีสตาฟกดปุ่มรับเรื่อง (Claim)",
    supportedVariables: [
      { key: "{staff}", label: "เมนชั่นสตาฟผู้รับเคส", example: "@Admin" },
      { key: "{staff_name}", label: "ชื่อสตาฟ", example: "Jiraphat" },
      { key: "{ticket_id}", label: "รหัสทิกเก็ต", example: "TICKET-0042" },
    ],
    author: {
      enabled: false,
      name: "",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "💬  STAFF ASSIGNED • เจ้าหน้าที่รับเรื่องแล้ว",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "{staff} ได้รับเคสนี้เรียบร้อยแล้วและกำลังดูแลคุณอยู่ครับ\nหากมีข้อสงสัยหรือข้อมูลเพิ่มเติมสามารถพิมพ์สอบถามต่อได้ทันที",
    },
    color: {
      enabled: true,
      hex: "#30d158",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Tickets",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  ticket_closed: {
    key: "ticket_closed",
    category: "tickets",
    name: "แจ้งเตือนปิดทิกเก็ต & บันทึกประวัติ",
    description: "ส่งข้อความสรุปและประวัติการสนทนา (Transcript) เข้าห้อง Log หลังปิดทิกเก็ต",
    supportedVariables: [
      { key: "{ticket_id}", label: "รหัสทิกเก็ต", example: "TICKET-0042" },
      { key: "{closer}", label: "ผู้ปิดทิกเก็ต", example: "@Admin" },
      { key: "{creator}", label: "ผู้เปิดทิกเก็ต", example: "@สมาชิก" },
      { key: "{duration}", label: "ระยะเวลาที่เปิด", example: "18 นาที" },
    ],
    author: {
      enabled: true,
      name: "Ticket Archive & Transcript",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🔒  TICKET CLOSED • ทิกเก็ตถูกปิดเรียบร้อยแล้ว",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "ทิกเก็ต **#{ticket_id}** ได้ถูกปิดการสนทนาเรียบร้อยแล้ว\n\n• **ผู้เปิด:** {creator}\n• **ผู้ปิดเคส:** {closer}\n• **ระยะเวลา:** {duration}\n\n> 📁 ประวัติการสนทนาทั้งหมดถูกบันทึกและซิงค์เข้าสู่ระบบ Dashboard เรียบร้อยแล้ว",
    },
    color: {
      enabled: true,
      hex: "#ff9f0a",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Tickets",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  // ==========================================
  // 4. ATTENDANCE EMBEDS
  // ==========================================
  attendance_panel: {
    key: "attendance_panel",
    category: "attendance",
    name: "แผงปุ่มตอกบัตรเข้า/ออกงาน",
    description: "แผงควบคุมหลักสำหรับทีมงานในการคลิกเข้างาน (Clock In) และออกงาน (Clock Out)",
    supportedVariables: [
      { key: "{server_name}", label: "ชื่อเซิร์ฟเวอร์", example: "LynnBot Community" },
    ],
    author: {
      enabled: true,
      name: "LynnBot HR & Attendance System",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "⏰  STAFF ATTENDANCE • ระบบบันทึกเวลาทำงานทีมงาน",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "ยินดีต้อนรับทีมงานทุกท่าน กรุณาบันทึกเวลาเข้าและออกงานผ่านปุ่มด้านล่าง\nระบบจะทำการบันทึกชั่วโมงงานและมอบยศปฏิบัติหน้าที่ (On Duty) ให้โดยอัตโนมัติ\n\n> 🟢 **เข้างาน (Clock In):** เริ่มนับเวลาและมอบยศปฏิบัติหน้าที่\n> 🔴 **ออกงาน (Clock Out):** สรุปชั่วโมงงานและถอดยศปฏิบัติหน้าที่",
    },
    color: {
      enabled: true,
      hex: "#2997ff",
    },
    thumbnail: {
      enabled: true,
      url: "https://cdn.discordapp.com/emojis/1105478431871213598.webp?size=96&quality=lossless",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Attendance",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  attendance_clockin: {
    key: "attendance_clockin",
    category: "attendance",
    name: "แจ้งเตือนเข้างานสำเร็จ",
    description: "ส่งแจ้งเตือนตอบกลับเมื่อทีมงานกดตอกบัตรเข้างานสำเร็จ",
    supportedVariables: [
      { key: "{user}", label: "เมนชั่นทีมงาน", example: "@Admin" },
      { key: "{time}", label: "เวลาที่เข้างาน", example: "09:00:15" },
      { key: "{role_status}", label: "สถานะการมอบยศ", example: "รับยศ On-Duty เรียบร้อยแล้ว" },
    ],
    author: {
      enabled: false,
      name: "",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🟢  CLOCK IN SUCCESSFUL • เริ่มปฏิบัติหน้าที่",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "{user} ได้บันทึกเวลาเข้างานเรียบร้อยแล้ว!\n\n• **เวลาเข้างาน:** `{time}`\n• **สถานะยศ:** {role_status}\n\n> ขอให้ปฏิบัติงานด้วยความราบรื่นและตั้งใจให้บริการสมาชิกครับ ✨",
    },
    color: {
      enabled: true,
      hex: "#30d158",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Attendance",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  attendance_clockout: {
    key: "attendance_clockout",
    category: "attendance",
    name: "สรุปและแจ้งเตือนออกงาน",
    description: "ส่งสรุปชั่วโมงงานเมื่อทีมงานกดตอกบัตรออกงาน",
    supportedVariables: [
      { key: "{user}", label: "เมนชั่นทีมงาน", example: "@Admin" },
      { key: "{clock_in_time}", label: "เวลาเข้างาน", example: "09:00" },
      { key: "{clock_out_time}", label: "เวลาออกงาน", example: "17:30" },
      { key: "{duration}", label: "ระยะเวลาที่ทำงาน", example: "8 ชั่วโมง 30 นาที" },
    ],
    author: {
      enabled: false,
      name: "",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🏁  CLOCK OUT SUMMARY • สรุปการปฏิบัติหน้าที่",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "{user} ได้สิ้นสุดการปฏิบัติงานในกะนี้เรียบร้อยแล้ว\n\n• **เวลาเข้างาน:** `{clock_in_time}`\n• **เวลาออกงาน:** `{clock_out_time}`\n• **รวมระยะเวลาทำงาน:** **{duration}**\n\n> ขอบคุณสำหรับความทุ่มเทและการปฏิบัติงานในวันนี้ครับ พักผ่อนให้เต็มที่ครับ 💙",
    },
    color: {
      enabled: true,
      hex: "#30d158",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Attendance",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  // ==========================================
  // 5. LEAVE EMBEDS
  // ==========================================
  leave_panel: {
    key: "leave_panel",
    category: "leaves",
    name: "แผงปุ่มยื่นขอลางาน",
    description: "แผงสำหรับให้ทีมงานกดปุ่มเปิดฟอร์มยื่นคำร้องขอลางาน",
    supportedVariables: [
      { key: "{server_name}", label: "ชื่อเซิร์ฟเวอร์", example: "LynnBot Community" },
    ],
    author: {
      enabled: true,
      name: "LynnBot HR & Leave System",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "🏖️  STAFF LEAVE REQUEST • ระบบยื่นคำขอลางาน",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "สวัสดิการการลาสำหรับทีมงานและผู้ดูแลทุกท่าน\nกรุณายื่นใบลาล่วงหน้าเพื่อให้ผู้บริหารจัดสรรเวรงานแทนได้อย่างมีประสิทธิภาพ\n\n> 📋 **ประเภทการลา:** ลาป่วย, ลากิจ, ลาพักร้อน, อื่นๆ\n\nคลิกปุ่ม **\"ยื่นคำขอลางาน\"** ด้านล่างเพื่อกรอกข้อมูลครับ",
    },
    color: {
      enabled: true,
      hex: "#2997ff",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Leave Service",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  leave_requested: {
    key: "leave_requested",
    category: "leaves",
    name: "ใบคำขอลารอแอดมินพิจารณา",
    description: "ส่งเข้าห้องพิจารณาของแอดมิน/ผู้จัดการพร้อมปุ่มอนุมัติหรือปฏิเสธ",
    supportedVariables: [
      { key: "{user}", label: "เมนชั่นทีมงานที่ขอลา", example: "@Admin" },
      { key: "{leave_type}", label: "ประเภทการลา", example: "ลาป่วย (SICK)" },
      { key: "{start_date}", label: "วันที่เริ่มลา", example: "10 ต.ค. 2569" },
      { key: "{days}", label: "จำนวนวัน", example: "2 วัน" },
      { key: "{reason}", label: "เหตุผลการลา", example: "มีไข้สูงต้องพบแพทย์" },
    ],
    author: {
      enabled: true,
      name: "Leave Request Review",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "⏳  PENDING LEAVE REVIEW • คำขอลางานรอการอนุมัติ",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "{user} ได้ส่งคำขอลางานเข้ามาในระบบ\n\n• **ประเภทการลา:** `{leave_type}`\n• **วันที่เริ่มลา:** {start_date} ({days})\n• **เหตุผล:** {reason}\n\n> กรุณากดปุ่มเพื่ออนุมัติหรือปฏิเสธคำขอลานี้",
    },
    color: {
      enabled: true,
      hex: "#ff9f0a",
    },
    thumbnail: {
      enabled: false,
      url: "",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Leave Service",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },

  // ==========================================
  // 6. WALLET EMBEDS
  // ==========================================
  wallet_panel: {
    key: "wallet_panel",
    category: "wallet",
    name: "แผงกระเป๋าเงิน & เติมเงิน (Wallet Panel)",
    description: "แผงควบคุมสำหรับสมาชิกในการเช็คยอดเงินในกระเป๋า และกดปุ่มเติมเงินหรือแจ้งส่งสลิป",
    supportedVariables: [
      { key: "{server_name}", label: "ชื่อเซิร์ฟเวอร์", example: "LynnBot Community" },
    ],
    author: {
      enabled: true,
      name: "LynnBot Digital Wallet",
      iconUrl: "",
      url: "",
    },
    title: {
      enabled: true,
      text: "💰  DIGITAL WALLET • กระเป๋าเงินและยอดเงินคงเหลือ",
      url: "",
    },
    descriptionText: {
      enabled: true,
      text: "ยินดีต้อนรับสู่ระบบกระเป๋าเงินดิจิทัลของ {server_name}\nคุณสามารถใช้ยอดเงินในกระเป๋าเพื่อซื้อยศพิเศษในร้านค้า และร่วมกิจกรรมต่างๆ\n\n> • **เช็คยอดเงิน:** ดูยอดเงินคงเหลือและประวัติธุรกรรมของคุณ\n> • **เติมเงินพร้อมเพย์ / วอลเล็ท:** สร้าง QR Code เพื่อโอนเงินเข้ากระเป๋าอัตโนมัติ\n> • **ส่งสลิปโอนเงิน:** แจ้งสลิปเพื่อขอรับการอนุมัติยอดเงินจากแอดมิน",
    },
    color: {
      enabled: true,
      hex: "#2997ff",
    },
    thumbnail: {
      enabled: true,
      url: "https://cdn.discordapp.com/emojis/1105478431871213598.webp?size=96&quality=lossless",
    },
    image: {
      enabled: false,
      url: "",
    },
    fields: {
      enabled: false,
      items: [],
    },
    footer: {
      enabled: true,
      text: "LynnBot Operations System • Wallet",
      iconUrl: "",
    },
    timestamp: {
      enabled: true,
    },
  },
};

/**
 * Get all presets belonging to a specific category
 */
export function getPresetsByCategory(category: string): EmbedConfigData[] {
  return Object.values(DEFAULT_EMBED_PRESETS).filter((p) => p.category === category);
}

/**
 * Get a single preset by key
 */
export function getPresetByKey(key: string): EmbedConfigData | undefined {
  return DEFAULT_EMBED_PRESETS[key];
}
