# 💘 FANDAY SYSTEM — Architecture Decisions & Execution Plan (Phase 0)

> **เอกสารบันทึกการตัดสินใจทางสถาปัตยกรรม (Architecture Decision Record - ADR)**
> โปรเจกต์: **LynnBot — Fanday System (ระบบกิจกรรมแฟนเดย์ 753BC)**
> วันที่: 2026-10-31

---

## 1. ผลการสำรวจโค้ดเดิม (Codebase Exploration Summary)

จากการตรวจสอบ codebase ทั้ง 3 ส่วน (`apps/bot`, `apps/web`, `packages/database`):

1. **ระบบ Panel เดิม (`apps/bot/src/commands/panel.ts` & `panelService.ts`)**:
   - ปัจจุบันมี 6 panels (`attendance`, `leave`, `shop`, `ticket`, `admin-hub`, `moderation`)
   - แต่ละ panel ส่งกลับ `{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }`
   - มีการบันทึก target channel และ log channel ลง `prisma.setting`
   - **การต่อยอด**: เพิ่มตัวเลือก `fanday` ("🎀 กิจกรรมแฟนเดย์ (Fanday)") ใน `/panel` และสร้าง `buildFandayPanel()` ใน `apps/bot/src/services/panels/fandayPanelHandler.ts` เมื่อส่งแล้วจะบันทึก `panelChannelId` และ `panelMessageId` ลง `FandayEvent` ที่ active เพื่อรองรับการอัปเดตแบบ Live

2. **ระบบ Embed Presets เดิม (`apps/web/lib/embedPresets.ts` & `embedService.ts`)**:
   - `renderCustomEmbed(key, defaultEmbed, variables)` ดึง config จาก `Setting` ด้วย key `embed_config:${key}` และทำการ replace placeholders `{var}`
   - มี preset หมวดต่างๆ ครอบคลุม 1,000+ บรรทัด
   - **การต่อยอด**: เพิ่มหมวด `fanday` และนิยาม preset ทุกใบ (เริ่มต้นจาก `fanday_panel_main`, `fanday_rules_*`, `fanday_join_*`, `fanday_match_*`, `fanday_game_*`, `fanday_letter_*`) โดยกำหนด default embed ให้ตรงกับภาพต้นแบบเป๊ะๆ

3. **ระบบ Interaction Router (`apps/bot/src/events/interactionCreate.ts`)**:
   - แยกตาม `isButton()`, `isStringSelectMenu()`, `isModalSubmit()`
   - **การต่อยอด**: กำหนด prefix `fd_` สำหรับทุก Fanday interaction (เช่น `fd_join`, `fd_leave`, `fd_rules`, `fd_myrole`, `fd_lock:*`, `fd_game:*`, `fd_letter:*`) แล้ว route ไปยัง `fandayPanelHandler.ts` และ sub-handlers

4. **ฐานข้อมูล (`packages/database/prisma/schema.prisma`)**:
   - 29 models เดิม, enum `LogCategory`
   - **การต่อยอด**: เพิ่มค่า `FANDAY` ใน `LogCategory` และเพิ่มโมเดลสำหรับ Fanday 10 โมเดล (`FandayEvent`, `FandayForm`, `FandayPlayer`, `FandayPair`, `FandayGameSession`, `FandayLetter`, `FandayMatchLog`, `FandayBlock`, `FandayJob`, `FandayOutbox`)

5. **ระบบความปลอดภัยและ Root Owner (`apps/web/lib/utils.ts` & `packages/database/index.ts`)**:
   - `ROOT_OWNER_DISCORD_ID = "1078869442609561691"` ห้ามแก้ไข/ลดสิทธิ์เด็ดขาด
   - สิทธิ์ย่อยใหม่: `fanday.view`, `fanday.manage`, `fanday.moderate`

---

## 2. การตัดสินใจเชิงสถาปัตยกรรม (Architectural Decisions)

### 2.1 บอท "753 BC Activities"
- **การตัดสินใจ**: รวมเป็นโมดูลภายใน `apps/bot/src/features/fanday/` ไม่แยก repository ใหม่
- **การตั้งค่าชื่อ/แบรนด์**: ดึงจาก `prisma.setting` (`fanday_brand_name` เริ่มต้นคือ `753BC`)
- **Brand Divider**: ใช้ `୨ৎ . 753BC . ୨ৎ` ทุกที่ (ตัด "The Astral Realm x" ออกทั้งหมด)
- **Token แยก**: รองรับ `FANDAY_DISCORD_TOKEN` ใน `.env` หากมีจะรันเป็นกิจกรรมแยกได้ หรือหากไม่มีจะรันใน client หลักเดิม

### 2.2 โครงสร้าง Embed ตามภาพอ้างอิง
- **การตัดสินใจ**: สร้าง helper ใน `apps/bot/src/utils/fandayTheme.ts`
  - สีแถบเริ่มต้น: `#A0714F` (ปรับแต่งได้ใน Dashboard)
  - Heading: `## จำนวนผู้เล่นปัจจุบัน`
  - Inline code: `` `X คน (ต้องการขั้นต่ำ Y คน)` ``
  - Status heading: `### สถานะห้อง: ` `🟢 เปิดรับสมัครผู้เข้าร่วม`
  - Diff block แนะนำสีเขียว:
    ```diff
    + กดปุ่มด้านล่างเพื่อเข้าร่วม อ่านกติกา
    + หรือตรวจสอบบทบาทของตัวเองได้เลย
    ```
  - Divider: `୨ৎ . 753BC . ୨ৎ` ตามด้วยเส้นคลื่น `◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠◠`
  - รายชื่อล่าสุด: `📝 **รายชื่อผู้เข้าร่วมล่าสุด**` แสดง inline code ของ display name
  - ปุ่ม 4 ปุ่มรูปแบบ emoji คร่อม:
    1. `🎀 เข้าร่วมเกม 🎀` (Primary / `fd_join`)
    2. `🚪 ออกจากเกม 🚪` (Secondary / `fd_leave`)
    3. `📖 อ่านกติกา 📖` (Success / `fd_rules`)
    4. `🔎 บทบาทของฉัน 🔎` (Secondary / `fd_myrole`)

### 2.3 การจับคู่ (Matching Engine) & AI
- **การตัดสินใจ**:
  - สร้าง pure matching engine ใน `apps/bot/src/features/fanday/matching/`
  - มี **Hard Constraints**: Mutual gender preferences, no block list, no self-lock duplicates
  - **Soft Score (0-100)**: Time overlap + weighted question dimensions
  - **AI Type**: เรียก Gemini API เพื่อวิเคราะห์คำตอบสรุปเป็น Type (เช่น 8 Archetypes ที่เข้ากับคอมมูนิตี้) พร้อมคำอธิบายเหตุผลภาษาไทย
  - **Rule-based Fallback**: หาก Gemini API ไม่ตอบกลับภายใน 12 วินาที หรือไม่มี API key ระบบจะคำนวณ Type จาก Score Matrix โดยอัตโนมัติ เพื่อให้กิจกรรมดำเนินต่อไปได้ 100%

### 2.4 การทนทานต่อบอทดับ (Resilience & Failover)
- **การตัดสินใจ**:
  - ทุก State สำคัญ (การสมัคร, ล็อกคู่, คิวงาน, สถานะเกม, ร่างจดหมาย) บันทึกใน PostgreSQL
  - ใช้ `FandayJob` ใน DB เป็น Persistent Scheduler แทน in-memory setTimeout
  - มี `FandayOutbox` สำหรับจดหมายและแจ้งเตือนที่รอส่ง
  - ตอนบอทบูต (`ClientReady`): Reconcile Live Panels, Catch-up jobs, Re-sync ผู้เล่น
  - สร้าง Webhook Fallback สำหรับส่งข้อความฉุกเฉินผ่าน Dashboard แม้บอทจะออฟไลน์

---

## 3. แผนการดำเนินงานราย Phase (Execution Plan)

- **Phase 1: ฐานข้อมูล & Theme**
  - เพิ่มโมเดล Prisma และรัน `db:generate` + `db:push`
  - สร้าง `fandayTheme.ts` และลงทะเบียน Embed Presets ใน `embedPresets.ts`
- **Phase 2: Panel & ปุ่มพื้นฐาน**
  - เพิ่มตัวเลือก `/panel type:fanday`
  - จัดการปุ่ม `fd_join`, `fd_leave`, `fd_rules`, `fd_myrole`
  - ระบบ Consent, Gender Select, Form Filling Multi-step Modal
- **Phase 3: Self-lock & Form Builder Dashboard**
  - ฟังก์ชันล็อกคู่ 2 ฝ่ายยืนยัน + ป้องกัน edge cases
  - หน้า Dashboard `/fanday/forms`
- **Phase 4: Matching Engine & Pair Room**
  - Hungarian/Min-cost algorithm + Gemini integration + Dry-run UI
  - สร้าง Private Thread/Channel สำหรับคู่
- **Phase 5: มินิเกม (5 เกม)**
  - Couple Quiz, Two Truths & Lie, Would You Rather, Mystery Gift, Daily Mission
- **Phase 6: ระบบจดหมาย**
  - Compose, Preview, Send, Inbox, Anonymous option, Auto-send
- **Phase 7: Fanday Embed Studio ใน Web**
  - หน้า `/fanday/embeds` ปรับแก้ได้ทุก Embed และปุ่ม
- **Phase 8: Resilience & Job Queue**
  - Database-backed workers, Outbox, Maintenance toggle, Webhook broadcast
- **Phase 9: QA & Verification**
  - Unit tests, Chaos drill, Checklist verification, สรุปส่งมอบ

