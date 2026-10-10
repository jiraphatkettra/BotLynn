---
name: humanizer
description: >-
  Provides guidelines and transformation rules to refine, humanize, and polish Thai and English copy
  for LynnBot (Discord Bot embeds, slash commands, error alerts) and Web Dashboard UI components.
  Activate when writing or reviewing user-facing texts, system alerts, button labels, and bot responses.
---

# LynnBot Humanizer & Copywriting Standard

This skill defines the voice, tone, and linguistic craftsmanship for **LynnBot** (Discord Bot & Web Dashboard).
It transforms rigid, robotic, or machine-translated text into warm, elegant, clear, and human-centered Thai copy.

---

## 🎭 Persona: "Lynn" (รินน์)

- **Role**: ผู้ช่วยส่วนตัวและเลขาผู้ดูแลระบบประจำเซิร์ฟเวอร์ (Intelligent Server Assistant & Operations Concierge)
- **Personality**:
  - **สุภาพและจริงใจ (Polite & Genuine)**: ลงท้ายประโยคด้วย "ค่ะ / นะคะ" อย่างพอดี ไม่อึดอัด ไม่ทางการจนเหมือนหนังสือราชการ
  - **เอาใจใส่และให้กำลังใจ (Encouraging & Empathetic)**: เข้าใจผู้ใช้งาน โดยเฉพาะช่วงตอกบัตรเข้า-ออกงาน หรือเมื่อเกิดปัญหา
  - **ชัดเจนและพร้อมช่วยเหลือ (Clear & Solution-Oriented)**: ทุกข้อความปฏิเสธหรือ Error ต้องบอก "วิธีแก้ปัญหา" หรือทางเลือกถัดไปเสมอ ไม่ทิ้งให้ผู้ใช้เคว้ง
  - **เรียบหรูสไตล์ Minimalist Dark**: ไม่ใส่อีโมจิรกเกินไป ใช้สัญลักษณ์เน้นจุดสำคัญอย่างมีศิลปะ (`✨`, `⏱️`, `💡`, `💳`, `🛡️`)

---

## 💬 Core Copywriting Principles

### 1. ลบความห้วนและคำสั่งแข็งทื่อ (Remove Robotic Tone)
- ❌ *เดิม*: "ไม่พบข้อมูลผู้ใช้ กรุณาตอกบัตรเข้างานก่อน (`/clockin`)"
- ✅ *ใหม่*: "🔍 ไม่พบประวัติผู้ใช้ในระบบนะคะ หากเพิ่งเริ่มปฏิบัติงาน สามารถพิมพ์คำสั่ง `/clockin` เพื่อเปิดกะได้เลยค่ะ"

### 2. เปลี่ยนข้อผิดพลาดให้เป็นคำแนะนำเชิงบวก (Helpful Errors)
- ❌ *เดิม*: "ยศหมดแล้ว ยศ "VIP" ไม่มีจำนวนคงเหลือในระบบ"
- ✅ *ใหม่*: "📦 ยศ **VIP** ในคลังถูกจับจองหมดชั่วคราวแล้วค่ะ รบกวนรอแอดมินเติมสต็อก หรือเลือกดูยศอื่น ๆ ใน `/shop` ได้เลยนะคะ"

### 3. ตอกบัตรและเวลาทำงาน ต้องให้กำลังใจ (Attendance Warmth)
- ❌ *เดิม*: "ตอกบัตรเข้างานอยู่แล้ว เข้างานเมื่อ 10 นาทีที่แล้ว"
- ✅ *ใหม่*: "⚠️ คุณอยู่ในช่วงปฏิบัติหน้าที่อยู่แล้วนะคะ (เริ่มงานเมื่อ <t:timestamp:R>)\n> 💡 หากต้องการปิดกะ สามารถใช้คำสั่ง `/clockout` เพื่อสรุปเวลาทำงานได้เลยค่ะ"

- ❌ *เดิม*: "บันทึกเวลาออกงานเรียบร้อย ระยะเวลาปฏิบัติงานรวม: 4 ชม. 30 นาที"
- ✅ *ใหม่*: "🎉 บันทึกเวลาออกงานเรียบร้อยแล้วค่ะ ขอบคุณสำหรับความทุ่มเทในวันนี้นะคะ! พักผ่อนให้เต็มที่น้า ✨"

### 4. กฎการจัดวาง Embed ใน Discord
- **Title**: กระชับ ใช้ไอคอนนำหน้า 1 ตัว
- **Description**: มีคำเกริ่นนำ + รายละเอียดแบบ bullet points (`•`) + Quote block (`> 💡`) สำหรับคำแนะนำพิเศษ
- **Footer**: ระบุชื่อระบบอย่างเป็นระเบียบ เช่น `Lynn Operations • Attendance System`

---

## 🖥️ Web Dashboard Guidelines

1. **Modal & Alerts**: หลีกเลี่ยงคำว่า "เกิดข้อผิดพลาด" โดด ๆ ให้ระบุสาเหตุและวิธีดำเนินการ
2. **Empty States**: เมื่อยังไม่มีข้อมูล อย่าปล่อยว่างหรือเขียนแค่ "ไม่มีข้อมูล" แต่ให้เขียนชวนสร้างหรือบอกวิธีเริ่มต้น
3. **Action Buttons**: ใช้คำกริยาที่เห็นภาพชัดเจน เช่น "ยืนยันและหักยอดเงิน", "ส่งคำขอตรวจสอบใหม่" แทน "ตกลง" หรือ "ส่ง"
