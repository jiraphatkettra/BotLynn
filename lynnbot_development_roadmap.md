# 🚀 LynnBot — Development Roadmap & Feature Expansion Prompt

> **วัตถุประสงค์**: เอกสารนี้คือ Prompt สำหรับส่งต่อให้ Gemini AI ดำเนินการพัฒนาฟีเจอร์ใหม่ใน LynnBot ทั้งส่วน Web Dashboard (Next.js) และ Discord Bot (discord.js v14) โดยออกแบบจากการวิเคราะห์ Codebase ทั้งหมดอย่างละเอียด
>
> **สถานะปัจจุบัน**: ระบบมี 13 Bot Commands, 5 Interactive Panels, 14+ Dashboard Pages, 15 Prisma Models, 32 React Components, 11 Bot Services

---

## 📋 สารบัญ

1. [บทบาทและบริบท](#1-บทบาทและบริบท)
2. [สถาปัตยกรรมปัจจุบัน](#2-สถาปัตยกรรมปัจจุบัน)
3. [Phase 1 — ปรับปรุงระบบที่มีอยู่](#3-phase-1--ปรับปรุงระบบที่มีอยู่-quick-wins)
4. [Phase 2 — ฟีเจอร์ใหม่สำหรับ Dashboard](#4-phase-2--ฟีเจอร์ใหม่สำหรับ-dashboard)
5. [Phase 3 — ฟีเจอร์ใหม่สำหรับ Discord Bot](#5-phase-3--ฟีเจอร์ใหม่สำหรับ-discord-bot)
6. [Phase 4 — ฟีเจอร์ขั้นสูง](#6-phase-4--ฟีเจอร์ขั้นสูง-advanced)
7. [กฎการเขียนโค้ด](#7-กฎการเขียนโค้ด-coding-conventions)
8. [ลำดับความสำคัญ](#8-ลำดับความสำคัญ-priority-matrix)

---

## 1. บทบาทและบริบท

```
คุณคือ Senior Full-Stack TypeScript Engineer ที่เชี่ยวชาญใน:
- discord.js v14 (Slash Commands, Buttons, Modals, Select Menus, Embeds)
- Next.js 14 App Router (Server Components, API Routes, NextAuth)
- Prisma ORM + Supabase (PostgreSQL)
- Vanilla CSS (Dark Theme, Apple-inspired aesthetic)
- Cloudflare R2 (Object Storage)

คุณกำลังทำงานบน Monorepo ชื่อ "LynnBot" — ระบบจัดการแอดมินดิสคอร์ดครบวงจร
สำหรับเซิร์ฟเวอร์ Discord ของคนไทย ภาษาหลักของ UI คือภาษาไทย
```

## 2. สถาปัตยกรรมปัจจุบัน

### โครงสร้าง Monorepo
```
LynnBot/
├── apps/
│   ├── bot/                    # Discord Bot (discord.js v14 + TypeScript)
│   │   └── src/
│   │       ├── commands/       # 13 slash commands
│   │       │   ├── admin.ts, attendance.ts, backup.ts, buy.ts
│   │       │   ├── clockin.ts, clockout.ts, dynamicVoice.ts
│   │       │   ├── help.ts, leave.ts, panel.ts, shop.ts
│   │       │   ├── ticket.ts, wallet.ts
│   │       ├── events/         # 5 event handlers
│   │       │   ├── ready.ts, interactionCreate.ts, messageCreate.ts
│   │       │   ├── voiceStateUpdate.ts, guildMemberAdd.ts
│   │       ├── services/       # 11 services
│   │       │   ├── attendanceService.ts, backupService.ts
│   │       │   ├── dynamicVoiceService.ts, panelService.ts
│   │       │   ├── panelInteractionService.ts (1295 lines — ใหญ่มาก)
│   │       │   ├── promptpayService.ts, r2Service.ts
│   │       │   ├── slipService.ts, slipVerificationService.ts
│   │       │   ├── ticketService.ts, truemoneyService.ts
│   │       └── utils/theme.ts
│   │
│   └── web/                    # Next.js 14 Web Dashboard
│       ├── app/
│       │   ├── (dashboard)/    # 14+ dashboard pages
│       │   │   ├── page.tsx (Dashboard home — 789 lines)
│       │   │   ├── admins/, announcements/, attendance/
│       │   │   ├── backups/, bot-status/, finance/
│       │   │   ├── leaves/, logs/, permissions/
│       │   │   ├── settings/, shop/, slips/
│       │   │   ├── tickets/, voice/
│       │   ├── api/            # 18 API route groups
│       │   ├── login/, rules/
│       │   └── globals.css     # 4248 lines Apple Pro Dark Design System
│       ├── components/         # 32 React components
│       └── lib/                # auth.ts, utils.ts, confetti.ts, etc.
│
└── packages/
    └── database/               # Shared Prisma schema
        └── prisma/schema.prisma  # 15 models, 505 lines
```

### Prisma Models ที่มี
```
User, Account, Session, Attendance, ShopRole, Transaction,
AuditLog, BotSession, Permission, Setting, VoiceSession,
Ticket, RoleBackup, WalletTransaction, LeaveRequest,
Slip, FinanceRecord, DynamicVoiceConfig
```

### Bot Panels ที่มี (Persistent Interactive Panels)
1. ⏱️ Attendance Station — ตอกบัตรเข้า/ออก + เช็คสถานะ
2. 📝 Staff Leave System — ยื่นคำขอลา + เช็คสถานะ
3. 🛒 Shop & Wallet — เลือกซื้อยศ + กระเป๋าเงิน + เติมเงิน
4. 📩 Ticket Support — เปิดทิกเก็ตติดต่อทีมงาน
5. 🛡️ Staff Control Hub — รายชื่อทีมงาน + อนุมัติลา + Backup

### Design System
- Font: Prompt (Thai) + JetBrains Mono
- Color scheme: Apple Pro Dark (#000000 base, #2997ff accent, #30d158 success, #ff9f0a warning, #ff453a danger)
- Components: HolographicCard, CyberBackground, TiltCard, LynnCoreOrb, CommandPalette (⌘K)

---

## 3. Phase 1 — ปรับปรุงระบบที่มีอยู่ (Quick Wins)

### 3.1 🔔 ระบบ Notification Center บน Dashboard
**ปัญหา**: ไม่มีระบบแจ้งเตือน real-time บน Dashboard — แอดมินต้องเข้าแต่ละหน้าเองเพื่อเช็คงานค้าง

**สิ่งที่ต้องทำ**:
- สร้าง Notification Bell component ที่มุมขวาบนของ Navbar
- ดึง pending items: สลิปรอตรวจ, ทิกเก็ตเปิด, คำขอลารออนุมัติ, สมาชิกใหม่
- แสดง Badge ตัวเลขจำนวนรวม + dropdown แสดงรายการ
- คลิกแต่ละรายการ navigate ไปหน้าที่เกี่ยวข้อง
- สร้าง API endpoint: `GET /api/notifications` ที่ aggregate ข้อมูลจากหลาย model

**ไฟล์ที่เกี่ยวข้อง**:
- สร้างใหม่: `components/NotificationCenter.tsx`
- แก้ไข: `components/Navbar.tsx` (เพิ่ม Notification icon ใน header)
- สร้างใหม่: `app/api/notifications/route.ts`

---

### 3.2 📊 Dashboard Analytics แบบ Real-time Charts
**ปัญหา**: หน้า Dashboard หลักแสดงเฉพาะตัวเลขสรุป ไม่มีกราฟวิเคราะห์แนวโน้ม

**สิ่งที่ต้องทำ**:
- เพิ่ม Section "Analytics Overview" ใน Dashboard page
- กราฟเส้น: ยอดขายยศ 30 วันย้อนหลัง (Line Chart)
- กราฟแท่ง: ชั่วโมงทำงานของทีมงานรายสัปดาห์ (Bar Chart)
- Donut Chart: สัดส่วนสถานะทิกเก็ต (Open/Claimed/Closed)
- ใช้ Canvas API หรือ lightweight chart library (ไม่ใช้ heavy dependencies)
- Responsive — ย่อเป็น stack บนมือถือ

**ไฟล์ที่เกี่ยวข้อง**:
- สร้างใหม่: `components/AnalyticsCharts.tsx`
- แก้ไข: `app/(dashboard)/page.tsx` (เพิ่ม section)
- สร้างใหม่: `app/api/analytics/route.ts`

---

### 3.3 🔄 Refactor panelInteractionService.ts
**ปัญหา**: ไฟล์ `panelInteractionService.ts` มี 1,295 บรรทัด รวม handler ของทุก panel ไว้ในไฟล์เดียว ทำให้ยากต่อการบำรุงรักษา

**สิ่งที่ต้องทำ**:
- แยกเป็น module ย่อย:
  - `services/panels/attendancePanelHandler.ts`
  - `services/panels/leavePanelHandler.ts`
  - `services/panels/shopPanelHandler.ts`
  - `services/panels/walletPanelHandler.ts`
  - `services/panels/adminHubPanelHandler.ts`
- สร้าง barrel export: `services/panels/index.ts`
- อัปเดต imports ใน `events/interactionCreate.ts`

---

### 3.4 📱 ปรับปรุง Mobile Experience ของ Dashboard
**ปัญหา**: มี `MobileBottomNav.tsx` แต่หลายหน้ามี table/grid ที่ไม่ responsive สมบูรณ์

**สิ่งที่ต้องทำ**:
- ตรวจสอบและปรับ responsive breakpoints ในทุก Manager component
- เพิ่ม horizontal scroll สำหรับตารางข้อมูลบนมือถือ
- ปรับ Card layout เป็น single column บนหน้าจอเล็ก
- เพิ่ม Pull-to-refresh gesture สำหรับหน้าที่มี list data

---

## 4. Phase 2 — ฟีเจอร์ใหม่สำหรับ Dashboard

### 4.1 📅 ปฏิทินตารางเวร (Staff Scheduling Calendar)
**รายละเอียด**: ระบบจัดตารางเวร/กะทำงานแบบ visual calendar

**สิ่งที่ต้องทำ**:

**Database** — เพิ่ม model ใน `schema.prisma`:
```prisma
model ShiftSchedule {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date        DateTime
  shiftType   String   // "MORNING", "AFTERNOON", "EVENING", "NIGHT"
  startTime   String   // "09:00"
  endTime     String   // "17:00"
  note        String?
  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, date])
  @@index([date])
  @@map("shift_schedules")
}
```

**Dashboard**:
- สร้าง `components/ShiftCalendar.tsx` — Monthly/Weekly calendar view
- แสดงชื่อแอดมินที่ได้รับมอบหมายในแต่ละวัน
- ลาก-วาง (Drag & Drop) เพื่อจัดตาราง
- แสดงสีตาม shift type
- สร้างหน้า `app/(dashboard)/schedule/page.tsx`
- สร้าง API: `app/api/schedule/route.ts` (CRUD)

**Bot**:
- เพิ่มคำสั่ง `/schedule today` — ดูตารางเวรวันนี้
- เพิ่มคำสั่ง `/schedule week` — ดูตารางเวรสัปดาห์นี้
- เพิ่มปุ่มในแผง Staff Control Hub: "ตารางเวรวันนี้"

---

### 4.2 🏆 ระบบ Leaderboard & Gamification
**รายละเอียด**: กระดานผู้นำ ranking แอดมินตามผลงาน เพิ่มแรงจูงใจ

**สิ่งที่ต้องทำ**:

**Database** — เพิ่ม model:
```prisma
model Badge {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  icon        String   // emoji or image URL
  criteria    String   // e.g. "attendance_streak_7", "tickets_closed_50"
  tier        String   @default("BRONZE") // BRONZE, SILVER, GOLD, DIAMOND
  createdAt   DateTime @default(now())

  userBadges  UserBadge[]

  @@map("badges")
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badgeId   String
  badge     Badge    @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  earnedAt  DateTime @default(now())

  @@unique([userId, badgeId])
  @@map("user_badges")
}
```

**Dashboard**:
- สร้าง `components/Leaderboard.tsx`:
  - Top 10 แอดมินที่ทำงานมากที่สุด (ชั่วโมงรวม)
  - Top 10 ที่ปิดทิกเก็ตมากที่สุด
  - Top 10 ที่ตอกบัตรสม่ำเสมอที่สุด (streak ติดต่อกัน)
- สร้าง `components/BadgeShowcase.tsx` — แสดง badges ที่ได้รับ
- สร้างหน้า `app/(dashboard)/leaderboard/page.tsx`
- API: `app/api/leaderboard/route.ts`

**Bot**:
- เพิ่มคำสั่ง `/leaderboard` — แสดง Top 5 ใน Discord embed
- ระบบแจ้งเตือนอัตโนมัติเมื่อได้รับ Badge ใหม่ผ่าน DM

---

### 4.3 📝 ระบบ Staff Notes & Internal Wiki
**รายละเอียด**: บันทึกภายในสำหรับทีมงาน เช่น SOP, วิธีจัดการปัญหา, FAQ ภายใน

**สิ่งที่ต้องทำ**:

**Database**:
```prisma
model StaffNote {
  id          String   @id @default(cuid())
  title       String
  content     String   @db.Text
  category    String   @default("GENERAL") // SOP, FAQ, GUIDE, MEMO
  isPinned    Boolean  @default(false)
  authorId    String
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
  @@index([isPinned])
  @@map("staff_notes")
}
```

**Dashboard**:
- สร้าง `components/StaffNotesManager.tsx` — CRUD interface
- รองรับ Markdown rendering สำหรับ content
- ระบบ Pin สำคัญ + Search + Filter by category
- สร้างหน้า `app/(dashboard)/notes/page.tsx`

---

### 4.4 📈 รายงาน Export & สรุปรายเดือน
**รายละเอียด**: ระบบสร้างรายงานสรุปรายเดือนแบบ automated

**สิ่งที่ต้องทำ**:
- สร้าง `components/ReportGenerator.tsx`
- สรุปรายเดือน:
  - จำนวนชั่วโมงทำงานรวมของแต่ละแอดมิน
  - จำนวนทิกเก็ตที่จัดการ
  - ยอดขายยศ + รายรับ/รายจ่าย
  - อัตราการลางานสะสม
- Export เป็น PDF หรือ CSV
- API: `app/api/reports/route.ts`
- เพิ่ม navigation ใน Navbar ภายใต้หมวด "ทีมงาน"

---

### 4.5 🌐 Public Member Portal
**รายละเอียด**: หน้าสาธารณะสำหรับสมาชิกทั่วไป (ไม่ใช่แอดมิน) ดูข้อมูลบางส่วนได้

**สิ่งที่ต้องทำ**:
- สร้าง route group `app/(public)/` สำหรับหน้าสาธารณะ
- หน้า `/public/shop` — ดูรายการยศที่ขายพร้อมราคา (read-only)
- หน้า `/public/staff` — ดูรายชื่อทีมงานและสถานะออนไลน์
- หน้า `/public/status` — สถานะเซิร์ฟเวอร์ / บอท
- อัปเดต `middleware.ts` ให้ allow paths ที่ขึ้นต้นด้วย `/public`

---

## 5. Phase 3 — ฟีเจอร์ใหม่สำหรับ Discord Bot

### 5.1 🎉 ระบบ Giveaway & Event
**รายละเอียด**: จัดกิจกรรม Giveaway ภายในเซิร์ฟเวอร์

**สิ่งที่ต้องทำ**:

**Database**:
```prisma
model Giveaway {
  id            String         @id @default(cuid())
  title         String
  description   String?
  prize         String
  channelId     String
  messageId     String?        @unique
  hostId        String         // Discord ID of host
  hostName      String
  maxWinners    Int            @default(1)
  endsAt        DateTime
  isActive      Boolean        @default(true)
  entries       GiveawayEntry[]

  createdAt     DateTime       @default(now())

  @@index([isActive])
  @@index([endsAt])
  @@map("giveaways")
}

model GiveawayEntry {
  id          String   @id @default(cuid())
  giveawayId  String
  giveaway    Giveaway @relation(fields: [giveawayId], references: [id], onDelete: Cascade)
  discordId   String
  discordName String

  createdAt   DateTime @default(now())

  @@unique([giveawayId, discordId])
  @@map("giveaway_entries")
}
```

**Bot**:
- คำสั่ง `/giveaway create <prize> <duration> [max_winners] [channel]`
  - สร้าง embed สวยงามพร้อมปุ่ม "🎉 เข้าร่วม"
  - นับถอยหลังแบบ real-time (แก้ไข embed ทุก 1 นาที)
- คำสั่ง `/giveaway end <id>` — จบก่อนกำหนดและประกาศผู้ชนะ
- คำสั่ง `/giveaway reroll <id>` — สุ่มผู้ชนะใหม่
- ระบบ cron ที่เช็คทุก 30 วินาที สำหรับ giveaway ที่ถึงเวลาสิ้นสุด
- Panel: เพิ่มแผง "🎉 Giveaway Panel" ใน panelService.ts

**Dashboard**:
- สร้าง `components/GiveawayManager.tsx` — จัดการ Giveaway จากเว็บ
- สร้างหน้า `app/(dashboard)/giveaways/page.tsx`

---

### 5.2 📊 ระบบ Poll & Voting
**รายละเอียด**: สร้างโพลและการโหวตใน Discord

**สิ่งที่ต้องทำ**:

**Database**:
```prisma
model Poll {
  id          String       @id @default(cuid())
  question    String
  channelId   String
  messageId   String?      @unique
  creatorId   String
  creatorName String
  isAnonymous Boolean      @default(false)
  isMultiple  Boolean      @default(false) // allow multiple votes
  endsAt      DateTime?
  isActive    Boolean      @default(true)
  options     PollOption[]

  createdAt   DateTime     @default(now())

  @@map("polls")
}

model PollOption {
  id       String     @id @default(cuid())
  pollId   String
  poll     Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  label    String
  emoji    String?
  votes    PollVote[]

  @@map("poll_options")
}

model PollVote {
  id        String     @id @default(cuid())
  optionId  String
  option    PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  discordId String

  createdAt DateTime   @default(now())

  @@unique([optionId, discordId])
  @@map("poll_votes")
}
```

**Bot**:
- คำสั่ง `/poll create <question>` — เปิด Modal ให้กรอก choices
- แสดง embed พร้อมปุ่มสำหรับแต่ละตัวเลือก + progress bar แบบ text
- คำสั่ง `/poll end <id>` — ปิดโพลและแสดงผลลัพธ์

---

### 5.3 ⚠️ ระบบ Warn & Moderation Log
**รายละเอียด**: บันทึกการเตือน/ลงโทษสมาชิก

**สิ่งที่ต้องทำ**:

**Database**:
```prisma
model Warning {
  id          String   @id @default(cuid())
  discordId   String   // Target member
  discordName String
  issuedById  String   // Admin discord ID
  issuedBy    String   // Admin name
  reason      String
  severity    String   @default("LOW") // LOW, MEDIUM, HIGH, CRITICAL
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())

  @@index([discordId])
  @@index([severity])
  @@map("warnings")
}
```

**Bot**:
- คำสั่ง `/warn <user> <reason> [severity]` — เตือนสมาชิก + บันทึก + DM แจ้ง
- คำสั่ง `/warnings <user>` — ดูประวัติการเตือน
- คำสั่ง `/unwarn <warn_id>` — ยกเลิกการเตือน
- ระบบ auto-action: เตือนครบ 3 ครั้ง = mute อัตโนมัติ, ครบ 5 ครั้ง = kick

**Dashboard**:
- สร้าง `components/ModerationManager.tsx`
- สร้างหน้า `app/(dashboard)/moderation/page.tsx`
- แสดง warn history, statistics, severity distribution

---

### 5.4 🎵 ระบบ Auto-Role by Reaction (Reaction Roles)
**รายละเอียด**: สมาชิกกด reaction บน message เพื่อรับยศอัตโนมัติ

**สิ่งที่ต้องทำ**:

**Database**:
```prisma
model ReactionRole {
  id          String @id @default(cuid())
  guildId     String
  channelId   String
  messageId   String
  emoji       String // Unicode emoji or custom emoji ID
  roleId      String // Discord role ID
  roleName    String

  createdAt   DateTime @default(now())

  @@unique([messageId, emoji])
  @@index([guildId])
  @@map("reaction_roles")
}
```

**Bot**:
- คำสั่ง `/reactionrole setup <channel> <role> <emoji> [message]`
  - สร้าง embed หรือใส่ reaction บน message ที่ระบุ
- Event handler: `messageReactionAdd` / `messageReactionRemove`
  - เช็ค config แล้ว add/remove role อัตโนมัติ
- คำสั่ง `/reactionrole list` — ดู config ทั้งหมด
- คำสั่ง `/reactionrole remove <message_id> <emoji>`

---

### 5.5 📢 ระบบ Auto-Announcement Scheduler
**รายละเอียด**: ตั้งเวลาส่งข้อความ/embed อัตโนมัติเข้าห้อง Discord ตามกำหนด

**สิ่งที่ต้องทำ**:

**Database**:
```prisma
model ScheduledMessage {
  id          String   @id @default(cuid())
  guildId     String
  channelId   String
  content     String?  @db.Text
  embedData   Json?    // Serialized embed object
  cronExpr    String?  // Cron expression for recurring
  scheduledAt DateTime? // For one-time messages
  isRecurring Boolean  @default(false)
  isActive    Boolean  @default(true)
  lastSentAt  DateTime?
  createdBy   String

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive])
  @@map("scheduled_messages")
}
```

**Bot**:
- Cron runner ที่เช็คทุก 1 นาที สำหรับ messages ที่ถึงเวลา
- คำสั่ง `/schedule-msg create` — Modal สำหรับตั้งค่า
- คำสั่ง `/schedule-msg list` — ดูรายการที่ตั้งไว้
- คำสั่ง `/schedule-msg cancel <id>`

**Dashboard**:
- เพิ่ม interface สร้าง/จัดการ scheduled messages ใน AnnouncementStudio

---

## 6. Phase 4 — ฟีเจอร์ขั้นสูง (Advanced)

### 6.1 🤖 ระบบ Auto-Moderation (Content Filter)
**รายละเอียด**: กรองข้อความอัตโนมัติ — spam, link ต้องห้าม, คำหยาบ

**สิ่งที่ต้องทำ**:
- เพิ่ม Settings key ใน DB:
  - `automod_enabled`: true/false
  - `automod_blocked_words`: comma-separated list
  - `automod_blocked_links`: domains list
  - `automod_spam_threshold`: ข้อความกี่อันภายใน 5 วินาที
  - `automod_action`: "WARN", "MUTE", "DELETE"
  - `automod_log_channel`: channel ID
- เพิ่มตรวจสอบใน `messageCreate.ts` event handler
- ส่ง log ไปยัง channel ที่กำหนด
- ตั้งค่าได้จาก Dashboard Settings

---

### 6.2 📊 Staff Performance Dashboard (Individual Profile)
**รายละเอียด**: หน้า profile รายบุคคลของแอดมินแต่ละคน แสดงสถิติผลงานครบถ้วน

**สิ่งที่ต้องทำ**:
- สร้างหน้า `app/(dashboard)/staff/[id]/page.tsx`
- แสดง:
  - ข้อมูลส่วนตัว + avatar + role
  - สถิติตอกบัตร: ชม.รวม, วันที่ทำงาน, avg ชม./วัน, streak
  - สถิติทิกเก็ต: จำนวนที่ claim + ปิด
  - สถิติลา: จำนวนวันลาในเดือนนี้
  - ประวัติ Wallet Transactions
  - Badges ที่ได้รับ
  - Timeline กิจกรรมล่าสุดจาก Audit Logs
- ออกแบบเป็น Profile Card สวยงามสไตล์ Apple

---

### 6.3 🔗 Discord-Dashboard Real-time Sync (WebSocket / SSE)
**รายละเอียด**: เชื่อม Bot ↔ Dashboard แบบ real-time

**สิ่งที่ต้องทำ**:
- Bot ส่ง event ไปยัง Dashboard ผ่าน API endpoint เมื่อมีเหตุการณ์สำคัญ:
  - สมาชิกตอกบัตรเข้า/ออก
  - มีสลิปใหม่เข้ามา
  - ทิกเก็ตถูกสร้าง/ปิด
  - สมาชิกใหม่เข้าเซิร์ฟเวอร์
- Dashboard ใช้ Server-Sent Events (SSE) หรือ polling interval เพื่อ refresh ข้อมูล
- แสดง Live Feed บนหน้า Dashboard หลัก
- สร้าง `app/api/events/stream/route.ts` (SSE endpoint)

---

### 6.4 📋 Task Assignment & To-Do System
**รายละเอียด**: มอบหมายงานให้แอดมินแต่ละคน

**สิ่งที่ต้องทำ**:

**Database**:
```prisma
model Task {
  id           String     @id @default(cuid())
  title        String
  description  String?    @db.Text
  assigneeId   String?
  assignee     User?      @relation("AssignedTasks", fields: [assigneeId], references: [id])
  assignedById String
  assignedBy   User       @relation("CreatedTasks", fields: [assignedById], references: [id])
  priority     String     @default("MEDIUM") // LOW, MEDIUM, HIGH, URGENT
  status       String     @default("TODO")   // TODO, IN_PROGRESS, DONE, CANCELLED
  dueDate      DateTime?
  completedAt  DateTime?

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([assigneeId])
  @@index([status])
  @@index([priority])
  @@map("tasks")
}
```

**Dashboard**:
- สร้าง `components/TaskBoard.tsx` — Kanban board (TODO → IN_PROGRESS → DONE)
- Drag & Drop เพื่อเปลี่ยนสถานะ
- Filter by assignee, priority, due date

**Bot**:
- คำสั่ง `/task create <title> [assignee] [priority] [due]`
- คำสั่ง `/task list [mine|all]`
- คำสั่ง `/task done <id>`
- DM แจ้งเตือนเมื่อถูกมอบหมายงาน + เตือนก่อน due date

---

## 7. กฎการเขียนโค้ด (Coding Conventions)

### ข้อกำหนดสำคัญที่ต้องปฏิบัติตามเสมอ:

```typescript
// ✅ Pattern ที่ถูกต้อง — ใช้ตาม codebase ที่มี

// 1. Bot Commands — ใช้ pattern นี้เสมอ
export const myCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("command-name")
    .setDescription("คำอธิบายภาษาไทย"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    // ... logic
  },
};

// 2. Prisma — ใช้ upsert pattern สำหรับ ensure user exists
const user = await prisma.user.upsert({
  where: { discordId: interaction.user.id },
  update: { username: interaction.user.username },
  create: {
    discordId: interaction.user.id,
    username: interaction.user.username,
    role: "ADMIN",
  },
});

// 3. Embeds — ใช้ theme colors จาก utils/theme.ts
const embed = new EmbedBuilder()
  .setColor(THEME_COLORS.surface) // ใช้ theme ไม่ hardcode
  .setTitle("🏷️ Title ภาษาไทย")
  .setFooter({ text: "LynnBot Operations System • Feature Name" })
  .setTimestamp();

// 4. API Routes — ใช้ pattern นี้
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... logic
}

// 5. Components — "use client" เฉพาะเมื่อจำเป็น
// Server Components เป็นค่า default
// ใช้ Vanilla CSS classes จาก globals.css
```

### CSS Convention:
```css
/* ใช้ CSS Variables จาก :root ที่มีอยู่ */
/* ตั้งชื่อ class แบบ BEM-lite: component-element-modifier */
/* ทุก component ต้องรองรับ responsive */
/* อ้างอิง design system: Apple Pro Dark */

.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
}
.feature-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
```

### สิ่งที่ห้ามทำ:
- ❌ ห้ามใช้ TailwindCSS
- ❌ ห้ามเพิ่ม heavy dependencies ที่ไม่จำเป็น (เช่น Chart.js ขนาดใหญ่ → ใช้ Canvas API แทน)
- ❌ ห้าม hardcode Discord IDs ลงในโค้ด (ใช้ Settings model)
- ❌ ห้ามสร้าง API routes ที่ไม่มี auth check (ยกเว้น public routes)
- ❌ ห้ามเขียนโค้ดภาษาอังกฤษสำหรับ user-facing text — UI labels ใช้ภาษาไทยเป็นหลัก

---

## 8. ลำดับความสำคัญ (Priority Matrix)

| Priority | Feature | ประเภท | ความซับซ้อน | ผลกระทบ |
|----------|---------|--------|-------------|---------|
| 🔴 P0 | Notification Center | Dashboard | ต่ำ | สูงมาก — แก้ pain point หลัก |
| 🔴 P0 | Dashboard Analytics Charts | Dashboard | กลาง | สูง — เพิ่ม visibility |
| 🟠 P1 | Warn & Moderation | Bot + Dashboard | กลาง | สูง — ฟีเจอร์พื้นฐานที่ขาด |
| 🟠 P1 | Refactor panelInteractionService | Bot | ต่ำ | สูง — maintainability |
| 🟡 P2 | Staff Scheduling Calendar | Dashboard + Bot | สูง | กลาง-สูง |
| 🟡 P2 | Giveaway System | Bot + Dashboard | กลาง | สูง — engagement |
| 🟡 P2 | Poll & Voting | Bot | กลาง | กลาง |
| 🟡 P2 | Reaction Roles | Bot | ต่ำ | กลาง |
| 🟢 P3 | Leaderboard & Gamification | Dashboard + Bot | สูง | กลาง |
| 🟢 P3 | Staff Notes / Wiki | Dashboard | กลาง | กลาง |
| 🟢 P3 | Report Export | Dashboard | กลาง | กลาง |
| 🟢 P3 | Public Member Portal | Dashboard | ต่ำ | ต่ำ-กลาง |
| 🔵 P4 | Auto-Moderation | Bot | สูง | สูง (ระยะยาว) |
| 🔵 P4 | Staff Profile Page | Dashboard | กลาง | กลาง |
| 🔵 P4 | Real-time Sync (SSE) | Bot + Dashboard | สูง | กลาง-สูง |
| 🔵 P4 | Task Assignment Board | Dashboard + Bot | สูง | กลาง |
| 🔵 P4 | Scheduled Messages | Bot + Dashboard | กลาง | กลาง |
| 🔵 P4 | Mobile UX Polish | Dashboard | ต่ำ-กลาง | กลาง |

---

## 📌 คำแนะนำในการเริ่มต้น

เมื่อได้รับ prompt นี้ ให้ทำตามขั้นตอนนี้:

1. **ถาม Owner ก่อน** — ถามว่าต้องการเริ่มจาก feature ไหน (อ้างอิงจาก Priority Matrix ด้านบน)
2. **อ่าน schema.prisma** ก่อนเพิ่ม model ใหม่ เพื่อตรวจสอบ naming convention และ relation pattern
3. **อ่าน globals.css** ก่อนเขียน CSS ใหม่ เพื่อ reuse variables และ class ที่มี
4. **อ่าน panelService.ts** ก่อนสร้าง Panel ใหม่ เพื่อทำตาม embed format เดิม
5. **ทดสอบ TypeScript build** ด้วย `npx tsc --noEmit` ทุกครั้งหลังเขียนโค้ด
6. **เพิ่ม Audit Log** ทุกครั้งที่มี action สำคัญ (สร้าง/แก้ไข/ลบ)
7. **อัปเดต deploy-commands.ts** ทุกครั้งที่เพิ่ม slash command ใหม่

---

*สร้างโดย: LynnBot Lead Architect — วิเคราะห์จาก Codebase จริง ณ วันที่ 3 ตุลาคม 2569*
