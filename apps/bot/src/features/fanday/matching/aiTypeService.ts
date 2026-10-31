/**
 * 🧠 Fanday AI Personality Type & Matching Service
 * Supports Google Gemini API with seamless rule-based fallback.
 */

export interface PersonalityType {
  code: string;
  name: string;
  emoji: string;
  description: string;
}

export const FANDAY_ARCHETYPES: Record<string, PersonalityType> = {
  WARM_LISTENER: {
    code: "WARM_LISTENER",
    name: "ผู้รับฟังที่อบอุ่น",
    emoji: "☕",
    description: "ใจเย็น รับฟังเก่ง ให้ความสบายใจและเป็นเซฟโซนที่ดีกับคนรอบข้างเสมอ",
  },
  ADVENTUROUS_GAMER: {
    code: "ADVENTUROUS_GAMER",
    name: "เกมเมอร์สายลุย",
    emoji: "🎮",
    description: "พลังล้นเหลือ ชอบความท้าทาย สนุกกับการแข่งขันและพร้อมลุยไปด้วยกัน",
  },
  CHILL_COMPANION: {
    code: "CHILL_COMPANION",
    name: "เพื่อนร่วมทางสายชิลล์",
    emoji: "🍃",
    description: "คุยสบายๆ ไม่เร่งรีบ ไม่กดดัน อยู่ด้วยแล้วรู้สึกผ่อนคลายและเป็นธรรมชาติ",
  },
  WITTY_COMEDIAN: {
    code: "WITTY_COMEDIAN",
    name: "คนคุยสายฮาอารมณ์ดี",
    emoji: "🎭",
    description: "ร่าเริง มุกเยอะ ชวนหัวเราะและสร้างรอยยิ้มให้กับคู่สนทนาได้ทุกสถานการณ์",
  },
  DEEP_THINKER: {
    code: "DEEP_THINKER",
    name: "นักคิดลึกซึ้งเปิดใจ",
    emoji: "🌌",
    description: "ชอบคุยเรื่องน่าสนใจ มีมุมมองเปิดกว้าง จริงใจ และชอบบทสนทนาที่มีคุณค่า",
  },
  CARING_HEALER: {
    code: "CARING_HEALER",
    name: "สายซัพพอร์ตใจดี",
    emoji: "🌸",
    description: "ช่างสังเกต เอาใจใส่ คอยให้กำลังใจและดูแลความรู้สึกของอีกฝ่ายอย่างอ่อนโยน",
  },
  ENERGETIC_SPARK: {
    code: "ENERGETIC_SPARK",
    name: "พลังบวกจุดประกาย",
    emoji: "⚡",
    description: "สดใส มีชีวิตชีวา มองโลกในแง่บวก นำพาความสุขและพลังงานดีๆ มาให้เสมอ",
  },
  MYSTERIOUS_CAT: {
    code: "MYSTERIOUS_CAT",
    name: "แมวน้อยโลกส่วนตัว",
    emoji: "🐾",
    description: "ภายนอกอาจดูนิ่งๆ ลึกลับ แต่เมื่อสนิทแล้วจะน่ารัก อบอุ่น และใส่ใจเป็นพิเศษ",
  },
};

/**
 * Rule-based heuristic to assign an archetype when Gemini API is offline
 */
export function determineRuleBasedArchetype(answers: any): PersonalityType {
  const text = JSON.stringify(answers || {}).toLowerCase();

  if (text.includes("ฟัง") || text.includes("ใจเย็น") || text.includes("เงียบ")) {
    return FANDAY_ARCHETYPES.WARM_LISTENER;
  }
  if (text.includes("เกม") || text.includes("fps") || text.includes("moba") || text.includes("แข่ง")) {
    return FANDAY_ARCHETYPES.ADVENTUROUS_GAMER;
  }
  if (text.includes("ตลก") || text.includes("ฮา") || text.includes("มุก") || text.includes("กวน")) {
    return FANDAY_ARCHETYPES.WITTY_COMEDIAN;
  }
  if (text.includes("ชิล") || text.includes("เพลง") || text.includes("หนัง") || text.includes("สบาย")) {
    return FANDAY_ARCHETYPES.CHILL_COMPANION;
  }
  if (text.includes("ซัพ") || text.includes("ดูแล") || text.includes("ห่วง") || text.includes("ใจดี")) {
    return FANDAY_ARCHETYPES.CARING_HEALER;
  }
  if (text.includes("ปรึกษา") || text.includes("คิด") || text.includes("จริงจัง")) {
    return FANDAY_ARCHETYPES.DEEP_THINKER;
  }

  return FANDAY_ARCHETYPES.CHILL_COMPANION;
}

/**
 * Analyzes player profile and assigns Personality Type
 */
export async function analyzePlayerType(answers: any): Promise<{ typeCode: string; typeSummary: string }> {
  const fallback = determineRuleBasedArchetype(answers);
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return {
      typeCode: `${fallback.name} ${fallback.emoji}`,
      typeSummary: fallback.description,
    };
  }

  // Gemini API with 8s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const prompt = `คุณคือผู้เชี่ยวชาญการวิเคราะห์บุคลิกภาพในคอมมูนิตี้กิจกรรมแฟนเดย์ ให้วิเคราะห์คำตอบต่อไปนี้และเลือก 1 Archetype จากรายการ:
- WARM_LISTENER (ผู้รับฟังที่อบอุ่น ☕)
- ADVENTUROUS_GAMER (เกมเมอร์สายลุย 🎮)
- CHILL_COMPANION (เพื่อนร่วมทางสายชิลล์ 🍃)
- WITTY_COMEDIAN (คนคุยสายฮาอารมณ์ดี 🎭)
- DEEP_THINKER (นักคิดลึกซึ้งเปิดใจ 🌌)
- CARING_HEALER (สายซัพพอร์ตใจดี 🌸)
- ENERGETIC_SPARK (พลังบวกจุดประกาย ⚡)
- MYSTERIOUS_CAT (แมวน้อยโลกส่วนตัว 🐾)

คำตอบผู้เล่น: ${JSON.stringify(answers)}

ตอบกลับเป็น JSON เท่านั้น:
{"typeKey": "CODE", "summary": "คำอธิบายบุคลิกภาพน่ารักๆ 1 ประโยคภาษาไทย"}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: any = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    const matched = FANDAY_ARCHETYPES[parsed.typeKey] || fallback;
    return {
      typeCode: `${matched.name} ${matched.emoji}`,
      typeSummary: parsed.summary || matched.description,
    };
  } catch (err) {
    console.warn("Gemini evaluation timed out or failed, using rule-based fallback:", err);
    return {
      typeCode: `${fallback.name} ${fallback.emoji}`,
      typeSummary: fallback.description,
    };
  }
}

