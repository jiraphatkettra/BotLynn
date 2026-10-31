# 🤖 LynnBot — Master System Architecture & AI Handover Guide

> **สำหรับ AI / Full-Stack Engineer ที่จะมารับช่วงต่อ**: เอกสารนี้สรุปข้อมูลเชิงลึกทางเทคนิค โครงสร้างสถาปัตยกรรม ฟังก์ชันการทำงานทั้งหมดของทั้ง **Discord Bot** และ **Web Dashboard** รวมถึงจุดสำคัญที่ต้องระวัง (Gotchas & Caveats) ของโปรเจกต์ **LynnBot** อย่างครบถ้วนที่สุด

---

## 📑 สารบัญ (Table of Contents)

1. [ภาพรวมระบบและปรัชญาการออกแบบ (System Overview & Philosophy)](#1-ภาพรวมระบบและปรัชญาการออกแบบ)
2. [สถาปัตยกรรม Monorepo และ Tech Stack](#2-สถาปัตยกรรม-monorepo-และ-tech-stack)
3. [ระบบความปลอดภัย สิทธิ์ และ Root Owner (Security & RBAC)](#3-ระบบความปลอดภัย-สิทธิ์-และ-root-owner)
4. [ฐานข้อมูลและ Prisma Schema (29 Models Deep Dive)](#4-ฐานข้อมูลและ-prisma-schema)
5. [ฟังก์ชันและการทำงานของ Discord Bot](#5-ฟังก์ชันและการทำงานของ-discord-bot)
   - [5.1 รายการ Slash Commands ทั้งหมด (32 คำสั่ง)](#51-รายการ-slash-commands-ทั้งหมด-32-คำสั่ง)
   - [5.2 แผงควบคุมถาวรแบบปุ่มกด (6 Persistent Interactive Panels)](#52-แผงควบคุมถาวรแบบปุ่มกด-6-persistent-interactive-panels)
   - [5.3 เซอร์วิสหลักของบอท (Core Bot Services)](#53-เซอร์วิสหลักของบอท-core-bot-services)
   - [5.4 Background Jobs & Cron Tasks](#54-background-jobs--cron-tasks)
6. [ฟังก์ชันและการทำงานของ Web Dashboard](#6-ฟังก์ชันและการทำงานของ-web-dashboard)
   - [6.1 หน้า Dashboard ทั้งหมด (23 หน้าหลัก)](#61-หน้า-dashboard-ทั้งหมด-23-หน้าหลัก)
   - [6.2 หน้าสาธารณะ (Public Pages)](#62-หน้าสาธารณะ-public-pages)
   - [6.3 สถาปัตยกรรม API Routes (35+ Endpoints)](#63-สถาปัตยกรรม-api-routes)
   - [6.4 ระบบ Real-time SSE & Live Activity Feed](#64-ระบบ-real-time-sse--live-activity-feed)
   - [6.5 ระบบ Visual Embed Editor & Studio](#65-ระบบ-visual-embed-editor--studio)
7. [ระบบการเงิน ตรวจสลิป และ Storage (Financial & Slip Verification Engine)](#7-ระบบการเงิน-ตรวจสลิป-และ-storage)
8. [ระบบ Dynamic Voice Channel Room Manager](#8-ระบบ-dynamic-voice-channel-room-manager)
9. [Environment Variables และการตั้งค่าระบบ (.env Reference)](#9-environment-variables-และการตั้งค่าระบบ)
10. [คำสั่งพัฒนาและวิธีรันระบบ (Developer Runbook & Scripts)](#10-คำสั่งพัฒนาและวิธีรันระบบ)
11. [ข้อควรระวังสำคัญสำหรับ AI ที่มารับช่วงต่อ (Crucial Gotchas & Design Rules)](#11-ข้อควรระวังสำคัญสำหรับ-ai-ที่มารับช่วงต่อ)

---

## 1. ภาพรวมระบบและปรัชญาการออกแบบ

**LynnBot** คือแพลตฟอร์มบริหารจัดการและดูแลคอมมูนิตี้ Discord สำหรับเซิร์ฟเวอร์ไทยแบบ Full-Stack ครบวงจร โดยเชื่อมประสานสองส่วนเข้าด้วยกันอย่างราบรื่น:
1. **Discord Bot (discord.js v14)** — ทำงานแบบ Event-driven ดูแลสมาชิกในแชทและห้องเสียงแบบ Real-time มี Interactive Panels, Slash Commands, Auto-mod, และ Background Cron
2. **Web Dashboard (Next.js 14 App Router)** — หน้าเว็บควบคุมระบบแบบ Centralized สำหรับเจ้าของเซิร์ฟเวอร์และทีมงานแอดมิน ด้วยสไตล์ **Apple Pro Cyber-Dark Theme** (OLED `#000000`, เส้นขอบ hairline, Frosted Glass, ตัวอักษร Prompt + JetBrains Mono)

ทั้งสองระบบเชื่อมต่อกันผ่านฐานข้อมูล **PostgreSQL (Supabase)** เดียวกัน มีการ Sync ข้อมูลแบบ 2 ทาง และสตรีมกิจกรรมสดผ่าน Server-Sent Events (SSE)

```mermaid
flowchart TB
    subgraph Discord["Discord Ecosystem"]
        Member["ผู้ใช้งาน / สมาชิก"]
        Staff["ทีมงาน / แอดมิน"]
        Bot["🤖 LynnBot (discord.js v14)"]
        Channels["ห้องแชท / ห้องเสียง / Panels"]
    end

    subgraph Core["Core Storage & Services"]
        DB[("🐘 PostgreSQL (Supabase) via Prisma")]
        R2["☁️ Cloudflare R2 (Object Storage)"]
        SlipAPI["💳 SlipOK / EasySlip API"]
        TrueMoneyAPI["🧧 TrueMoney Voucher API"]
    end

    subgraph Web["Web Dashboard (Next.js 14)"]
        DashboardUI["🖥️ Admin Dashboard (NextAuth + Discord OAuth2)"]
        PublicUI["🌐 Public Portal (Shop / Staff / Status / Rules)"]
        API["⚡ Next.js API Routes + SSE Stream"]
    end

    Member -->|พิมพ์คำสั่ง / กดปุ่ม| Bot
    Staff -->|สั่งงานบอท / รับเรื่อง| Bot
    Bot <-->|Sync สถานะ / กิจกรรม| DB
    Bot -->|สำรองสลิปภาพถาวร| R2
    Bot -->|ตรวจสอบสลิปอัตโนมัติ| SlipAPI
    Bot -->|ดึงเงินซองของขวัญ| TrueMoneyAPI

    DashboardUI -->|อ่าน/เขียนข้อมูล| API
    PublicUI -->|ดูหน้าร้านค้า/สถานะ| API
    API <--> DB
    API -->|ส่งข้อความ / จัดการบทบาท| Discord
    API -->|Live Event Stream| DashboardUI
```

---

## 2. สถาปัตยกรรม Monorepo และ Tech Stack

โปรเจกต์จัดโครงสร้างแบบ **NPM Workspaces Monorepo**:

```
LynnBot/
├── apps/
│   ├── bot/                 # Discord Bot Application
│   │   ├── src/
│   │   │   ├── commands/    # 32 Slash Commands
│   │   │   ├── events/      # 7 Discord Gateway Event Handlers
│   │   │   ├── services/    # 13 Core Domain Services
│   │   │   │   └── panels/  # 7 Modular Panel Button/Modal Handlers
│   │   │   ├── utils/       # Theme, formatting, Discord colors
│   │   │   ├── deploy-commands.ts # สคริปต์ลงทะเบียน Slash Commands
│   │   │   └── index.ts     # จุดเริ่มต้นของบอท + Health Check Server (Port 3001)
│   │   └── package.json
│   │
│   └── web/                 # Next.js 14+ Web Dashboard
│       ├── app/
│       │   ├── (dashboard)/ # 23 หน้า Dashboard สำหรับแอดมิน
│       │   ├── api/         # 35+ API Endpoints (REST + SSE)
│       │   ├── public/      # หน้า Public Portal (Shop, Staff, Status)
│       │   ├── login/       # หน้า Discord OAuth2 Sign-in
│       │   ├── rules/       # หน้าระเบียบเซิร์ฟเวอร์
│       │   └── globals.css  # ระบบดีไซน์ Apple Dark Cyber Minimal
│       ├── components/      # 38+ React Components (Modular UI, Modals, Charts)
│       ├── lib/             # auth.ts, utils.ts, embedPresets.ts, rulesData.ts
│       └── package.json
│
├── packages/
│   └── database/            # Shared Database Client
│       ├── prisma/
│       │   ├── schema.prisma # นิยาม 29 Data Models
│       │   └── seed.ts       # ข้อมูลตั้งต้นระบบ (Default Settings, Sample Roles)
│       ├── index.ts         # Export `prisma` client instance + `isRootOwner`
│       └── package.json
│
├── .env                     # ตัวแปรระบบหลัก (ใช้ร่วมกันทั้ง Monorepo)
├── .env.example             # ตัวอย่างคอนฟิกตัวแปรระบบ
├── package.json             # Root Workspace Configuration
└── tsconfig.json
```

### สรุป Tech Stack รายส่วน

| ส่วนของระบบ | เทคโนโลยีที่เลือกใช้ | รายละเอียดการนำไปใช้ |
|---|---|---|
| **Monorepo Manager** | npm workspaces | จัดการ dependencies ระหว่าง `apps/*` และ `packages/*` |
| **Language** | TypeScript 5.5+ | พัฒนาด้วย Strict Type ทั่วทั้งโปรเจกต์ |
| **Bot Framework** | discord.js v14.16+ | Gateway Intents, Slash Commands, Modals, Components, Embeds |
| **Web Framework** | Next.js 14+ (App Router) | Server Components, Server Actions, Dynamic API Routes, Route Groups |
| **Database ORM** | Prisma ORM 5.22+ | Type-safe Queries, Migrations, Connection Pooling |
| **Database** | PostgreSQL on Supabase | Transactional Pooler (`DATABASE_URL`) + Direct Session (`DIRECT_URL`) |
| **Authentication** | NextAuth.js 4+ | Discord OAuth2 Provider (`identify`, `email`, `guilds`), JWT caching |
| **Cloud Storage** | Cloudflare R2 (`@aws-sdk/client-s3`) | เก็บสลิปโอนเงินและหลักฐานถาวร ป้องกัน Discord CDN Expired Links |
| **Styling & UI** | Vanilla CSS + Apple Dark Cyber Tokens | Dark OLED `#000000`, Frosted Glass, CSS Grid/Flex, Prompt + JetBrains Mono |
| **Charts & Visuals** | Recharts, Canvas Confetti | กราฟสถิติการเงิน, การตอกบัตร, Session บอท |
| **Payments & FinTech**| `promptpay-qr`, `qrcode`, SlipOK, EasySlip | ถอดรหัส/สร้าง PromptPay QR EMVCo, ตรวจสลิปอัตโนมัติ, ดึงเงิน TrueMoney |
| **Uptime Health** | Node.js `node:http` (Port 3001) | Health check endpoint รองรับ Render Free Tier และ Uptime Kuma |

---

## 3. ระบบความปลอดภัย สิทธิ์ และ Root Owner

### 👑 Root Owner Protection (เจ้าของสูงสุดที่ไม่มีใครลบได้)
ในระบบ LynnBot มีการล็อก Discord ID ของเจ้าของสูงสุดไว้ถาวรในระดับโค้ด เพื่อป้องกันการถูกรัฐประหารในระบบดิสคอร์ดหรือการกดลดสิทธิ์ผิดพลาด:
- **Discord ID เจ้าของสูงสุด:** `1078869442609561691`
- **ไฟล์ที่กำหนด:**
  - `apps/web/lib/utils.ts`
  - `packages/database/index.ts`
- **สิทธิพิเศษของ Root Owner:**
  - ได้รับสิทธิ์บทบาท `OWNER` เสมอในฐานข้อมูล
  - ไม่สามารถถูกลดสิทธิ์ (Demote), ปิดการใช้งาน (`isActive: false`), หรือลบออกจากระบบแอดมินได้โดยผู้ใช้อื่น
  - มีสิทธิ์เข้าถึงทุกหน้าและทุกคำสั่งในระบบโดยไม่ต้องขอ Permission ย่อย

### 🛡️ ลำดับชั้นบทบาท (Role Hierarchy)

| ระดับ (Level) | บทบาท (Role) | คำอธิบายสิทธิ์ |
|---|---|---|
| **Level 4** | `OWNER` | สิทธิ์สูงสุดในระบบ เข้าถึง Settings, Backups, การเงิน, แก้ไขแอดมินทุกคน |
| **Level 3** | `MANAGER` | จัดการทีมแอดมิน, จัดการร้านค้า, ตรวจสลิป, อนุมัติการลา, ออกประกาศ |
| **Level 2** | `ADMIN` | ตอกบัตร, ตรวจสอบผู้ใช้, จัดการ Tickets, มอบ/หักเงิน, ตักเตือนสมาชิก |
| **Level 1** | `MODERATOR` | ตอกบัตรเข้า-ออกงาน, ตรวจสอบประวัติตนเอง, ปิดเคสทิกเก็ตที่รับผิดชอบ |
| **Level 0** | `MEMBER` | สมาชิกทั่วไป เข้าดูหน้าร้านค้าสาธารณะและสถิติตนเอง |

### 🔐 Granular Permission Matrix (ระบบสิทธิ์ย่อยในฐานข้อมูล)
นอกจาก Role หลัก สมาชิกทีมงานสามารถได้รับสิทธิ์เฉพาะทางผ่านตาราง `permissions` เช่น:
- `attendance.manage` — ตรวจสอบและแก้ไขเวลาตอกบัตรของผู้อื่น
- `shop.manage` — เพิ่ม แก้ไข ลบสินค้าและยศในร้านค้า
- `admin.manage` — ปรับตำแหน่งและสิทธิ์ทีมงาน
- `finance.view` / `finance.manage` — ดูและลงบัญชีรายรับ-รายจ่าย
- `slips.review` — ตรวจสอบและอนุมัติสลิปเติมเงิน
- `voice.manage` — ตั้งค่าและรีเซ็ตห้อง Dynamic Voice

---

## 4. ฐานข้อมูลและ Prisma Schema (29 Models Deep Dive)

โมเดลทั้งหมดอยู่ใน `packages/database/prisma/schema.prisma` รวมทั้งสิ้น **29 โมเดล**:

### ตารางผู้ใช้และยืนยันตัวตน (User & Auth)
1. **`User`** (`users`): สมาชิกในระบบ (`discordId`, `username`, `displayName`, `avatar`, `role`, `balance`, `isActive`)
2. **`Account`** (`accounts`): บัญชี OAuth2 เชื่อมต่อกับ NextAuth.js
3. **`Session`** (`sessions`): ข้อมูลเซสชันการล็อกอินหน้าเว็บ

### ระบบการทำงานและทีมงาน (Staff Operations)
4. **`Attendance`** (`attendances`): ประวัติตอกบัตร (`clockIn`, `clockOut`, `duration`, `status`: `ON_TIME` | `LATE` | `EARLY_LEAVE` | `ABSENT`, `note`, `channel`)
5. **`LeaveRequest`** (`leave_requests`): คำขอลางานของสตาฟ (`startDate`, `endDate`, `days`, `leaveType`: `SICK` | `PERSONAL` | `VACATION` | `OTHER`, `status`: `PENDING` | `APPROVED` | `REJECTED` | `CANCELLED`, `reviewedById`)
6. **`ShiftSchedule`** (`shift_schedules`): ตารางเข้าเวรของทีมงาน (`date`, `shiftType`: `MORNING` | `AFTERNOON` | `EVENING` | `NIGHT`, `startTime`, `endTime`, `note`)
7. **`StaffNote`** (`staff_notes`): สมุดบันทึกภายใน/Wiki/SOP ของแอดมิน (`title`, `content`, `category`, `isPinned`, `authorId`)
8. **`Task`** (`tasks`): งานที่มอบหมายสไตล์ Kanban (`title`, `description`, `assigneeId`, `assignedById`, `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`, `status`: `TODO` | `IN_PROGRESS` | `DONE` | `CANCELLED`, `dueDate`)
9. **`Badge`** (`badges`): ตราสัญลักษณ์ความสำเร็จ (`name`, `description`, `icon`, `criteria`, `tier`: `BRONZE` | `SILVER` | `GOLD` | `DIAMOND`)
10. **`UserBadge`** (`user_badges`): การถือครองเข็มเกียรติยศของสมาชิกแต่ละคน

### ระบบร้านค้า การเงิน และสลิป (Shop, Wallet & Slips)
11. **`ShopRole`** (`shop_roles`): ยศที่เปิดขายในร้าน (`name`, `discordRoleId`, `price`, `description`, `color`, `icon`, `category`, `stock`, `maxPerUser`, `sortOrder`)
12. **`Transaction`** (`transactions`): ประวัติการซื้อยศ (`userId`, `roleId`, `price`, `status`: `PENDING` | `COMPLETED` | `REFUNDED` | `CANCELLED`)
13. **`WalletTransaction`** (`wallet_transactions`): บันทึกกระเป๋าเงิน (`userId`, `amount`, `type`: `TOPUP` | `PURCHASE` | `ADMIN_ADJUST` | `REFUND`, `note`, `createdBy`)
14. **`Slip`** (`slips`): คลังสลิปโอนเงิน (`discordId`, `imageUrl`, `r2Key`, `amount`, `status`: `PENDING` | `APPROVED` | `REJECTED`, `transRef`, `isAutoVerified`, `senderName`, `receiverName`, `receiverBank`, `transDate`, `rawSlipData`)
15. **`FinanceRecord`** (`finance_records`): บัญชีรายรับ-รายจ่ายส่วนกลาง (`type`: `INCOME` | `EXPENSE`, `title`, `amount`, `category`, `paymentMethod`, `reference`, `attachmentUrl`, `recordedBy`)

### ระบบบริการสมาชิกและการควบคุม (Community & Moderation)
16. **`Ticket`** (`tickets`): ทิกเก็ตติดต่อทีมงาน (`ticketId`, `channelId`, `creatorId`, `claimedById`, `subject`, `status`: `OPEN` | `CLAIMED` | `CLOSED`, `closedBy`, `transcript`)
17. **`Warning`** (`warnings`): บันทึกการตักเตือน/ลงโทษ (`discordId`, `issuedById`, `reason`, `severity`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`, `isActive`)
18. **`Poll`** (`polls`) & **`PollOption`** (`poll_options`) & **`PollVote`** (`poll_votes`): ระบบโหวตและสำรวจความคิดเห็น (`question`, `isAnonymous`, `isMultiple`, `endsAt`, ตัวเลือก และคะแนนโหวต)
19. **`Giveaway`** (`giveaways`) & **`GiveawayEntry`** (`giveaway_entries`): ระบบจับฉลากแจกของรางวัล (`title`, `prize`, `maxWinners`, `endsAt`, `isActive`, รายชื่อผู้กดเข้าร่วม)
20. **`ReactionRole`** (`reaction_roles`): ตั้งค่ารับยศอัตโนมัติเมื่อกด Reaction (`messageId`, `emoji`, `roleId`, `roleName`)

### ระบบเสียงและระบบอัตโนมัติ (Voice & Automations)
21. **`DynamicVoiceConfig`** (`dynamic_voice_configs`): ตั้งค่าห้องพูดคุย/เล่นเกมอัตโนมัติ (`categoryId`, `categoryName`, `zoneName`, `userLimit`, `minChannels`, `spareChannels`, `emojis`, `blockGroupSize`, `isEnabled`)
22. **`VoiceSession`** (`voice_sessions`): บันทึกประวัติการเข้าห้องเสียง (`userId`, `channelId`, `joinedAt`, `leftAt`, `duration`)
23. **`ScheduledMessage`** (`scheduled_messages`): ประกาศข้อความตามเวลาหรือ Cron (`channelId`, `content`, `embedData`, `cronExpr`, `scheduledAt`, `isRecurring`, `isActive`)

### ระบบระบบและการตรวจสอบ (System & Audit)
24. **`Setting`** (`settings`): ค่าคอนฟิกยืดหยุ่นของระบบทั้งหมด (Key-Value)
25. **`Permission`** (`permissions`): ตารางสิทธิ์ละเอียดรายผู้ใช้ (`userId`, `permission`, `granted`, `grantedBy`)
26. **`AuditLog`** (`audit_logs`): บันทึกการทำงานทั้งระบบ (`userId`, `action`, `category`, `details`, `metadata`, `ip`)
27. **`BotSession`** (`bot_sessions`): สถิติการออนไลน์ของบอท (`startedAt`, `stoppedAt`, `status`, `guilds`, `users`, `ping`)
28. **`RoleBackup`** (`role_backups`): ข้อมูลสำรองบทบาท โครงสร้าง และสิทธิ์ของเซิร์ฟเวอร์ดิสคอร์ด (`totalRoles`, `totalMembers`, `rolesData`, `membersData`)

---

## 5. ฟังก์ชันและการทำงานของ Discord Bot

### 5.1 รายการ Slash Commands ทั้งหมด (32 คำสั่ง)

ทุกคำสั่งถูกลงทะเบียนไว้ใน `apps/bot/src/deploy-commands.ts` และรวบรวมไว้ที่ `apps/bot/src/index.ts`:

| # | คำสั่ง (Command) | รายละเอียด | สิทธิ์ที่ต้องใช้ |
|---|---|---|---|
| 1 | `/welcome [test]` | ตรวจสอบหรือทดสอบระบบต้อนรับสมาชิกใหม่ | `ManageGuild` |
| 2 | `/clockin [note]` | ตอกบัตรเข้าเวร/ทำงาน (บันทึกเวลา, ช่องทาง, สถานะ ON_TIME/LATE) | ทุกคน (Staff) |
| 3 | `/clockout [note]` | ตอกบัตรออกเวร (คำนวณระยะเวลารวมเป็นนาที) | ทุกคน (Staff) |
| 4 | `/attendance [days]` | ดูประวัติตอกบัตรย้อนหลังของตนเอง (1-90 วัน) | ทุกคน |
| 5 | `/shop [category]` | เปิดดูร้านค้ายศในเซิร์ฟเวอร์พร้อมปุ่มสั่งซื้อ | ทุกคน |
| 6 | `/buy <role>` | ซื้อยศที่ระบุโดยตัดเงินจากกระเป๋าเงิน Wallet | ทุกคน |
| 7 | `/wallet` / `/balance` | ดูยอดเงินคงเหลือและประวัติธุรกรรมในกระเป๋า | ทุกคน |
| 8 | `/topup` | เมนูเติมเงิน (สร้าง QR พร้อมเพย์ หรือกรอกซองของขวัญทรูมันนี่) | ทุกคน |
| 9 | `/givebalance <user> <amount>` | โอนหรือปรับเงินในกระเป๋าสมาชิก (สำหรับแอดมิน) | `Administrator` |
| 10 | `/admin list` | ดูรายชื่อและบทบาททีมงานทั้งหมด | ทุกคน |
| 11 | `/admin info <user>` | ดูข้อมูลเชิงลึก รายได้ สถิติตอกบัตรของทีมงาน | `ManageGuild` |
| 12 | `/admin setrole <user> <role>` | ปรับเปลี่ยนตำแหน่งทีมงานในระบบ | `Administrator` |
| 13 | `/leave` | ยื่นใบลา (เปิดหน้าต่าง Modal ให้ระบุประเภท วันที่ และเหตุผล) | ทุกคน (Staff) |
| 14 | `/panel <type> [channel]` | ติดตั้งแผงควบคุมถาวรแบบปุ่มกด 6 รูปแบบ | `ManageGuild` |
| 15 | `/ticket-setup` | ติดตั้งการ์ดเปิดศูนย์ช่วยเหลือ Ticket ในห้องที่ระบุ | `ManageGuild` |
| 16 | `/ticket-claim` | สตาฟกดรับเรื่องทิกเก็ตในห้องนั้นๆ | Staff Only |
| 17 | `/backup` | ทำการ Snapshot สำรองยศ สิทธิ์ และการถือครองยศทั้งเซิร์ฟเวอร์ | `Administrator` |
| 18 | `/restore <id>` | กู้คืนยศและการแจกยศสมาชิกจากไฟล์สำรอง | `Administrator` |
| 19 | `/dynamicvoice` | จัดการสร้าง/รีเซ็ตหมวดหมู่ห้องเสียงอัตโนมัติ | `ManageChannels` |
| 20 | `/schedule` | ดูตารางการเข้าเวรของทีมงานในสัปดาห์นี้ | ทุกคน |
| 21 | `/leaderboard [type]` | กระดานผู้นำ (ชั่วโมงทำงาน, ทิกเก็ตที่แก้, การใช้จ่าย, ห้องเสียง) | ทุกคน |
| 22 | `/giveaway create` | สร้างกิจกรรมสุ่มแจกของรางวัล พร้อมปุ่มเข้าร่วม | `ManageGuild` |
| 23 | `/poll` | สร้างโพลล์สำรวจความคิดเห็นหรือโหวตคะแนน | `ManageMessages` |
| 24 | `/warn <user> <reason>` | ตักเตือนสมาชิกและบันทึกประวัติความประพฤติ | `ModerateMembers` |
| 25 | `/warnings <user>` | ดูประวัติการถูกตักเตือนของสมาชิก | `ModerateMembers` |
| 26 | `/unwarn <id>` | ยกเลิก/ลบประวัติการตักเตือน | `ModerateMembers` |
| 27 | `/warnchannel <channel>` | กำหนดห้องส่งบันทึกการตักเตือน | `ManageGuild` |
| 28 | `/reactionrole` | ตั้งค่ารับยศอัตโนมัติผ่าน Reaction ใต้ข้อความ | `ManageRoles` |
| 29 | `/schedulemsg` | ตั้งเวลาส่งข้อความประกาศล่วงหน้าหรือแบบเกิดซ้ำ | `ManageGuild` |
| 30 | `/task` | ดูและอัปเดตสถานะงานที่ได้รับมอบหมายในทีม | ทุกคน (Staff) |
| 31 | `/me` | โปรไฟล์สรุปข้อมูลตนเอง (ยศ, ยอดเงิน, สถิติตอกบัตร, ทิกเก็ต) | ทุกคน |
| 32 | `/userinfo <user>` | ตรวจสอบข้อมูลสมาชิกในเซิร์ฟเวอร์อย่างละเอียด | ทุกคน |

---

### 5.2 แผงควบคุมถาวรแบบปุ่มกด (6 Persistent Interactive Panels)

คำสั่ง `/panel type:<type>` สามารถเสกการ์ด UI ถาวรที่สมาชิกสามารถกดปุ่มหรือเปิด Modal ได้ตลอดเวลา:

1. **⏱️ Attendance Station (`attendance`)**
   - ปุ่ม: `panel_att_in` (ตอกบัตรเข้า), `panel_att_out` (ตอกบัตรออก), `panel_att_status` (เช็คสถานะการเข้าเวร)
2. **📝 Staff Leave System (`leave`)**
   - ปุ่ม: `panel_leave_request` (เปิด Modal กรอกใบลา), `panel_leave_status` (ดูสถานะใบลาตนเอง)
   - โมดอล: `modal_leave_request` รับค่าประเภทการลา, วันที่เริ่ม-สิ้นสุด, เหตุผล
   - แอดมินสามารถกดปุ่ม `leave_approve:<id>` หรือ `leave_reject:<id>` ได้โดยตรงจากการ์ดแจ้งเตือน
3. **🛒 Shop & Wallet Station (`shop`)**
   - ปุ่ม: `panel_shop_browse` (ดูแคตตาล็อกยศ), `panel_wallet_balance` (ดูยอดเงิน), `panel_wallet_topup` (เมนูเติมเงิน)
   - เมนู Dropdown: `shop_select_role` เลือกยศเพื่อดูรายละเอียดและราคาก่อนกด Confirm
   - ระบบเติมเงิน: `panel_topup_qr` (PromptPay QR) และ `panel_topup_truemoney` (ซองทรูมันนี่)
4. **📩 Ticket Support Station (`ticket`)**
   - ปุ่ม: `ticket_create` (เปิดห้องทิกเก็ตส่วนตัว `🎫-ticket-XXXX`)
   - ภายในห้องทิกเก็ต: ปุ่ม `ticket_claim` สำหรับสตาฟกดรับเคส และ `ticket_close` สำหรับปิดเคส
5. **🛡️ Staff Control Hub (`admin-hub`)**
   - ปุ่ม: `panel_admin_staff` (ดูสถิติทรัพยากรบุคคล), `panel_admin_leaves` (ตรวจใบลาค้างอนุมัติ), `panel_admin_backup` (สำรองข้อมูลด่วน)
6. **⚖️ Moderation & Warning Station (`moderation`)**
   - ปุ่ม: `panel_warn_create` (เปิด Modal เตือนสมาชิก), `panel_warn_check` (เช็คประวัติโทษ)

---

### 5.3 เซอร์วิสหลักของบอท (Core Bot Services)

โครงสร้างโค้ดฝั่ง Bot Services อยู่ที่ `apps/bot/src/services/`:

- **`dynamicVoiceService.ts`**: ระบบบริหารห้องเสียงอัจฉริยะ โคลนรูปแบบชื่อห้อง ตรวจจับตัวแบ่งบล็อก (`╭ ┆ ╰`) รันการสร้าง/ลบห้องด้วย In-memory Mutex ป้องกัน Race Condition
- **`slipService.ts` & `slipVerificationService.ts`**: รับรูปภาพสลิปจากแชททิกเก็ต ดาวน์โหลด Buffer อัปโหลดขึ้น Cloudflare R2 ป้องกันลิงก์ Discord หมดอายุ และส่งต่อไปยัง SlipOK / EasySlip API เพื่อตรวจสอบยอดเงิน บัญชีปลายทาง และเลข Ref กันสลิปซ้ำ
- **`truemoneyService.ts`**: ยิง HTTP POST ไปยัง API ซองของขวัญทรูมันนี่เพื่อดึงยอดเงินเข้ากระเป๋าผู้ใช้แบบ Real-time
- **`promptpayService.ts`**: คำนวณ CRC16 สร้าง EMVCo Payload สำหรับ PromptPay QR Code ตามมาตรฐานธนาคารแห่งประเทศไทย
- **`ticketService.ts`**: จัดการสิทธิ์การมองเห็นห้องทิกเก็ต สร้างข้อความ Log แจ้งเตือนสตาฟ และเซฟ Transcript พร้อมไฟล์แนบทั้งหมดลง Database เมื่อปิดเคส
- **`backupService.ts`**: บันทึกข้อมูลยศ สิทธิ์ สี ลำดับ และการถือครองยศของสมาชิกทุกคนลง JSON ในฐานข้อมูล เพื่อกู้คืนได้เมื่อเซิร์ฟเวอร์ถูกทำลาย
- **`automodService.ts`**: ป้องกันสแปมข้อความถี่ (จำกัดความถี่ 5 วินาที), ตรวจจับคำต้องห้าม, บล็อกคำเชิญ Discord โดยอัตโนมัติ
- **`embedService.ts`**: ทำหน้าที่แทนที่ตัวแปรแบบไดนามิก (เช่น `{user}`, `{price}`, `{ticket_id}`) ลงในแม่แบบ Embed ที่ผู้ใช้ปรับแต่งจากหน้าเว็บ

---

### 5.4 Background Jobs & Cron Tasks

ที่ `apps/bot/src/index.ts` มีการรัน Background Workers อัตโนมัติ:

1. **Auto Clock-out Checker** (ทำงานทุก 15 นาที):
   - ค้นหาพนักงานที่ลืมตอกบัตรออกเกินกะเวลาปกติ และปรับสถานะให้ตอกบัตรออกอัตโนมัติ
2. **Giveaway Winner Checker** (ทำงานทุก 30 วินาที):
   - ค้นหากิจกรรมแจกของรางวัลที่ถึงเวลาสิ้นสุด (`endsAt <= now`) สุ่มผู้โชคดีด้วยคณิตศาสตร์แบบสุ่ม และประกาศรายชื่อพร้อมแท็กในดิสคอร์ด
3. **Scheduled Message Broadcaster** (ทำงานทุก 60 วินาที):
   - ค้นหาข้อความประกาศที่ถึงกำหนดเวลา หรือคำนวณรอบจาก Cron Expression แล้วส่งเข้า Channel ที่กำหนด
4. **Dynamic Voice Sync & Cleanup** (ทำงานทุก 5 นาที + Real-time เมื่อมีคนเข้า-ออก):
   - สแกนห้องว่างส่วนเกินและลบห้องทิ้งเพื่อรักษาความเป็นระเบียบของเซิร์ฟเวอร์

---

## 6. ฟังก์ชันและการทำงานของ Web Dashboard

หน้าเว็บพัฒนาด้วย **Next.js 14 App Router** ในโฟลเดอร์ `apps/web/app/`

### 6.1 หน้า Dashboard ทั้งหมด (23 หน้าหลัก)

| Path | ชื่อหน้า | ฟังก์ชันและความสามารถ |
|---|---|---|
| `/(dashboard)` | **Dashboard Overview** | สรุปภาพรวม KPI ทั้งหมด: ยอดขายยศ, ทิกเก็ตที่เปิดอยู่, พนักงานที่กำลังเข้าเวร, สถานะบอท และกราฟกิจกรรมสด |
| `/admins` | **Admin Management** | จัดการรายชื่อทีมงาน ปรับระดับ Role (Owner, Manager, Admin, Mod) ซิงค์สิทธิ์กับยศดิสคอร์ด |
| `/staff/[id]` | **Staff Profile** | โปรไฟล์ส่วนตัวของสตาฟ ดูสถิติตอกบัตรรายเดือน, ประวัติปิดทิกเก็ต, ตราเกียรติยศ และบันทึกข้อความ |
| `/announcements` | **Announcement Studio** | ห้องส่งประกาศดิสคอร์ด มีตัวจำลอง Live Embed Preview, ปรับสี, ใส่รูปภาพ, เลือก Channel และ Mention Role |
| `/attendance` | **Attendance Center** | ดูตารางเวลาตอกบัตรของทีมงานทุกคน ตัวกรองรายวัน/รายเดือน และปุ่มกดส่งออกเป็นไฟล์ CSV/Excel |
| `/backups` | **Server Backup & Restore** | ระบบ Snapshot สำรองบทบาทดิสคอร์ด โครงสร้างห้อง และบันทึกการถือครองยศ พร้อมปุ่มกดกู้คืนในคลิกเดียว |
| `/bot-status` | **Bot Health & Sessions** | ตรวจสอบ Uptime, ค่า Ping, การใช้งาน RAM, สถิติเซสชันการออนไลน์ของบอท |
| `/finance` | **Financial Ledger** | บัญชีรายรับ-รายจ่ายของเซิร์ฟเวอร์ บันทึกเงินบริจาค ค่าเช่าบอท สปอนเซอร์ พร้อมกราฟ Cashflow และใบเสร็จ |
| `/giveaways` | **Giveaway Manager** | ดูรายการกิจกรรมสุ่มแจกของรางวัล ดูรายชื่อผู้เข้าร่วม ปุ่มกดสุ่มผู้ชนะใหม่ (Reroll) หรือสั่งยุติกิจกรรม |
| `/leaderboard` | **Leaderboard Center** | กระดานจัดอันดับสมาชิก: ชนะเลิศชั่วโมงการทำงาน, ผู้แก้ไขทิกเก็ตสูงสุด, คนคุยในห้องเสียงนานที่สุด |
| `/leaves` | **Leave Management** | ปฏิทินการลางานของทีมงาน ระบบอนุมัติหรือปฏิเสธคำขอลา พร้อมระบุเหตุผลตอบกลับ |
| `/logs` | **Audit Logs Viewer** | คลังบันทึกกิจกรรมทั้งระบบ (Category, Admin, IP Address, JSON Metadata) ค้นหาและกรองย้อนหลังได้ |
| `/moderation` | **Moderation Center** | ศูนย์ดูแลความประพฤติ ดูประวัติการตักเตือนสมาชิก (Warnings) และตั้งค่า AutoMod (คำต้องห้าม, ป้องกันสแปม) |
| `/notes` | **Staff Notes & SOP Wiki** | สมุดบันทึกและคู่มือปฏิบัติงานภายในทีมงาน รองรับ Markdown, การปักหมุดข้อความสำคัญ, และแบ่งหมวดหมู่ |
| `/permissions` | **Permission Matrix** | ตารางสิทธิ์ RBAC แบบละเอียด อนุญาตหรือปิดกั้นการกระทำเฉพาะด้านเป็นรายบุคคล |
| `/reports` | **Reports & Analytics** | วิเคราะห์ประสิทธิภาพของทีมงานและเซิร์ฟเวอร์รายสัปดาห์/รายเดือน ส่งออกข้อมูลเพื่อทำรายงานผู้บริหาร |
| `/schedule` | **Shift Calendar** | ปฏิทินจัดตารางเข้าเวรของทีมงาน (กะเช้า, กะบ่าย, กะดึก) ป้องกันปัญหาไม่มีแอดมินดูแลเซิร์ฟเวอร์ |
| `/settings` | **System Settings** | ตั้งค่าระบบทั่วไป, Channel ID สำหรับการแจ้งเตือน, การเชื่อมต่อ SlipOK, EasySlip, Cloudflare R2 |
| `/shop` | **Shop Manager** | แคตตาล็อกร้านค้ายศดิสคอร์ด เพิ่มยศใหม่ กำหนดราคา สต็อก สี ไอคอน และดูประวัติการสั่งซื้อ |
| `/slips` | **Slip Review Center** | คลังรูปภาพสลิปที่ส่งเข้ามาในระบบ แสดงผลการอ่าน OCR, บัญชีผู้โอน, เลขอ้างอิง และปุ่มกดยืนยันเติมเงิน |
| `/tasks` | **Task Board (Kanban)** | กระดานงานสไตล์ Trello มอบหมายงานให้ทีมงาน ปรับสถานะ To-Do, In-Progress, Done และกำหนด Due Date |
| `/tickets` | **Support Ticket Manager** | จัดการคำร้องเรียนและทิกเก็ตจากสมาชิก อ่านข้อความแชทย้อนหลัง ดูรูปภาพประกอบ และกดปิดเคสจากหน้าเว็บ |
| `/voice` | **Dynamic Voice Studio** | มอนิเตอร์ห้องเสียง Real-time ปรับสูตรการตั้งชื่อห้อง อิโมจิประจำโซน (เกม, พักผ่อน, นอนรวม) และจำนวนห้องสำรอง |
| `/welcome` | **Welcome Studio** | ปรับแต่งข้อความต้อนรับสมาชิกใหม่ การ์ดต้อนรับ Live Preview ยศเริ่มต้น (Auto-role) และข้อความส่งเข้า DM |

### 6.2 หน้าสาธารณะ (Public Pages)

หน้าเว็บที่สมาชิกทั่วไปสามารถเข้าชมได้โดยไม่ต้องเป็นแอดมิน:
- `/public/shop` — หน้าร้านค้ายศสำหรับสมาชิกทั่วไป เลือกดูยศและสิทธิประโยชน์
- `/public/staff` — หน้ารายชื่อทีมงานผู้ดูแลเซิร์ฟเวอร์
- `/public/status` — หน้าแสดงสถานะความพร้อมของบอทและระบบ
- `/rules` — หน้าระเบียบกฎกติกาของคอมมูนิตี้ ออกแบบสวยงาม

---

### 6.3 สถาปัตยกรรม API Routes

API ทั้งหมดรันอยู่ภายใต้ `apps/web/app/api/` แบ่งกลุ่มตามหน้าที่:

```
apps/web/app/api/
├── admins/            # GET/POST จัดการรายชื่อทีมงาน, /roles, /sync ดึงยศจาก Discord
├── analytics/         # GET ข้อมูลสถิติเชิงลึกสำหรับหน้า Dashboard
├── announcements/     # POST ประกาศข้อความ, /history ดูประวัติประกาศ
├── attendance/        # GET ประวัติตอกบัตร, POST ตอกบัตรผ่านเว็บ
├── auth/[...nextauth] # NextAuth Authentication Handlers
├── badges/            # GET/POST ตราสัญลักษณ์ความสำเร็จ
├── bot/status         # GET/POST สถานะ Heartbeat จากบอท
├── discord/           # /announce, /backups, /guild-data, /test-notify
├── embeds/            # GET/POST ตั้งค่าแม่แบบ Embed และทดสอบส่ง (`/test`)
├── events/stream      # GET Server-Sent Events (SSE) สำหรับ Real-time Feed
├── export/            # GET ดาวน์โหลดไฟล์รายงาน (`/attendance`, `/sales`, `/voice`)
├── finance/           # GET/POST บันทึกรายรับรายจ่าย
├── giveaways/         # GET/POST จัดการกิจกรรมสุ่มรางวัล
├── leaderboard/       # GET อันดับผู้ใช้งานในหมวดหมู่ต่างๆ
├── leaves/            # GET/POST/PATCH คำขอลางานและการอนุมัติ
├── logs/              # GET ข้อมูล Audit Log
├── moderation/        # GET/POST จัดการการเตือนสมาชิก
├── notes/             # GET/POST สมุดบันทึกสตาฟ
├── notifications/     # GET การแจ้งเตือนระบบสำหรับแถบ Header
├── permissions/       # GET/POST ตารางสิทธิ์ละเอียด
├── reports/           # GET ข้อมูลสรุปผลการดำเนินงาน
├── schedule/          # GET/POST ตารางการเข้าเวร
├── settings/          # GET/POST การตั้งค่าคอนฟิก Key-Value
├── shop/              # GET/POST ยศในร้านค้าและรายการสั่งซื้อ
├── slips/             # GET/POST คลังสลิป, /verify ยืนยันสลิป, /test-api ทดสอบ API สลิป
├── tasks/             # GET/POST กระดานงานของทีมงาน
├── tickets/           # GET/POST ทิกเก็ตและข้อความ Transcript
├── voice/dynamic      # GET/POST ตั้งค่าโซนห้องเสียงอัตโนมัติ
├── wallet/adjust      # POST เติมหรือหักเงินในกระเป๋าสมาชิก
└── welcome/test       # POST ยิงข้อความทดสอบ Welcome Card เข้าห้องจริง
```

---

### 6.4 ระบบ Real-time SSE & Live Activity Feed

ที่ไฟล์ `apps/web/app/api/events/stream/route.ts` มีการสร้าง **Server-Sent Events (SSE)**:
- ส่ง Heartbeat Ping ทุก 15 วินาทีเพื่อรักษา Connection
- ตรวจสอบ `AuditLog` ล่าสุดทุก 3 วินาที
- หากมีกิจกรรมใหม่ (เช่น มีคนตอกบัตร, ซื้อยศ, เปิดทิกเก็ต, ส่งสลิป) จะ Broadcast ไปยังทุกหน้าจอที่เปิด Dashboard อยู่ทันที ทำให้ UI บนหน้าเว็บขยับสดโดยไม่ต้องกด Refresh

---

### 6.5 ระบบ Visual Embed Editor & Studio

ที่ `apps/web/lib/embedPresets.ts` บรรจุโครงสร้างและแม่แบบ Embed มากกว่า 1,000 บรรทัด ครอบคลุมทุกระบบในเซิร์ฟเวอร์:
- สามารถเปลี่ยนหัวข้อ, คำอธิบาย, สีขอบ (Hex Color), ภาพ Thumbnail, ภาพ Banner, ข้อมูล Footer, และ Fields ย่อย
- มีตัวแปรสำเร็จรูป (Dynamic Variables) รองรับการแสดงผล เช่น:
  - `{user}` — แท็กผู้ใช้งาน
  - `{ticket_id}` — รหัสทิกเก็ต
  - `{role_name}` — ชื่อยศ
  - `{price}` — ราคาสินค้า
  - `{time}` — เวลาทำรายการ

---

## 7. ระบบการเงิน ตรวจสลิป และ Storage (Financial & Slip Engine)

หัวใจสำคัญของการหารายได้และบริการใน LynnBot คือเครื่องยนต์ทางการเงิน:

```mermaid
sequenceDiagram
    autonumber
    actor User as สมาชิกในห้อง Ticket
    participant Discord as Discord Gateway
    participant Bot as LynnBot Service
    participant R2 as Cloudflare R2
    participant SlipAPI as SlipOK / EasySlip
    participant DB as Prisma Database

    User->>Discord: ส่งรูปภาพสลิปโอนเงิน
    Discord->>Bot: Event `messageCreate`
    Bot->>Bot: ตรวจสอบว่าเป็นภาพสลิปในห้อง Ticket หรือไม่
    Bot->>R2: อัปโหลดภาพต้นฉบับขึ้น Cloudflare R2
    R2-->>Bot: คืนค่า CDN Image URL ถาวร
    Bot->>DB: บันทึกข้อมูลสลิปลงตาราง `slips` (Status: PENDING)
    Bot->>SlipAPI: ส่ง URL ภาพให้ระบบ OCR & QR Verification
    SlipAPI-->>Bot: ตอบกลับข้อมูล: ยอดเงิน, ธนาคาร, รหัสอ้างอิง (transRef)
    
    alt ข้อมูลถูกต้อง & ไม่ซ้ำ & บัญชีผู้รับตรง
        Bot->>DB: อัปเดต Slip (APPROVED) + เพิ่ม Balance ใน `users` + สร้าง `wallet_transactions`
        Bot->>Discord: เปลี่ยนข้อความในแชทเป็นอนุมัติ และแท็กแจ้งสมาชิก
    else สลิปซ้ำ หรือยอดเงินผิดปกติ
        Bot->>DB: อัปเดต Slip (REJECTED หรือส่งให้แอดมินตรวจมือ)
        Bot->>Discord: ส่งการ์ดปุ่มกด [อนุมัติ] [ปฏิเสธ] เข้าห้อง Admin Log
    end
```

### การป้องกันการทุจริต (Anti-Fraud Protections)
1. **Duplicate Ref Protection**: ระบบตรวจเลข `transRef` จาก SlipOK/EasySlip หากเคยมีบันทึกในฐานข้อมูลแล้ว ระบบจะปฏิเสธอัตโนมัติทันที
2. **Account Name / Number Matching**: บอทสามารถเช็คชื่อและเลข 4 ตัวท้ายของบัญชีผู้รับในสลิป ให้ตรงกับค่าที่ตั้งไว้ใน Settings
3. **Permanent R2 Storage**: สลิปทุกใบจะถูกเก็บถาวรใน Cloudflare R2 แม้ห้องทิกเก็ตในดิสคอร์ดจะถูกลบไปแล้ว ลิงก์รูปภาพใน Dashboard จะไม่เสีย

---

## 8. ระบบ Dynamic Voice Channel Room Manager

ระบบห้องเสียงใน `dynamicVoiceService.ts` มีความชาญฉลาดเป็นพิเศษ:
1. **Automatic Expansion**: เมื่อสมาชิกเดินเข้าห้องเสียงที่ว่างอยู่ ระบบจะสร้างห้องสำรอง (Spare Room) เตรียมไว้ให้ทันที
2. **Dynamic Pruning**: เมื่อสมาชิกออกจากห้องและห้องว่างเกินจำนวน `spareChannels` ที่กำหนด ระบบจะลบห้องทิ้งโดยอัตโนมัติ
3. **Tree Branch Formatting**: ชื่อห้องจะถูกจัดรูปแบบกิ่งไม้อย่างสวยงามอัตโนมัติ:
   - ห้องแรกของบล็อกขึ้นต้นด้วย `╭`
   - ห้องกลางบล็อกขึ้นต้นด้วย `┆`
   - ห้องท้ายบล็อกลงท้ายด้วย `╰`
4. **Emoji Sequencing**: โซน Living/Talk จะสลับไอคอนอาหารและผลไม้ 30 ชนิดไม่ซ้ำกัน เช่น `🥪`, `🥐`, `🥓`, `🍩`, `🧋`
5. **Race Condition Protection**: มี In-memory Locks (`categoryLocks`) เพื่อป้องกันไม่ให้ Discord API ถูกเรียกซ้ำซ้อนขณะที่มีคนเข้า-ออกพร้อมกัน

---

## 9. Environment Variables และการตั้งค่าระบบ (.env Reference)

ไฟล์ `.env` ที่ Root Directory ถูกใช้ร่วมกันระหว่าง Next.js และ Discord Bot:

```env
# ==========================================
# 1. DISCORD BOT & OAUTH2 CONFIGURATION
# ==========================================
# ได้จาก Discord Developer Portal (https://discord.com/developers/applications)
DISCORD_TOKEN="MTMx...บอทโทเคน..."
DISCORD_CLIENT_ID="1234567890..."
DISCORD_CLIENT_SECRET="abcde_secret..."
DISCORD_GUILD_ID="1078869442609561691" # ID เซิร์ฟเวอร์หลัก

# ==========================================
# 2. SUPABASE POSTGRESQL DATABASE
# ==========================================
# Connection String แบบ Transaction Pooler (พอร์ต 6543 หรือ 5432)
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Connection String ตรง (Direct URL) สำหรับการรัน Prisma Migration
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# ==========================================
# 3. NEXTAUTH & DASHBOARD URL
# ==========================================
# สร้าง Secret ได้ด้วยคำสั่ง openssl rand -base64 32
NEXTAUTH_SECRET="your_nextauth_super_secret_key"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"

# ==========================================
# 4. CLOUDFLARE R2 OBJECT STORAGE (SLIPS)
# ==========================================
# พื้นที่เก็บสลิปโอนเงินถาวร
R2_ACCOUNT_ID="your_32_char_cloudflare_account_id"
R2_BUCKET_NAME="lynn-slips"
R2_ACCESS_KEY_ID="your_r2_access_key"
R2_SECRET_ACCESS_KEY="your_r2_secret_key"
R2_PUBLIC_URL="https://pub-xxxxxx.r2.dev"

# ==========================================
# 5. OPTIONAL: RUNTIME PORTS
# ==========================================
PORT=3001 # Health Check Port สำหรับ Discord Bot (Render / Monitoring)
```

---

## 10. คำสั่งพัฒนาและวิธีรันระบบ (Developer Runbook)

คำสั่งทั้งหมดสามารถสั่งการจาก Root Monorepo:

### ติดตั้งและเตรียมความพร้อม
```bash
# ติดตั้ง Packages ทั้ง Monorepo
npm install

# สร้าง Prisma Client Code
npm run db:generate

# ซิงค์ Schema ไปยังฐานข้อมูล Supabase
npm run db:push

# ใส่ข้อมูลตั้งต้น (Default Settings, Sample Roles)
cd packages/database && npm run seed && cd ../..
```

### การลงทะเบียน Slash Commands เข้า Discord
```bash
# รันเพื่ออัปเดตคำสั่งทั้ง 32 คำสั่งเข้า Discord
cd apps/bot && npm run deploy && cd ../..
```

### การรันระบบในโหมดพัฒนา (Development)
```bash
# รันเฉพาะ Web Dashboard (พอร์ต 3000)
npm run dev

# รันเฉพาะ Discord Bot
npm run dev:bot

# รันทั้ง Web Dashboard และ Bot พร้อมกัน
npm run dev:all
```

### การตรวจสอบฐานข้อมูลผ่าน GUI
```bash
# เปิด Prisma Studio (ดูและแก้ไขข้อมูลทุกตารางในเบราว์เซอร์)
npm run db:studio
```

---

## 11. ข้อควรระวังสำคัญสำหรับ AI ที่มารับช่วงต่อ (Crucial Gotchas & Design Rules)

หากคุณคือ AI ที่กำลังจะเข้ามาเขียนโค้ดต่อ โปรดจำกฎเหล็กเหล่านี้ให้ขึ้นใจ:

1. ⚠️ **อย่าแตะต้องหรือลดสิทธิ์ Root Owner ID (`1078869442609561691`)**:
   - ค่านี้ฮาร์ดโค้ดไว้ใน `apps/web/lib/utils.ts` และ `packages/database/index.ts`
   - ในระบบล็อกอิน NextAuth และ API สิทธิ์ของ ID นี้จะต้องเป็น `OWNER` และ `isActive: true` เสมอ
2. ⚠️ **ระวังเรื่อง Discord CDN Image URLs**:
   - ลิงก์รูปภาพจาก Discord (`cdn.discordapp.com/attachments/...`) จะหมดอายุภายในไม่กี่ชั่วโมงเมื่อสร้างเสร็จ
   - เวลาทำฟังก์ชันเกี่ยวกับภาพ โดยเฉพาะสลิปโอนเงิน **ต้องส่งเข้า `uploadToR2()` เสมอ** เพื่อเซฟลง Cloudflare R2
3. ⚠️ **ระบบเวลาและ Timezone ภาษาไทย**:
   - เซิร์ฟเวอร์นี้ใช้งานในประเทศไทย ทุกฟังก์ชันแสดงเวลาต้องกำหนด `timeZone: "Asia/Bangkok"` และภาษา `"th-TH"` เสมอ
4. ⚠️ **โครงสร้างการลงทะเบียน Slash Command**:
   - เมื่อเพิ่มคำสั่งบอทใหม่ใน `apps/bot/src/commands/` อย่าลืมไปเพิ่มใน `apps/bot/src/index.ts` (ใน `commandList`) และใน `apps/bot/src/deploy-commands.ts` (ใน `commands` array) มิฉะนั้นคำสั่งจะไม่แสดงในดิสคอร์ด
5. ⚠️ **NextAuth JWT Caching 5 นาที**:
   - ใน `apps/web/lib/auth.ts` มีการแคชข้อมูลผู้ใช้ใน JWT ไว้ 5 นาที (`300000 ms`) เพื่อป้องกันเว็บยิง Query หา Supabase ถี่เกินไป หากคุณแก้ไขข้อมูลสิทธิ์ในฐานข้อมูลแล้วหน้าเว็บยังไม่เปลี่ยน ให้รอครบ 5 นาทีหรือล็อกเอาต์แล้วล็อกอินใหม่
6. ⚠️ **รูปแบบการตั้ง Custom ID ของ Interactive Buttons**:
   - Custom ID ในบอทมีรูปแบบตายตัว เช่น:
     - `panel_att_*` สำหรับ Attendance
     - `panel_leave_*` / `leave_approve:<id>` / `leave_reject:<id>` สำหรับระบบลา
     - `panel_shop_*` / `shop_confirm_buy:<roleId>` สำหรับร้านค้า
     - `ticket_*` สำหรับทิกเก็ต
     - `slip_approve_<id>` / `slip_reject_<id>` สำหรับตรวจสลิป
7. ⚠️ **Dynamic Voice Channel Mutex**:
   - การสร้างและลบห้องเสียงต้องผ่าน `categoryLocks` ใน `dynamicVoiceService.ts` เสมอ ห้ามไปเรียก `channels.create` หรือ `delete` แบบดิบๆ โดยไม่ล็อก เพราะจะเกิดบั๊กสร้างห้องเบิ้ลเวลาคนกดจอยรัวๆ
8. ⚠️ **ดีไซน์หน้าเว็บต้องคุมโทน Apple Pro Dark Minimal**:
   - พื้นหลังดำสนิท `#000000` เส้นขอบบาง `rgba(255,255,255,0.14)`
   - ฟอนต์ไทยใช้ **Prompt** ฟอนต์ตัวเลขและโค้ดใช้ **JetBrains Mono**
   - ห้ามใช้สีฉูดฉาดแบบเด็กเล่น ให้ใช้สีเน้นฟังก์ชัน (Accent Blue `#2997ff`, Success Green `#30d158`, Warning Amber `#ffd60a`, Danger Red `#ff453a`)

---

## 12. ระบบกิจกรรมแฟนเดย์ (753BC Fanday Community System)

ระบบกิจกรรมสุ่มจับคู่แฟนเดย์ตามเพศและนิสัยด้วย AI พร้อมแผงควบคุมถาวรและมินิเกม:
- **Panel Slash Command**: ติดตั้งผ่าน `/panel type:🎀 กิจกรรมแฟนเดย์ (Fanday)` โดยบอทจะส่ง Embed สไตล์ 753BC ตามต้นแบบ (`fanday_panel_main`) มีปุ่ม:
  - `🎀 เข้าร่วมเกม` (`fd_join`) — เลือกเพศ, สเปกเพศที่หา, ทำแบบประเมินนิสัย หรือขอล็อกคู่
  - `🚪 ออกจากเกม` (`fd_leave`) — ถอนตัวอย่างสุภาพ
  - `📖 อ่านกติกา` (`fd_rules`) — แสดงระเบียบและข้อตกลง
  - `🔎 บทบาทของฉัน` (`fd_myrole`) — ตรวจสอบสถานะส่วนตัว คู่ที่จับได้ และห้องกิจกรรม
- **โมเดลฐานข้อมูล (Prisma)**: `FandayEvent`, `FandayForm`, `FandayPlayer`, `FandayPair`, `FandayGameSession`, `FandayLetter`, `FandayMatchLog`, `FandayBlock`, `FandayJob`, `FandayOutbox`
- **อัลกอริทึมการจับคู่ (Matching Engine)**: รองรับข้อกำหนดเพศแบบ Mutual, ระบบบล็อกคู่, ล็อกคู่ยืนยัน 2 ฝ่าย (Self-Lock) และคำนวณ Soft Score ด้วย Seeded PRNG
- **AI Personality Type**: วิเคราะห์คำตอบเป็น 8 Archetypes ด้วย Gemini API พร้อมระบบสำรอง Rule-based Fallback หากเน็ตเวิร์กหรือ API มีปัญหา
- **5 มินิเกมกระชับความสัมพันธ์**: Would You Rather, Two Truths & A Lie, Couple Quiz, Mystery Gift, Daily Mission (บันทึก State ใน DB ทนทานต่อบอทรีสตาร์ท)
- **ระบบจดหมายความรู้สึก**: ส่งเข้า DM พร้อมสำเนาลงห้องส่วนตัวของคู่ (รองรับทั้งแบบระบุชื่อและนิรนาม)
- **Web Dashboard (`/fanday`)**: มอนิเตอร์ผู้สมัครสด, สถิติเพศ, ทดลองจับคู่ (Dry-Run), ยืนยันผล (Commit), Webhook ฉุกเฉิน และส่งออก JSON Snapshot

---

*จัดทำขึ้นเพื่อให้ AI และนักพัฒนาทีมงานสามารถสานต่องานได้ทันทีโดยไม่ต้องเสียเวลาแกะโครงสร้างใหม่* 🚀

