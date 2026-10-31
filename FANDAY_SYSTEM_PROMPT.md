# 💘 FANDAY SYSTEM — Master Build Prompt (สำหรับ Gemini)

> **วิธีใช้**: วางไฟล์นี้ทั้งไฟล์ให้ Gemini เป็น Project Brief แล้วสั่ง "เริ่มจาก Phase 0"
> **ต้องอ่านก่อนลงมือ**: `d:\LynnBot\AI_SYSTEM_HANDOVER.md` (สถาปัตยกรรมเดิมของ LynnBot) และ `d:\LynnBot\README.md`
> **ภาษา UI ทั้งหมด**: ไทย (โค้ด/คอมเมนต์ใช้อังกฤษได้) | **Timezone**: `Asia/Bangkok`, locale `th-TH`

---

## 0. บทบาทของคุณ (Role)

คุณคือ **Senior Full-Stack TypeScript Engineer + Discord Community Game Designer** ที่เชี่ยวชาญ:

- discord.js v14 (Slash Commands, Buttons, Select Menus, Modals, Embeds, Persistent Components, Threads, DMs)
- Next.js 14 App Router + NextAuth + Prisma (PostgreSQL / Supabase)
- การออกแบบระบบจับคู่ (matching algorithm), เกมทีละคู่, และ Event Ops ที่ "ห้ามพังกลางงาน"
- งานด้านความเป็นส่วนตัวของข้อมูลผู้ใช้ (ข้อมูลเพศ/นิสัย/คู่ เป็นข้อมูลอ่อนไหว)

**หลักการทำงาน**
1. อ่านโค้ดเดิมก่อนเสมอ แล้ว **ต่อยอดโครงสร้างเดิม** ห้ามเขียนระบบคู่ขนานที่ซ้ำกับของเดิม
2. ตัดสินใจเองในเรื่องเล็ก บันทึกลง `docs/FANDAY_DECISIONS.md` ถามผู้ใช้เฉพาะเรื่องที่ "บล็อกจริงๆ" (เช่น ขาด env, ขัดแย้งของ requirement)
3. ทำเป็น Phase ตามข้อ 14 จบแต่ละ Phase ต้อง `tsc --noEmit` ผ่าน และรายงานสั้นๆ ว่าทำอะไร/ทดสอบอะไร
4. **ห้ามแตะ/ลดสิทธิ์ Root Owner** และห้ามทำลายฟีเจอร์เดิม (ตรวจ regression ทุกครั้งที่แก้ `index.ts`, `interactionCreate.ts`, `panel.ts`, `embedPresets.ts`)
5. ห้ามเก็บ secret ในโค้ด ห้าม log ข้อมูลฟอร์มส่วนตัวลง console/AuditLog แบบเต็ม

---

## 1. ภาพรวมกิจกรรม "แฟนเดย์" (Fanday)

กิจกรรมสุ่มจับคู่สมาชิกดิสคอร์ด **753 BC** ให้ได้ "แฟนเดย์" (คู่ประจำวัน/ประจำงาน) เล่นมินิเกมด้วยกัน และเขียนจดหมายถึงกันเมื่อจบ

### จุดเด่นที่ประกาศกับผู้เล่นแล้ว (ต้องทำครบทุกข้อ ห้ามตัด)
1. **สุ่มคู่ตามเพศที่แอดมินกำหนด** (เช่น ชาย↔หญิง, ชาย↔ชาย, หญิง↔หญิง, ผสม/ไม่จำกัด) และ **คนที่มีคู่อยู่แล้วสามารถ "ล็อกคู่" ของตนได้**
2. **แอดมินสร้างแบบฟอร์ม (Form Builder)** เพื่อเก็บข้อมูลไปจับคู่ให้เหมาะสมที่สุด
3. เล่นผ่านบอท **"753 BC Activities"** และมี **AI จับคู่ตาม Type นิสัย** ที่เข้ากัน
4. **มินิเกมให้เล่นกับคู่ของตัวเอง**
5. **ระบบจดหมายถึงอีกฝ่าย** เมื่อเล่นกิจกรรมเสร็จ

### ข้อกำหนดเสริมจากเจ้าของระบบ
- เพิ่มตัวเลือก **"กิจกรรมแฟนเดย์"** ใน `/panel` แล้วเมื่อเลือก **บอทต้องส่ง Panel แฟนเดย์ลงห้องทันที**
- **ทุกข้อความที่บอทส่งหาผู้ใช้ (ทั้งใน Panel, ephemeral, DM, ประกาศ, error)** ต้องเป็น **Embed ทั้งหมด**
- **ทุก Embed ต้องแก้ไขได้ทุกจุด** ผ่าน Dashboard (ใช้ระบบ Embed Studio เดิมใน `apps/web/lib/embedPresets.ts` + `apps/bot/src/services/embedService.ts`)
- ออกแบบ **กฎกติกาและโฟลว์การเล่น** ให้ครอบคลุมที่สุด ไม่เกิดปัญหา
- มี **แผนแก้ปัญหาเฉพาะหน้ากรณีบอทดับ/ล่ม** (Failover & Recovery)

---

## 2. ธีม Embed เริ่มต้น (Default Embed Theme) — อ้างอิงจากภาพที่เจ้าของส่งมา

ภาพอ้างอิง: `C:/Users/jirap/.gemini/antigravity/brain/daf4e68b-6539-41d9-8d15-4f37ac2bfe27/.user_uploaded/media_1793437441083_ee237553.jpg`
(เป็น Panel เกม "ทายดูหนูใคร?" — ให้ใช้ **โครงสร้างหน้าตาเดียวกัน** เป็นธีมตั้งต้นของ Embed ทุกใบในระบบแฟนเดย์)

### โครงสร้างของ Embed ต้นแบบ (ลำดับบนลงล่าง)
| ลำดับ | องค์ประกอบ | ตัวอย่างในภาพ | หมายเหตุ |
|---|---|---|---|
| 1 | **Title** (ตัวหนา) | `ทายดูหนูใคร?` | ชื่อกิจกรรม |
| 2 | **Heading ใหญ่** (`##`) | `จำนวนผู้เล่นปัจจุบัน` | ใน description |
| 3 | **Inline code** | `` `1 คน (ต้องการขั้นต่ำ 7 คน)` `` | ตัวเลขสถานะ |
| 4 | **Heading รอง** (`###`) + inline code | `สถานะห้อง: ` `🟢 เปิดรับสมัครผู้เข้าร่วม` | สถานะสด |
| 5 | **Code block ภาษา `diff`** | `+ กดปุ่มด้านล่างเพื่อเข้าร่วม อ่านกติกา` / `+ หรือตรวจสอบบทบาทของตัวเองได้เลย` | บรรทัด `+` ขึ้นสีเขียว ใช้เป็น "คำแนะนำ" |
| 6 | **Brand divider** | `୨ৎ . 753BC . ୨ৎ` | ⚠️ ต้องเหลือแค่ **753BC** (ตัด "The Astral Realm x" ออกทุกที่) |
| 7 | **เส้นคั่นลายโค้ง** | `◠◠◠◠◠…` (ซ้ำยาวเต็มบรรทัด) | เป็น divider ตกแต่ง |
| 8 | **หัวข้อรายชื่อ** | `📝 **รายชื่อผู้เข้าร่วมล่าสุด**` + inline code ต่อรายชื่อ | แสดงล่าสุดไม่เกิน N คน (ตั้งค่าได้) |
| 9 | **Image (banner ใหญ่)** | ภาพการ์ตูนนักสืบ "ลองทายดูหนูเป็นใคร" | ใส่ผ่าน `image.url` ให้เปลี่ยนได้ |
| 10 | **Footer** | `ระบบกิจกรรม ทายดูหนูใคร? • มาร่วมสนุกไปด้วยกันน้า` | |
| 11 | **สีแถบซ้าย (Embed color)** | น้ำตาล/ส้มอบอุ่น ≈ `#A0714F` | **เปลี่ยนได้** ผ่าน Dashboard (color picker) |

### ปุ่มใต้ Embed (Action Row) — คงรูปแบบ "emoji คร่อมข้อความ"
| ปุ่ม | Style | ตัวอย่างในภาพ |
|---|---|---|
| ปุ่มหลัก | `Primary` (น้ำเงินม่วง) | `🎀 เข้าร่วมเกม 🎀` |
| ปุ่มรอง | `Secondary` (เทา) | `🚪 ออกจากเกม 🚪` |
| ปุ่มกติกา | `Success` (เขียว) | `📖 อ่านกติกา 📖` |
| ปุ่มข้อมูลตัวเอง | `Secondary` (เทา) | `🔎 บทบาทของฉัน 🔎` |

> **ข้อกำหนด**: ป้ายปุ่ม (label), emoji, และ style ของ **ทุกปุ่ม** ต้องแก้ไขได้จาก Dashboard เช่นกัน (เก็บใน `Setting`/config JSON) — ให้ออกแบบ `ComponentConfig` ควบคู่กับ `EmbedConfigData`

### Design Tokens สำหรับ Embed แฟนเดย์
- สร้างไฟล์ `apps/bot/src/utils/fandayTheme.ts` เก็บ: ค่าสีเริ่มต้น (`FANDAY_COLORS`), brand divider, เส้นคั่นโค้ง, helper `fandayEmbed()` ที่ประกอบโครงสร้างข้างต้น
- **ข้อความแบรนด์ทั้งหมดใช้ `୨ৎ . 753BC . ୨ৎ`** — เก็บเป็นค่าคงที่เดียว (`BRAND_DIVIDER`) ให้ Dashboard แก้ได้จุดเดียว
- ชุดสีสถานะ: เปิดรับ 🟢 / ปิดรับ 🔴 / กำลังเล่น 🟡 / จับคู่แล้ว 💗 / จบกิจกรรม 🏁 / พักระบบ 🛠️ (แต่ละสถานะมีสี embed ตั้งค่าได้)

---

## 3. สถาปัตยกรรมและจุดเชื่อมต่อกับระบบเดิม

### 3.1 ชื่อบอท "753 BC Activities"
- บอทปัจจุบันคือ LynnBot (`apps/bot`) ให้ **เพิ่มเป็นโมดูลใหม่** `apps/bot/src/features/fanday/` ไม่ใช่โปรเจกต์ใหม่
- ทำให้ **ชื่อ/อวตาร/ข้อความแบรนด์ในโมดูลนี้ตั้งค่าได้** (`FANDAY_BRAND_NAME` ใน Setting) และรองรับการรันเป็น **บอทตัวที่สอง** โดยใช้ `FANDAY_DISCORD_TOKEN` (optional) — ถ้าไม่ตั้ง ให้ใช้ token เดิม
- ถ้าตัดสินใจแยกบอท ให้ใช้ DB เดียวกัน และแยก entrypoint (`apps/bot/src/fandayIndex.ts`) โดย **แชร์โค้ดโมดูลเดิม** ห้าม copy-paste

### 3.2 ไฟล์/จุดที่ต้องแก้ของเดิม (ห้ามลืม)
| ไฟล์ | สิ่งที่ต้องทำ |
|---|---|
| `apps/bot/src/commands/panel.ts` | เพิ่ม choice `🎀 กิจกรรมแฟนเดย์ (Fanday)` value `fanday` → สร้าง panel แล้วส่งลงห้อง, บันทึก `messageId/channelId` ของ panel ลงฐานข้อมูลเพื่อ **อัปเดต live** (นับผู้เล่น/สถานะ/รายชื่อล่าสุด) |
| `apps/bot/src/services/panelService.ts` | เพิ่ม `buildFandayPanel()` |
| `apps/bot/src/services/panels/` | เพิ่ม `fandayPanelHandler.ts` และ export ใน `index.ts` |
| `apps/bot/src/events/interactionCreate.ts` | route customId ใหม่ (prefix `fd_`) ทั้ง Button / Select / Modal |
| `apps/bot/src/index.ts` + `deploy-commands.ts` | ลงทะเบียน `/fanday` (ถ้าเพิ่มคำสั่ง) ในทั้งสองไฟล์ + เพิ่ม cron/worker ใหม่ |
| `apps/web/lib/embedPresets.ts` | เพิ่ม embed presets หมวด `fanday` ทุกใบ พร้อม `supportedVariables` |
| `apps/bot/src/services/embedService.ts` | ใช้ `renderCustomEmbed(key, defaultEmbed, vars)` เดิมกับทุก embed แฟนเดย์ |
| `packages/database/prisma/schema.prisma` | เพิ่มโมเดลข้อ 4 + `LogCategory.FANDAY` |
| `apps/web/app/(dashboard)/fanday/` + `apps/web/app/api/fanday/**` | หน้าแดชบอร์ดข้อ 10 |
| `apps/web/components/Sidebar.tsx`, `CommandPalette.tsx` | เพิ่มเมนู Fanday (ตรวจสิทธิ์ตาม Permission) |

### 3.3 Convention ที่ต้องเคารพ
- customId รูปแบบ `fd_<area>_<action>[:<id>]` (เช่น `fd_join`, `fd_leave`, `fd_rules`, `fd_myrole`, `fd_lock:<pairId>`, `fd_letter_write:<pairId>`)
- ทุก handler ต้อง `deferReply/deferUpdate` ภายใน 3 วินาที และมี try/catch ตอบ embed error เสมอ
- ใช้ `prisma.$transaction` ทุกครั้งที่แก้หลายตาราง (จับคู่, ล็อกคู่, ส่งจดหมาย)
- เขียน `AuditLog` (category `FANDAY`) ทุก action สำคัญ (แต่ **ห้ามใส่เนื้อหาจดหมาย/คำตอบฟอร์มลง log**)
- สิทธิ์: ใช้ Role hierarchy + Permission เดิม เพิ่มสิทธิ์ `fanday.manage`, `fanday.moderate`, `fanday.view`

---

## 4. โมเดลฐานข้อมูล (Prisma) — เสนอ, ปรับได้ตามเหตุผล

```prisma
model FandayEvent {            // 1 งาน/1 รอบกิจกรรม
  id            String   @id @default(cuid())
  guildId       String
  title         String
  status        FandayStatus @default(DRAFT)   // DRAFT, REGISTRATION, MATCHING, ACTIVE, LETTERS, ENDED, CANCELLED, PAUSED
  pairingMode   String   @default("MALE_FEMALE") // MALE_FEMALE, MALE_MALE, FEMALE_FEMALE, MIXED_ANY, CUSTOM_RULES
  minPlayers    Int      @default(7)
  maxPlayers    Int?
  registrationStart DateTime?
  registrationEnd   DateTime?
  eventStart    DateTime?
  eventEnd      DateTime?
  letterDeadline DateTime?
  panelChannelId String?
  panelMessageId String?
  formId        String?
  allowSelfLock Boolean  @default(true)
  allowReroll   Boolean  @default(true)
  rerollLimit   Int      @default(1)
  aiMatchingEnabled Boolean @default(true)
  config        Json?    // ค่าตั้งอื่นๆ (ปุ่ม, ข้อความ, ธีม)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model FandayForm {             // แบบฟอร์ม (สร้างโดยแอดมิน)
  id        String  @id @default(cuid())
  eventId   String?
  title     String
  questions Json    // [{id,type,label,options,required,weight,affectsMatching,dimension}]
  version   Int     @default(1)
  isActive  Boolean @default(true)
}

model FandayPlayer {           // ผู้เล่น 1 คน / 1 งาน
  id          String @id @default(cuid())
  eventId     String
  discordId   String
  displayName String
  gender      String          // MALE, FEMALE, NONBINARY, PREFER_NOT  (ตามที่แอดมินเปิดให้เลือก)
  seeking     String          // เพศที่ต้องการให้จับคู่ (ถ้าโหมดอนุญาต)
  status      String @default("REGISTERED") // REGISTERED, WAITLIST, MATCHED, LOCKED, WITHDRAWN, BANNED, NO_SHOW
  hasPartner  Boolean @default(false)       // มีคู่อยู่แล้ว (ขอล็อกคู่)
  lockedWithId String?                       // discordId ของคู่ที่ล็อกเอง
  typeCode    String?         // AI personality type
  typeSummary String?
  answers     Json?           // คำตอบฟอร์ม (เข้ารหัส/จำกัดสิทธิ์อ่าน)
  rerollsUsed Int    @default(0)
  joinedAt    DateTime @default(now())
  @@unique([eventId, discordId])
}

model FandayPair {
  id          String @id @default(cuid())
  eventId     String
  playerAId   String
  playerBId   String
  source      String          // RANDOM, AI, SELF_LOCK, ADMIN_MANUAL
  compatibility Float?        // 0-100
  reason      String?         // คำอธิบายสั้นๆ ที่ AI/ระบบให้ (แสดงให้ผู้เล่นเห็นได้)
  status      String @default("ACTIVE") // PENDING_CONFIRM, ACTIVE, DISSOLVED, COMPLETED
  channelId   String?         // ห้อง/เธรดส่วนตัวของคู่
  lockedAt    DateTime?
  createdAt   DateTime @default(now())
}

model FandayGameSession {      // มินิเกมของคู่
  id        String @id @default(cuid())
  pairId    String
  gameKey   String
  state     Json
  status    String @default("PENDING")
  score     Int?
  startedAt DateTime?
  endedAt   DateTime?
}

model FandayLetter {           // จดหมาย
  id         String @id @default(cuid())
  eventId    String
  pairId     String
  fromId     String // discordId
  toId       String
  content    String @db.Text
  isAnonymous Boolean @default(false)
  status     String @default("DRAFT") // DRAFT, PENDING_REVIEW, SENT, DELIVERED, BLOCKED
  deliveredAt DateTime?
  createdAt  DateTime @default(now())
}

model FandayMatchLog { id String @id @default(cuid()) eventId String runAt DateTime @default(now()) mode String seed String snapshot Json }   // เพื่อ replay/ตรวจสอบความโปร่งใส
model FandayBlock    { id String @id @default(cuid()) eventId String? blockerId String blockedId String }                                      // "ไม่อยากถูกจับคู่กับคนนี้"
```

> ให้ Gemini ตรวจ naming/relation/index ให้เข้ากับ schema เดิม (`@@map` แบบ snake_case ตามเดิม) และเพิ่ม `@@index` ที่จำเป็น
> **Embed/ปุ่ม config** เก็บผ่านตาราง/กลไกเดิมของ Embed Studio (`/api/embeds`) ไม่ต้องสร้างตารางใหม่ถ้าไม่จำเป็น

---

## 5. โฟลว์การเล่นทั้งหมด (Game Flow & State Machine)

```
DRAFT → REGISTRATION → MATCHING → ACTIVE → LETTERS → ENDED
                ↘ PAUSED (พักได้ทุกช่วง)   ↘ CANCELLED
```

### Phase A — แอดมินตั้งค่างาน (Dashboard หรือ `/fanday setup`)
1. สร้าง Event: ชื่อ, ช่วงเวลา, โหมดเพศ, ขั้นต่ำ/สูงสุดผู้เล่น, เปิด-ปิดล็อกคู่, เปิด-ปิด AI
2. สร้าง/เลือก **แบบฟอร์ม** (ข้อ 7) แล้วเลือกห้องที่จะวาง Panel
3. กด **"ส่ง Panel"** (หรือใช้ `/panel type:fanday`) → บอทส่ง Panel + บันทึก messageId
4. Preview Embed ทุกใบได้ก่อนเผยแพร่ (ปุ่ม "ส่งทดสอบถึงฉัน")

### Phase B — เปิดรับสมัคร (REGISTRATION)
ผู้เล่นกด **🎀 เข้าร่วมเกม** →
1. ตรวจสอบเงื่อนไข: อยู่ในเซิร์ฟเวอร์, ไม่ถูกแบน/บล็อกจากกิจกรรม, ยังไม่เต็ม, อยู่ในช่วงเวลา (ถ้าเต็ม → เข้า **WAITLIST** พร้อม embed แจ้ง)
2. เปิด **Modal/Select** ขั้นแรก: เพศ, เพศที่ต้องการจับคู่ (ตามโหมด), "มีคู่แล้วและต้องการล็อกคู่หรือไม่"
3. ส่ง **แบบฟอร์มจับคู่** (แบบหลายขั้น: Select Menu + Modal; ถ้าเกิน 5 ช่องต่อ Modal ให้แบ่งหน้า + ปุ่ม "ถัดไป"; เก็บ draft ไว้ เพื่อให้กลับมาทำต่อได้เมื่อบอทรีสตาร์ท)
4. ยืนยันการสมัครด้วย Embed สรุป (ephemeral) + แก้ไขข้อมูลได้จนถึงปิดรับ
5. Panel หลักอัปเดตสด: จำนวนผู้เล่น, สถานะห้อง, รายชื่อล่าสุด (debounce อย่างน้อย 5–10 วินาที เพื่อกัน rate limit)
6. ปุ่ม **🚪 ออกจากเกม**: ถามยืนยัน, ถ้าจับคู่แล้วต้องแจ้งคู่ + ดำเนินการ "ถอนตัวหลังจับคู่" (ข้อ 8.4)

### Phase C — ล็อกคู่ (Self-Lock) สำหรับคนมีคู่อยู่แล้ว
1. A เลือก "ล็อกคู่" แล้ว **เลือก/ระบุ B** (User Select Menu)
2. B ได้รับ **Embed + ปุ่มยืนยัน/ปฏิเสธ** (DM ถ้าได้ / ไม่งั้นแท็กใน ephemeral/ช่องแจ้งเตือน)
3. เมื่อ **ทั้งสองฝ่ายยืนยัน** → สร้าง `FandayPair(source=SELF_LOCK, status=ACTIVE)` และ **ถอดทั้งคู่ออกจาก pool สุ่ม**
4. กันกรณี: B ไม่ได้สมัคร (ชวนให้สมัครก่อน), B ถูกล็อกกับคนอื่นแล้ว, A=B, ยืนยันไม่ทันเวลา (หมดอายุอัตโนมัติ + แจ้งเตือน), ยกเลิกก่อนเริ่มจับคู่ได้
5. หลัง MATCHING เริ่มแล้ว **ห้ามแก้ล็อกคู่** ยกเว้นแอดมิน

### Phase D — จับคู่ (MATCHING)
ทริกเกอร์โดยแอดมิน (ปุ่มใน Dashboard/คำสั่ง) หรือตามเวลา:
1. **Pre-check**: ผู้เล่น ≥ `minPlayers` และมีสัดส่วนเพศตรงกับโหมด (ถ้าไม่พอ → แสดงรายงานให้แอดมินเลือก: รอเพิ่ม / ปรับโหมด / อนุญาต "กลุ่มสาม" / ให้คนเหลือเป็น "Bye")
2. **Dry-run (Preview)**: แสดงผลจับคู่ร่างให้แอดมินดู/สลับ/ล็อก/ลบคู่ก่อนยืนยัน
3. **Commit**: บันทึก `FandayPair` + `FandayMatchLog(seed, snapshot)` ใน transaction เดียว (idempotent — กดซ้ำไม่สร้างซ้ำ)
4. **เปิดเผยคู่**: ส่ง Embed ให้แต่ละคู่ (DM + สร้าง **ห้องส่วนตัวของคู่** ด้วย private thread/channel ที่เห็นแค่ 2 คน + แอดมินดูได้ตามสิทธิ์) พร้อมปุ่มเริ่มเล่น
5. จัดการ "ผู้เหลือ" (จำนวนคี่ / เพศไม่สมดุล): ตัวเลือก Bye pairing, กลุ่มสาม, หรือ Waitlist priority รอบหน้า — ต้องมี policy ชัดเจนและแจ้งผู้เล่นอย่างโปร่งใส

### Phase E — เล่นกิจกรรม (ACTIVE)
- ห้องส่วนตัวของคู่ มี Panel: **เริ่มมินิเกม / ดูภารกิจวันนี้ / เขียนจดหมาย / ขอเปลี่ยนคู่ / รายงานปัญหา**
- มี **Icebreaker Cards** (หัวข้อชวนคุย) ที่ AI/ระบบสร้างตาม Type ของคู่
- นับ "คะแนนความสนิท/Bond Score" จากการทำมินิเกม+ภารกิจ (ถ้าต้องการต่อยอดกิจกรรม)

### Phase F — จดหมายและจบกิจกรรม (LETTERS → ENDED)
ดูข้อ 9 — เมื่อคู่ทำ "เงื่อนไขจบกิจกรรม" (เช่น เล่นมินิเกมครบ N เกม หรือหมดเวลา) จึงปลดล็อกจดหมาย
จบงาน: ส่ง Embed สรุป (สถิติคู่), ปิดห้องส่วนตัวตามกำหนด (archive ไม่ลบทันที), อัปเดต Panel เป็น "จบกิจกรรม"

---

## 6. ระบบจับคู่ (Matching Engine) + AI Type

สร้างที่ `apps/bot/src/features/fanday/matching/` แยกเป็นฟังก์ชัน **pure** ที่เทสต์ได้ (ไม่ผูก Discord)

### 6.1 กฎแข็ง (Hard Constraints) — ต้องผ่านทุกข้อ
- ตรงโหมดเพศ/ความต้องการของทั้งสองฝ่าย (mutual)
- ไม่อยู่ใน `FandayBlock` ของกันและกัน
- ไม่ถูกล็อกคู่กับคนอื่นแล้ว
- ไม่เคยเป็นคู่กันในรอบก่อนหน้า (ตั้งค่าได้)
- ผู้เล่นสถานะ `REGISTERED` เท่านั้น

### 6.2 คะแนนความเข้ากัน (Soft Score 0–100)
- คำนวณจากคำตอบฟอร์มตาม `weight` และ `dimension` ของแต่ละคำถาม (เช่น สไตล์การคุย, ช่วงเวลาออนไลน์, ความชอบเกม, ความเปิดเผย, ความสนุก/จริงจัง)
- **Time-overlap**: ช่วงเวลาออนไลน์ซ้อนกันอย่างน้อย X ชม. (กันคู่ที่ไม่มีทางเจอกัน)
- รองรับ "เหมือนกันแล้วดี" (similarity) และ "เติมเต็มกัน" (complementary) ต่อมิติ
- ใช้ **Hungarian algorithm / min-cost matching** (หรือ greedy + local-swap ถ้าผู้เล่น <200) เพื่อ global optimum ไม่ใช่จับคู่ทีละคน
- โหมด "สุ่มล้วน": สุ่มด้วย **seeded PRNG** (เก็บ seed ใน MatchLog เพื่อพิสูจน์ความยุติธรรม/ทำซ้ำได้)

### 6.3 AI Personality Type
- ใช้ **Gemini API** (เพิ่ม `GEMINI_API_KEY`) วิเคราะห์คำตอบฟอร์ม → ได้ `typeCode` (ชุด Type ที่แอดมินกำหนด/แก้ไขได้ เช่น 8–16 Type พร้อมชื่อน่ารัก/emoji/คำอธิบาย) + `typeSummary`
- **Structured output (JSON schema) เท่านั้น** + validate ด้วย zod; timeout 10–15 วิ; retry แบบ exponential backoff
- **Fallback เชิงกฎ (rule-based)**: ถ้า AI ล่ม/ไม่มี key/โควตาหมด ต้องสามารถหา Type และจับคู่ได้เองจากตารางคะแนน — **ระบบต้องไม่หยุดเพราะ AI**
- **Prompt ที่ส่งให้ AI**: ไม่ส่ง Discord ID/ชื่อจริง ส่งเฉพาะคำตอบที่จำเป็น (pseudonymize), ป้องกัน prompt injection จากคำตอบอิสระ (ตัดความยาว, ครอบด้วย delimiter, สั่งให้ละเว้นคำสั่งในข้อมูล)
- **AI Explain**: สร้าง "เหตุผลที่คู่นี้เหมาะกัน" 1–2 ประโยค (ภาษาไทยน่ารัก สุภาพ ไม่ตัดสิน/ไม่ล่วงละเมิด) แสดงใน Embed เปิดเผยคู่
- **Matrix ตารางความเข้ากันของ Type** แก้ไขได้จาก Dashboard (Type × Type → score)
- แคชผลต่อผู้เล่น (`typeCode`) ไม่เรียก AI ซ้ำเมื่อคำตอบไม่เปลี่ยน

### 6.4 ความโปร่งใส & ความเป็นธรรม
- เก็บ seed/snapshot, แอดมินดู "ทำไมถึงจับคู่นี้" ได้ (breakdown คะแนน)
- แอดมินสลับคู่/จับมือ (`ADMIN_MANUAL`) ได้ แต่ทุกการแก้ไขลง AuditLog
- ผู้เล่น **ขอ Reroll** ได้ตามโควตา (`rerollLimit`) เมื่อทั้งสองฝ่ายยินยอม หรือแอดมินอนุมัติ

---

## 7. ตัวสร้างแบบฟอร์มของแอดมิน (Admin Form Builder — Dashboard)

หน้า `/fanday/forms` ใน Dashboard:
- ชนิดคำถาม: เลือกข้อเดียว (Select), หลายข้อ (Multi-select), สเกล 1–5, ข้อความสั้น, ข้อความยาว, เลือกช่วงเวลาออนไลน์
- ตั้งค่าต่อคำถาม: `required`, `weight`, `dimension` (มิติบุคลิก), `affectsMatching`, โหมด similarity/complementary, ตัวเลือกแต่ละข้อมีค่าคะแนนต่อมิติ
- **เทมเพลตแบบฟอร์มสำเร็จรูป** ให้เริ่มได้ทันที (บุคลิก/ความชอบเกม/ช่วงเวลาออนไลน์/ขอบเขตการคุย) แล้วแก้ไขได้
- Preview แบบเดียวกับที่ผู้เล่นเห็นใน Discord (Embed + Select + Modal) ข้อจำกัด Discord: Modal ≤ 5 ช่อง, Select ≤ 25 ตัวเลือก, label ≤ 45 ตัวอักษร — **Validator ในหน้า Builder ต้องเตือน/ตัดแบ่งหน้าให้อัตโนมัติ**
- Versioning: แก้ฟอร์มหลังมีคนตอบแล้วต้องสร้างเวอร์ชันใหม่ (คำตอบเก่าผูกเวอร์ชันเดิม)
- ส่งออกคำตอบเป็น CSV (เฉพาะผู้มีสิทธิ์ `fanday.manage`)

---

## 8. กฎกติกา & เงื่อนไขการเล่น (Rules) — ออกแบบให้ครอบคลุม

> ให้สร้างเป็น **เนื้อหากติกาแก้ไขได้ใน Dashboard** (Embed "อ่านกติกา" หลายหน้า มีปุ่มเลื่อนหน้า) พร้อมค่าเริ่มต้นดังนี้

### 8.1 กติกาทั่วไป
1. เข้าร่วมด้วยความสมัครใจ ต้องอยู่ในเซิร์ฟเวอร์ตลอดกิจกรรม
2. ให้ข้อมูลตามจริง การให้ข้อมูลเท็จ (เช่น เพศ) อาจถูกตัดสิทธิ์
3. 1 คนต่อ 1 บัญชี (ห้ามใช้บัญชีรอง)
4. สุภาพ เคารพกัน ห้ามคุกคาม ล่วงละเมิด ข่มขู่ บีบบังคับ หรือเรียกร้องข้อมูลส่วนตัวเกินจำเป็น
5. กิจกรรมนี้ **เพื่อความสนุกและมิตรภาพ** ไม่ใช่การบังคับให้เกิดความสัมพันธ์
6. ห้ามเผยแพร่แชท/จดหมาย/ข้อมูลของคู่ต่อสาธารณะโดยไม่ได้รับอนุญาต
7. ผู้ดูแลอ่านเนื้อหาส่วนตัวได้เฉพาะกรณี **มีการรายงานเท่านั้น** (แจ้งในกติกาอย่างโปร่งใส)
8. ผู้ร่วมกิจกรรมที่อายุต่ำกว่าเกณฑ์ที่เซิร์ฟเวอร์กำหนด (ตั้งค่าได้) ไม่สามารถเข้าร่วมได้

### 8.2 กติกาการจับคู่
- ผลการสุ่มถือเป็นที่สิ้นสุด ยกเว้นเข้าเงื่อนไข Reroll/ขอเปลี่ยนคู่ (8.4)
- คู่ที่ล็อกกันเอง ต้องยืนยันทั้งสองฝ่ายภายในเวลาที่กำหนด (ค่าเริ่มต้น 24 ชม.)
- ผู้เล่นที่ไม่ตอบ/ไม่เล่นภายใน X ชม. หลังเปิดเผยคู่ ถูกมาร์ก `NO_SHOW` และคู่สามารถขอจับคู่ใหม่/เข้า Waitlist ได้

### 8.3 กติกามินิเกม & จดหมาย
- มินิเกมต้องเล่นกับคู่ตนเองเท่านั้น คะแนนผูกกับคู่
- จดหมายต้องไม่มีเนื้อหาผิดกฎ (กรองด้วย AutoMod/คำต้องห้ามเดิม + ตัวกรองของกิจกรรม)
- จดหมายแบบนิรนามได้ (ตั้งค่าเปิด-ปิดได้) แต่แอดมินตรวจย้อนหลังได้เมื่อมีรายงาน

### 8.4 กรณีพิเศษ (Edge Cases) — ต้องมี Flow รองรับทุกข้อ
| สถานการณ์ | วิธีจัดการ |
|---|---|
| ผู้เล่นถอนตัวหลังจับคู่ | แจ้งคู่ด้วย Embed สุภาพ ไม่ระบุเหตุผลส่วนตัว → เสนอ "จับคู่ใหม่ / รอ Waitlist / ยุติ" ให้คู่ที่เหลือ |
| คู่ไม่ตอบกัน | ตัวนับเวลา → เตือน → ทำเครื่องหมาย NO_SHOW → เสนอจับใหม่ |
| ผู้เล่นออกจากเซิร์ฟเวอร์ (`guildMemberRemove`) | ถอนออกอัตโนมัติ + แจ้งคู่ |
| คนเหลือเป็นเศษ (คี่/เพศไม่สมดุล) | ตาม policy ข้อ Phase D.5 (Bye/กลุ่มสาม/Waitlist ลำดับต้นรอบหน้า) |
| ถูกจับคู่กับคนที่ไม่สบายใจ | ปุ่ม "ขอเปลี่ยนคู่/รายงาน" (ลับ) → แอดมินพิจารณา, เพิ่มเข้า `FandayBlock` อัตโนมัติ |
| รายงานการคุกคาม | Embed ถึงห้องแอดมินทันที, แช่แข็งห้องคู่ (freeze), ขั้นตอน warn/ban กิจกรรม (ผูก `Warning` เดิม) |
| DM ปิดอยู่ | Fallback แจ้งใน ephemeral / ห้องส่วนตัวของคู่ / ช่องแจ้งเตือนกิจกรรม |
| กดปุ่มซ้ำ/กดพร้อมกัน (race) | idempotency key + unique constraint + transaction |
| ผู้เล่นทั้งสองล็อกคู่ไขว้ (A→B, B→C) | ระบบตรวจ cycle แล้วปฏิเสธคำขอที่ขัดแย้ง พร้อมอธิบาย |
| แอดมินแก้กติกา/ฟอร์มกลางงาน | ล็อกฟิลด์ที่กระทบการจับคู่เมื่อเข้า MATCHING, แสดงคำเตือน |

---

## 9. มินิเกม & ระบบจดหมาย

### 9.1 มินิเกมของคู่ (เล่นในห้องส่วนตัวของคู่ ด้วยปุ่ม/Select/Modal)
สร้างเป็น **Game Registry** (`features/fanday/games/`) แต่ละเกมมี interface เดียวกัน: `start / handleInteraction / score / timeout / resume` — เพิ่มเกมใหม่ได้โดยไม่แก้แกนระบบ

เกมตั้งต้นที่ต้องทำ (อย่างน้อย 5):
1. **🧠 Couple Quiz (ใครรู้จักใครมากกว่า)** — ทั้งสองตอบคำถามเกี่ยวกับตัวเอง แล้วทายคำตอบของอีกฝ่าย ได้คะแนนตามที่ทายถูก
2. **🎭 Two Truths & a Lie** — แต่ละคนส่ง 3 ประโยค อีกฝ่ายทายว่าข้อไหนโกหก
3. **🎲 Would You Rather** — เลือกแล้วเทียบคำตอบ แสดง % ความเหมือน
4. **🎁 Mystery Gift / Emoji Story** — ส่งของขวัญเสมือนจริงจากรายการ + เหตุผล/ต่อเรื่องสั้นด้วยอีโมจิ
5. **🧩 Daily Mission (ภารกิจประจำวัน)** — ภารกิจเล็กๆ ให้คู่ทำร่วมกัน (เช่น แชร์เพลงโปรด, ส่งรูปของกินที่ชอบ)
6. (โบนัส) **Compatibility Reveal** — เปิดเผยผลวิเคราะห์ Type ของคู่แบบ Reveal ทีละขั้น

**ข้อกำหนดมินิเกม**
- State เก็บใน `FandayGameSession` ทุกขั้น → **บอทรีสตาร์ทแล้วเล่นต่อได้** (resume)
- มี timeout/ผู้เล่นหาย → จบเกมด้วยคะแนนบางส่วน ไม่ค้าง
- คำถาม/ภารกิจ/Would-you-rather เป็น **คลังข้อมูลที่แอดมินเพิ่ม-ลบ-แก้ได้ใน Dashboard** (+ AI ช่วยสร้างชุดคำถามตาม Type ได้)
- ทุกข้อความของเกมใช้ Embed ที่แก้ไขได้ (คีย์ `fanday_game_*`)
- ป้องกันโกง: ตรวจว่า interaction มาจากสมาชิกของคู่นั้น, ปุ่มหมดอายุ, ตอบซ้ำไม่ได้

### 9.2 ระบบจดหมาย
- ปลดล็อกเมื่อคู่ทำเงื่อนไขจบกิจกรรม (ตั้งค่า: จำนวนเกมขั้นต่ำ/เวลา/แอดมินเปิด manual)
- เขียนผ่าน **Modal** (จำกัดความยาว ตั้งค่าได้; รองรับจดหมายยาวด้วยการแบ่งส่วน/ต่อเนื่อง), มีปุ่ม **ดูตัวอย่างก่อนส่ง** + **ยืนยันส่ง**
- เลือก **ลงชื่อ/นิรนาม**, เลือก **ธีมกระดาษจดหมาย (Embed สี/รูป)** ได้
- ตัวกรองเนื้อหา → หากผิดกฎเข้าคิว `PENDING_REVIEW` ให้แอดมินตรวจก่อนส่ง
- **ส่งถึงปลายทางทาง DM + เก็บสำเนาในห้องคู่/หน้า "กล่องจดหมายของฉัน"** (ปุ่ม `📮 กล่องจดหมาย` ใน Panel) เพื่อกัน DM ปิด
- ปุ่ม "ตอบกลับ" 1 ครั้ง, กำหนด `letterDeadline`, เตือนก่อนหมดเวลา
- อนุญาตให้ **ส่งจดหมายถึง "ทุกคน/กำแพงจดหมายสาธารณะ" แบบไม่เปิดเผยตัว (ถ้าเปิด)** — ทางเลือก ปิดเป็นค่าเริ่มต้น
- จดหมายที่ยังไม่ส่งเมื่อจบงาน: **ส่งอัตโนมัติ (auto-send draft)** หรือเก็บไว้ตามที่ตั้งค่า
- เนื้อหาจดหมาย **เข้ารหัสหรือจำกัดสิทธิ์อ่าน**; ผู้ดูแลเห็นได้เฉพาะเมื่อมี Report

---

## 10. Dashboard (Web) — `apps/web`

เพิ่มหมวด **Fanday** ในเมนู (สิทธิ์ `fanday.view` / `fanday.manage`):

| หน้า | ฟังก์ชัน |
|---|---|
| `/fanday` | ภาพรวมงาน: สถานะ, จำนวนผู้เล่น (แยกเพศ), คู่, มินิเกมที่เล่น, จดหมายที่ส่ง, graph ความคืบหน้า |
| `/fanday/events` | สร้าง/แก้ไข/เปลี่ยนสถานะงาน, ปุ่ม **ส่ง Panel**, **เปิด-ปิดรับ**, **เริ่มจับคู่**, **หยุดชั่วคราว (Pause)** |
| `/fanday/players` | รายชื่อผู้เล่น, ตัวกรอง, แก้ไข/ถอดผู้เล่น, ดู Type, ดูคำตอบ (ต้องมีสิทธิ์พิเศษ + AuditLog) |
| `/fanday/matching` | **Dry-run preview**, ลาก-วางสลับคู่, ดูคะแนน/เหตุผล, ล็อก/ปลดคู่, Commit, ดู MatchLog/seed |
| `/fanday/forms` | Form Builder (ข้อ 7) |
| `/fanday/types` | จัดการ AI Type + ตารางความเข้ากัน (Type matrix) |
| `/fanday/games` | คลังคำถาม/ภารกิจ/เกม, เปิด-ปิดเกม, ตั้งคะแนน |
| `/fanday/letters` | คิวตรวจจดหมาย (เฉพาะ PENDING_REVIEW/ถูกรายงาน), สถิติการส่ง |
| `/fanday/reports` | เคสรายงาน/ขอเปลี่ยนคู่, จัดการ (warn/ban/แทนคู่) |
| `/fanday/embeds` | **Embed Studio ของแฟนเดย์**: แก้ **ทุก Embed + ปุ่ม** (ข้อ 11) พร้อม Live Preview และปุ่ม "ส่งทดสอบ" |
| `/fanday/ops` | **War Room** (ข้อ 12): สุขภาพบอท, คิวงาน, ปุ่มกู้คืน |

ข้อกำหนด: ใช้ดีไซน์ Apple Pro Dark เดิมของ Dashboard, ใช้ SSE `/api/events/stream` เดิมสำหรับ live, ทุก API ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์, ฟอร์มมี validation (zod)

---

## 11. ระบบ Embed ที่แก้ไขได้ทุกจุด (Embed Customization)

**กฎ**: ห้าม hard-code ข้อความที่ผู้ใช้เห็นใน handler โดยตรง — ทุกข้อความต้องผ่าน `renderCustomEmbed(key, defaultEmbed, variables)`

### 11.1 รายการ Embed Keys ที่ต้องสร้าง (หมวด `fanday`) — อย่างน้อย
`fanday_panel_main`, `fanday_rules_p1..pN`, `fanday_join_step_gender`, `fanday_join_step_form`, `fanday_join_confirm`, `fanday_join_full_waitlist`, `fanday_join_closed`, `fanday_leave_confirm`, `fanday_leave_done`, `fanday_myrole`, `fanday_lock_request`, `fanday_lock_confirm_dm`, `fanday_lock_accepted`, `fanday_lock_declined`, `fanday_lock_expired`, `fanday_matching_started`, `fanday_match_reveal`, `fanday_match_reveal_dm`, `fanday_pair_room_welcome`, `fanday_icebreaker`, `fanday_game_menu`, `fanday_game_*` (ทุกเกม ทุกขั้น), `fanday_letter_unlock`, `fanday_letter_compose`, `fanday_letter_preview`, `fanday_letter_sent`, `fanday_letter_delivered`, `fanday_letter_inbox`, `fanday_letter_reminder`, `fanday_partner_withdrew`, `fanday_noshow_warning`, `fanday_reroll_request`, `fanday_report_received`, `fanday_event_summary`, `fanday_event_paused`, `fanday_event_ended`, `fanday_error_generic`, `fanday_error_permission`, `fanday_error_cooldown`, `fanday_maintenance`

### 11.2 สิ่งที่ต้องแก้ไขได้ต่อ Embed
Title, Description, สี, Thumbnail, Image, Author, Footer, Fields, Timestamp (ตามโครงสร้าง `EmbedConfigData` เดิม) **+** ป้ายปุ่ม/emoji/style ของปุ่มที่แนบ

### 11.3 ตัวแปร (`supportedVariables`) ที่ต้องรองรับ
`{user}`, `{user_name}`, `{partner}`, `{partner_name}`, `{event_title}`, `{player_count}`, `{min_players}`, `{status_label}`, `{status_emoji}`, `{recent_players}`, `{type_name}`, `{type_summary}`, `{compat_score}`, `{match_reason}`, `{game_name}`, `{round}`, `{score}`, `{deadline}` (ใช้ `<t:unix:R>`), `{pair_channel}`, `{brand_divider}`, `{wave_divider}`

- **Dynamic block**: รายชื่อล่าสุด/สถานะ ต้องเป็นตัวแปร (`{recent_players}`) ที่ระบบเติมเอง ไม่ใช่ข้อความตายตัว
- **Fallback เสมอ**: ถ้า config ใน DB พังหรือหาไม่เจอ → ใช้ default จากโค้ด (ห้ามให้ผู้ใช้เห็น error ดิบ)
- **Validator**: เตือนเมื่อเกินลิมิต Discord (title 256, description 4096, fields 25, ผลรวม 6000 ตัวอักษร) ก่อนบันทึก
- **Embed แรกเริ่ม (default)** ของ `fanday_panel_main` ต้องมีหน้าตาตรงตามข้อ 2 ทุกประการ (เปลี่ยน brand เป็น `୨ৎ . 753BC . ୨ৎ`)

---

## 12. แผนรับมือบอทล่ม / กู้คืนเฉพาะหน้า (Resilience & Failover)

> เป้าหมาย: **บอทดับกลางงานแล้วกิจกรรมไม่เสีย ไม่ซ้ำ ไม่หาย** และแอดมินแก้เฉพาะหน้าได้ใน 5 นาที

### 12.1 หลักการออกแบบ (Prevention)
1. **State ทั้งหมดอยู่ใน DB** ไม่พึ่งหน่วยความจำ (ยกเว้น cache) — draft ฟอร์ม, ล็อกคู่ที่รอยืนยัน, game state, จดหมาย draft
2. **Persistent components**: ปุ่ม/เมนูใช้ customId ตายตัว (`fd_*`) ทำงานได้หลังรีสตาร์ท ไม่พึ่ง collector ในหน่วยความจำ
3. **Idempotent ทุก action** (กดซ้ำ/ระบบรันซ้ำไม่สร้างข้อมูลซ้ำ) + transaction
4. **Job Queue/Scheduler ใน DB** (ตาราง `FandayJob`: type, runAt, payload, status, attempts, lastError) — ใช้แทน setTimeout ล้วนๆ มี worker poll ทุก 15–30 วินาที, retry พร้อม backoff, dead-letter หลัง N ครั้ง (เช่น เตือนจดหมาย, ปิดรับสมัครอัตโนมัติ, หมดอายุล็อกคู่, เปิดเผยคู่ตามเวลา)
5. **Rate-limit aware**: คิวอัปเดต Panel/DM (เช่น 1 แก้ไข/5 วินาที/ข้อความ), จัดการ 429 อย่างสุภาพ
6. **Graceful shutdown**: รอ job ที่ค้างจบ, บันทึกสถานะ `BotSession`
7. Health check `/health` เดิม (port 3001) เพิ่มรายละเอียดสถานะ Fanday (queue depth, last tick)

### 12.2 เมื่อบอทกลับมา (Auto-Recovery on Boot)
เมื่อ `ClientReady`:
1. **Reconcile Panels**: ดึง Event ที่ active → ตรวจว่า message/panel ยังอยู่ ถ้าหายให้ส่งใหม่/แก้ไขให้ตรงสถานะ
2. **Catch-up jobs**: รัน job ที่ `runAt` เลยกำหนดระหว่างบอทดับ (ตามลำดับ, ไม่ซ้ำ)
3. **Re-sync ผู้เล่น**: เทียบสมาชิกในเซิร์ฟเวอร์กับ `FandayPlayer` (คนออกไประหว่างดับ → ถอนออก)
4. **ส่งแจ้งเตือนที่ค้างส่ง** (outbox pattern: ตาราง `FandayOutbox` เก็บ DM/Embed ที่ยังไม่สำเร็จ แล้วลองใหม่)
5. **ประกาศ "บอทกลับมาแล้ว"** ในห้องกิจกรรมด้วย Embed (`fanday_maintenance` ชนิด recovered) ถ้าดับเกิน X นาที พร้อมขยายเวลาเส้นตายอัตโนมัติ (ตั้งค่าได้: grace extension)
6. มินิเกมที่ค้างให้ **resume** หรือ timeout ตามกฎ

### 12.3 เมื่อบอทยังไม่กลับ (Manual Fallback สำหรับแอดมิน)
- **Maintenance Mode / Pause**: สวิตช์ใน Dashboard และคำสั่งฉุกเฉิน (ถ้าบอทยังตอบ) — เมื่อเปิด ปุ่มทุกอันตอบ Embed "ระบบพักชั่วคราว" และ **หยุดนับ deadline** (freeze timers)
- **Banner ประกาศเฉพาะหน้า**: Dashboard ส่งข้อความแจ้งผู้เล่นผ่าน **Discord Webhook** (ไม่ต้องพึ่งบอท) ใช้ Embed แจ้ง "ระบบขัดข้อง กำลังแก้ไข" — ตั้งค่า `FANDAY_FALLBACK_WEBHOOK_URL`
- **Manual Operations ใน Dashboard (ใช้ DB โดยตรง)**: เปิด/ปิดรับสมัคร, ขยายเวลา, จับคู่/สลับคู่, ส่งออกรายชื่อ+คู่เป็น CSV เพื่อประกาศมือผ่านโพสต์ปกติ, แก้สถานะผู้เล่น, ตั้ง `letterDeadline` ใหม่
- **Export Snapshot**: ปุ่มส่งออกข้อมูลงานทั้งหมด (JSON/CSV) เพื่อสำรองก่อน/หลังเหตุการณ์ + backup อัตโนมัติรายชั่วโมงระหว่างงานเข้า `RoleBackup`-style table หรือไฟล์ R2
- **Runbook** ไฟล์ `docs/FANDAY_RUNBOOK.md` — ขั้นตอนชัดเจน: บอทดับ / DB ดับ / AI ดับ / Discord rate-limit / ประกาศผิดพลาด / จับคู่ผิด (rollback ด้วย `FandayMatchLog`) / ผู้เล่นร้องเรียน
- **Rollback การจับคู่**: ปุ่ม "ยกเลิกผลจับคู่ล่าสุด" (revert จาก MatchLog snapshot) ก่อนเปิดเผยคู่เท่านั้น; หลังเปิดเผยแล้วใช้ flow ขอเปลี่ยนคู่

### 12.4 Degradation Matrix (ระบบต้องเสื่อมอย่างสุภาพ)
| ส่วนที่ล่ม | พฤติกรรมที่ต้องเป็น |
|---|---|
| Gemini AI | ใช้ rule-based fallback ทันที (ไม่บล็อกผู้เล่น) + แจ้งแอดมินใน ops |
| DM ส่งไม่ได้ | fallback ห้องคู่/ephemeral/กล่องจดหมาย |
| แก้ Panel ไม่ได้ (rate limit/ลบ) | เข้าคิว, สร้างใหม่ถ้าจำเป็น |
| R2/รูปภาพ | ใช้ default image จาก config หรือไม่แสดงรูป (ไม่ทำให้ embed ล้ม) |
| DB ช้า/ล่ม | ตอบ embed "ลองใหม่อีกครั้ง" ไม่ crash, ไม่สูญเสียการกด (ข้อความ error ที่ปลอดภัย) |
| บอทดับ | ข้อ 12.3 |

---

## 13. ความปลอดภัย ความเป็นส่วนตัว และ Moderation

- **ข้อมูลอ่อนไหว**: เพศ, คำตอบฟอร์ม, เนื้อหาจดหมาย, คู่ → จำกัดสิทธิ์อ่านที่ API และ UI; เข้ารหัสฟิลด์ที่เป็นเนื้อหาส่วนตัว (AES-GCM ด้วย `FANDAY_ENCRYPTION_KEY`)
- แสดง **Consent Embed** ก่อนสมัคร (ข้อมูลที่เก็บ, ใช้ทำอะไร, ใครเห็นได้, ลบได้อย่างไร) — ต้องกดยอมรับก่อน
- **สิทธิ์ลบข้อมูล**: ผู้เล่นขอถอนตัว+ลบข้อมูลได้, ระบบ purge อัตโนมัติหลังงานจบ N วัน (ตั้งค่าได้)
- ผู้เล่นไม่สามารถเห็นข้อมูลฟอร์มดิบของอีกฝ่าย เห็นแค่ Type/เหตุผลที่ระบบเผยแพร่
- ปุ่ม **"รายงาน/บล็อก"** ในห้องคู่ทุกห้อง (ลับ)
- ตัวกรองเนื้อหา (ต่อยอด `automodService`) + rate-limit การส่งข้อความ/จดหมาย
- Cooldown ทุกปุ่มที่กดสแปมได้, ตรวจสิทธิ์ทุก interaction (ไม่ trust customId)
- ห้ามให้ผู้เล่นแท็ก/ DM คนอื่นผ่านบอทแบบอิสระ (ป้องกัน abuse)

---

## 14. แผนการทำงานเป็น Phase (ทำตามลำดับ จบแต่ละ Phase ต้องรายงาน)

| Phase | งาน | เกณฑ์ผ่าน |
|---|---|---|
| **0 — สำรวจ** | อ่านโค้ดเดิมตามข้อ 3.2, สรุปแผนสั้นๆ + ความเสี่ยง, เขียน `docs/FANDAY_DECISIONS.md` | ได้แผนไฟล์ที่จะแก้/สร้างครบ |
| **1 — ฐานข้อมูล & Theme** | Prisma models + migration, `fandayTheme.ts`, embed presets ทุก key พร้อม default (ตรงภาพอ้างอิง) | `db:generate` + `tsc` ผ่าน, ส่ง panel ทดสอบหน้าตาตรงภาพ |
| **2 — Panel & สมัคร/ออก/กติกา/บทบาท** | `/panel type:fanday`, ปุ่ม 4 ปุ่ม, อัปเดต panel live, Consent + Form flow, Waitlist | ผู้เล่นสมัคร/ออก/อ่านกติกาได้ครบ, ทนบอทรีสตาร์ท |
| **3 — ล็อกคู่ + Form Builder (Dashboard)** | Self-lock 2 ฝ่ายยืนยัน, Form Builder + validator | ล็อกคู่ครบ edge cases ข้อ 8.4 |
| **4 — Matching Engine + AI Type** | pure functions + unit tests, Gemini + fallback, Dry-run UI, Commit/Rollback, เปิดเผยคู่ + ห้องคู่ | Unit test ผ่าน (ดูข้อ 15), จับคู่ซ้ำ idempotent |
| **5 — มินิเกม** | Game Registry + 5 เกม + คลังคำถามแก้ไขได้ | resume หลังรีสตาร์ทได้ |
| **6 — จดหมาย** | Compose/Preview/Send/Inbox/Reply/Review queue/Auto-send | ส่งถึงแม้ DM ปิด |
| **7 — Embed Studio ของ Fanday** | หน้า `/fanday/embeds` แก้ได้ทุก Embed+ปุ่ม + Live Preview + ส่งทดสอบ | แก้แล้วบอทใช้ทันทีโดยไม่ต้องรีสตาร์ท |
| **8 — Resilience** | Job queue, Outbox, Auto-recovery, Maintenance/Pause, Webhook fallback, Runbook, Export | ซ้อมดับบอทตามข้อ 15.3 ผ่าน |
| **9 — Polish & QA** | Regression เดิม, a11y, ข้อความไทยเกลาแล้ว, เอกสารส่งมอบ | ผ่าน Checklist ข้อ 15 ทั้งหมด |

---

## 15. การทดสอบ & เกณฑ์การยอมรับ (Acceptance Criteria)

### 15.1 Unit/Integration
- Matching: โหมดเพศทุกแบบ, จำนวนคี่, เพศไม่สมดุล, Block list, ล็อกคู่, seed เดิมได้ผลเดิม, 0/1/2/7/50/300 ผู้เล่น
- Self-lock: ยืนยัน/ปฏิเสธ/หมดอายุ/ไขว้/ล็อกซ้ำ
- Embed renderer: ตัวแปรหาย, config เสีย → fallback, เกินลิมิต
- Letters: Draft/Preview/นิรนาม/ถูกกรอง/DM ปิด
- Idempotency: กดปุ่มซ้ำ 10 ครั้งพร้อมกัน → ผลเท่ากับกดครั้งเดียว

### 15.2 Checklist ฟีเจอร์ (ต้องติ๊กครบ)
- [ ] `/panel` มีตัวเลือกแฟนเดย์ และส่ง Panel ทันที หน้าตาตรงภาพอ้างอิง (brand = `୨ৎ . 753BC . ୨ৎ`)
- [ ] ปุ่ม เข้าร่วม / ออก / อ่านกติกา / บทบาทของฉัน ใช้งานได้ + แก้ป้ายได้จาก Dashboard
- [ ] ข้อความทุกอย่างที่บอทส่งเป็น Embed และแก้ได้จาก Dashboard (ไม่มี plain text ที่ผู้เล่นเห็น)
- [ ] สุ่มคู่ตามเพศ, ล็อกคู่เอง, AI Type + เหตุผล, มี Fallback เมื่อ AI ล่ม
- [ ] Form Builder ใช้งานได้ + Validator ตามลิมิต Discord
- [ ] มินิเกม ≥ 5 เกม เล่นกับคู่ตัวเอง resume ได้
- [ ] จดหมาย เขียน/พรีวิว/ส่ง/กล่องจดหมาย/ตอบกลับ
- [ ] กติกาครอบคลุม Edge Cases ข้อ 8.4 ทุกข้อ
- [ ] Pause/Maintenance + Webhook fallback + Runbook + Export
- [ ] ไม่มี regression ในคำสั่ง/ระบบเดิม, `tsc --noEmit` และ `next build` ผ่าน

### 15.3 ซ้อมวิกฤต (Chaos Drill) — ต้องทำและรายงานผล
1. Kill บอทกลางช่วงสมัคร → เปิดใหม่ → panel/ผู้เล่น/ล็อกคู่ครบ
2. Kill บอทตอนมี job ค้าง (หมดอายุล็อกคู่/เตือนจดหมาย) → catch-up ทำงานครั้งเดียว
3. Kill บอทกลางมินิเกม → resume ได้
4. ตัด Gemini key → จับคู่ยังสำเร็จด้วย fallback
5. ปิด DM ผู้เล่น → จดหมาย/เปิดเผยคู่ยังถึงผ่านทางสำรอง

---

## 16. ข้อห้ามและแนวปฏิบัติ

- ❌ ห้ามเปลี่ยน/ลบ Root Owner ID, ห้ามลดสิทธิ์ระบบเดิม
- ❌ ห้ามส่งข้อความ plain text ถึงผู้ใช้ (ยกเว้นที่ Discord บังคับ เช่น mention ใน `content` คู่กับ embed)
- ❌ ห้ามเขียน log ที่มีเนื้อหาจดหมาย/คำตอบฟอร์ม/เพศของผู้เล่น
- ❌ ห้ามใช้ `setTimeout` ยาวเป็น scheduler หลัก (ใช้ Job queue ใน DB)
- ❌ ห้ามเรียกใช้ Discord API ซ้ำถี่โดยไม่ผ่านคิว/debounce
- ✅ ภาษาไทยในข้อความต้องสุภาพ อบอุ่น เป็นกันเอง ไม่ตัดสินเพศ/รสนิยม ใช้ถ้อยคำครอบคลุม (inclusive)
- ✅ เพิ่มคำสั่ง/Embed/Permission ใหม่ต้องอัปเดต `help.ts`, `README.md`, `AI_SYSTEM_HANDOVER.md` ให้ตรงของจริง
- ✅ เมื่อเจอจุดที่ requirement กำกวม ให้เลือกค่าที่ "ปลอดภัยต่อผู้เล่นที่สุด" แล้วบันทึกใน `FANDAY_DECISIONS.md`

---

## 17. สิ่งที่ต้องส่งมอบ (Deliverables)

1. โค้ดครบตาม Phase 1–9 (bot + web + prisma)
2. `docs/FANDAY_DECISIONS.md` — การตัดสินใจและเหตุผล
3. `docs/FANDAY_RUNBOOK.md` — คู่มือแอดมิน/วิกฤต (ภาษาไทย)
4. `docs/FANDAY_ADMIN_GUIDE.md` — วิธีตั้งงานตั้งแต่ต้นจนจบ (พร้อมสกรีนช็อต/ขั้นตอน)
5. อัปเดต `AI_SYSTEM_HANDOVER.md` ส่วนใหม่ของ Fanday
6. รายงานสรุปการทดสอบ (ข้อ 15) + รายการ env ใหม่ที่ต้องตั้ง: `GEMINI_API_KEY`, `FANDAY_ENCRYPTION_KEY`, `FANDAY_FALLBACK_WEBHOOK_URL`, `FANDAY_DISCORD_TOKEN` (optional)

---

### 🚦 คำสั่งเริ่มต้นสำหรับ Gemini
> "อ่านไฟล์นี้และ `AI_SYSTEM_HANDOVER.md` ให้ครบ แล้วเริ่ม **Phase 0**: สำรวจโค้ดที่เกี่ยวข้อง, สรุปแผนและความเสี่ยง, เขียน `docs/FANDAY_DECISIONS.md` จากนั้นรอผู้ใช้ยืนยัน (หรือเดินต่อ Phase 1 หากไม่มีข้อสงสัยที่บล็อกงาน)"

