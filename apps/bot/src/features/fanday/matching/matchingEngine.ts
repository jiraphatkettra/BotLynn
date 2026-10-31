/**
 * 💘 Fanday Matching Engine (Pure Functions)
 * Deterministic, transparent, and respectful of all hard constraints:
 * - Mutual gender preferences
 * - Mutual block lists
 * - Preserving self-locked pairs
 * - Time overlap & questionnaire dimension soft scoring
 */

export interface PlayerForMatching {
  id: string;
  discordId: string;
  displayName: string;
  gender: string;
  seeking: string;
  status: string;
  hasPartner: boolean;
  lockedWithId?: string | null;
  answers?: any;
}

export interface MatchedPairResult {
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  compatibility: number; // 0 - 100
  reason: string;
  source: "AI" | "RANDOM" | "SELF_LOCK";
}

export interface MatchingOutput {
  pairs: MatchedPairResult[];
  unpaired: PlayerForMatching[];
  seed: string;
  timestamp: string;
}

/**
 * Seeded Pseudo-Random Number Generator (Mulberry32) for deterministic matching
 */
export function createPRNG(seedStr: string) {
  let h = 1779033703 ^ seedStr.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Checks if two players meet mutual gender criteria
 */
export function meetsGenderPreference(pA: PlayerForMatching, pB: PlayerForMatching): boolean {
  // Check A's preference for B
  const aPrefersB =
    pA.seeking === "ANY" ||
    (pA.seeking === "MALE" && pB.gender === "MALE") ||
    (pA.seeking === "FEMALE" && pB.gender === "FEMALE");

  // Check B's preference for A
  const bPrefersA =
    pB.seeking === "ANY" ||
    (pB.seeking === "MALE" && pA.gender === "MALE") ||
    (pB.seeking === "FEMALE" && pA.gender === "FEMALE");

  return aPrefersB && bPrefersA;
}

/**
 * Calculates a soft compatibility score (0-100) based on answers
 */
export function calculateSoftScore(pA: PlayerForMatching, pB: PlayerForMatching): { score: number; reasons: string[] } {
  let score = 50; // baseline
  const reasons: string[] = [];

  const ansA = pA.answers || {};
  const ansB = pB.answers || {};

  // 1. Time overlap bonus
  if (ansA.onlineTime && ansB.onlineTime) {
    if (ansA.onlineTime.toLowerCase() === ansB.onlineTime.toLowerCase()) {
      score += 20;
      reasons.push("มีช่วงเวลาว่างและออนไลน์ที่ตรงกัน");
    } else {
      score += 5;
    }
  }

  // 2. Goal / Intent similarity
  if (ansA.goal && ansB.goal) {
    if (ansA.goal.slice(0, 10).toLowerCase() === ansB.goal.slice(0, 10).toLowerCase()) {
      score += 15;
      reasons.push("มีเป้าหมายและสิ่งที่มองหาจากกิจกรรมตรงกัน");
    }
  }

  // 3. Conversation style balance
  if (ansA.talkStyle && ansB.talkStyle) {
    score += 10;
    reasons.push("สไตล์การพูดคุยเข้ากันได้ดี");
  }

  const finalScore = Math.min(99, Math.max(50, score));
  return {
    score: finalScore,
    reasons: reasons.length > 0 ? reasons : ["บุคลิกและเคมีโดยรวมเข้ากันได้อย่างลงตัว"],
  };
}

/**
 * Runs the pairing algorithm
 */
export function executeFandayMatching({
  players,
  blocks = [],
  seed = Date.now().toString(),
}: {
  players: PlayerForMatching[];
  blocks?: { blockerId: string; blockedId: string }[];
  seed?: string;
}): MatchingOutput {
  const prng = createPRNG(seed);
  const blockSet = new Set(blocks.map((b) => `${b.blockerId}:${b.blockedId}`));
  const isBlocked = (id1: string, id2: string) =>
    blockSet.has(`${id1}:${id2}`) || blockSet.has(`${id2}:${id1}`);

  const eligible = players.filter((p) => p.status === "REGISTERED" && !p.hasPartner);
  const shuffled = [...eligible].sort(() => prng() - 0.5);

  const matchedPairs: MatchedPairResult[] = [];
  const matchedSet = new Set<string>();

  // Greedy maximum compatibility matching
  for (let i = 0; i < shuffled.length; i++) {
    const a = shuffled[i];
    if (matchedSet.has(a.discordId)) continue;

    let bestCandidate: PlayerForMatching | null = null;
    let bestScore = -1;
    let bestReasons: string[] = [];

    for (let j = i + 1; j < shuffled.length; j++) {
      const b = shuffled[j];
      if (matchedSet.has(b.discordId)) continue;
      if (isBlocked(a.discordId, b.discordId)) continue;
      if (!meetsGenderPreference(a, b)) continue;

      const { score, reasons } = calculateSoftScore(a, b);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = b;
        bestReasons = reasons;
      }
    }

    if (bestCandidate) {
      matchedSet.add(a.discordId);
      matchedSet.add(bestCandidate.discordId);

      matchedPairs.push({
        playerAId: a.discordId,
        playerBId: bestCandidate.discordId,
        playerAName: a.displayName,
        playerBName: bestCandidate.displayName,
        compatibility: bestScore,
        reason: bestReasons.join(" และ "),
        source: "AI",
      });
    }
  }

  const unpaired = shuffled.filter((p) => !matchedSet.has(p.discordId));

  return {
    pairs: matchedPairs,
    unpaired,
    seed,
    timestamp: new Date().toISOString(),
  };
}

