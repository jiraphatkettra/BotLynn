# 🤖 LynnBot — Discord Admin Management System

ระบบจัดการแอดมินดิสคอร์ดครบวงจร ประกอบด้วย Discord Bot + Web Dashboard ที่เชื่อมต่อกันผ่าน Supabase

## ✨ Features

### Discord Bot
- **⏰ ระบบตอกบัตร** — `/clockin`, `/clockout`, `/attendance`
- **🏷️ ร้านค้ายศ** — `/shop`, `/buy`
- **👑 จัดการแอดมิน** — `/admin list`, `/admin info`, `/admin setrole`
- **📖 Help** — `/help`

### Web Dashboard
- **🔐 Discord OAuth2 Login** — เข้าสู่ระบบด้วย Discord
- **📊 Dashboard** — สรุปภาพรวมทั้งหมด
- **⏰ Attendance** — ดูประวัติตอกบัตรทั้งหมด
- **🏷️ Shop** — จัดการยศและดูประวัติซื้อขาย
- **👥 Admin Management** — จัดการทีมแอดมิน
- **🔐 Permissions** — ตารางสิทธิ์
- **📝 Audit Logs** — ประวัติกิจกรรมทั้งหมด
- **🤖 Bot Status** — สถานะและ Session ของบอท
- **⚙️ Settings** — ตั้งค่าระบบ

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Web Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database ORM | Prisma |
| Database | Supabase (PostgreSQL) |
| Auth | NextAuth.js + Discord OAuth2 |
| Discord Bot | discord.js v14 |
| Styling | Vanilla CSS (Dark Theme) |

## 📁 Project Structure

```
LynnBot/
├── apps/
│   ├── web/              # Next.js Web Dashboard
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities
│   └── bot/              # Discord Bot
│       └── src/
│           ├── commands/  # Slash commands
│           └── events/    # Event handlers
├── packages/
│   └── database/          # Shared Prisma schema
└── .env                   # Environment variables
```

## 🚀 Getting Started

### 1. ตั้งค่า Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required:
- `DISCORD_TOKEN` — Bot Token จาก [Discord Developer Portal](https://discord.com/developers/applications)
- `DISCORD_CLIENT_ID` — OAuth2 Client ID
- `DISCORD_CLIENT_SECRET` — OAuth2 Client Secret
- `DISCORD_GUILD_ID` — Server ID ของคุณ
- `DATABASE_URL` — Supabase PostgreSQL connection string (pooler)
- `DIRECT_URL` — Supabase PostgreSQL direct connection
- `NEXTAUTH_SECRET` — สร้างด้วย `openssl rand -base64 32`
- `NEXTAUTH_URL` — URL ของ web app (default: `http://localhost:3000`)

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase
npm run db:push

# Seed default data (optional)
cd packages/database && npm run seed
```

### 4. Deploy Discord Commands

```bash
cd apps/bot && npm run deploy
```

### 5. Start Development

```bash
# Start web dashboard
npm run dev

# Start bot (in another terminal)
npm run dev:bot

# Or start both
npm run dev:all
```

### 6. Setup Discord OAuth2

1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications)
2. เลือก Application → OAuth2
3. เพิ่ม Redirect URL: `http://localhost:3000/api/auth/callback/discord`
4. คัดลอก Client ID และ Client Secret ใส่ `.env`

## 📖 Commands Reference

| Command | Description |
|---------|-------------|
| `/clockin [note]` | ตอกบัตรเข้างาน |
| `/clockout [note]` | ตอกบัตรออกงาน |
| `/attendance [days]` | ดูประวัติตอกบัตร (ย้อนหลัง 1-90 วัน) |
| `/shop [category]` | ดูร้านค้ายศ |
| `/buy <role>` | ซื้อยศ |
| `/admin list` | ดูรายชื่อแอดมิน |
| `/admin info <user>` | ดูข้อมูลแอดมิน |
| `/admin setrole <user> <role>` | ตั้งตำแหน่ง |
| `/help` | แสดงคำสั่งทั้งหมด |

## 🔐 Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| Owner | 4 | สิทธิ์สูงสุด ทำได้ทุกอย่าง |
| Manager | 3 | จัดการแอดมิน, ร้านค้า, ตั้งค่า |
| Admin | 2 | ตอกบัตร, ขายยศ, ดูข้อมูล |
| Moderator | 1 | ตอกบัตร, ดูข้อมูลตัวเอง |

## 📝 License

MIT
