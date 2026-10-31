import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { createFandayEmbed, FANDAY_COLORS } from "../../../utils/fandayTheme.js";

export interface GameDefinition {
  key: string;
  name: string;
  emoji: string;
  description: string;
  rounds: number;
}

export const FANDAY_GAMES: Record<string, GameDefinition> = {
  would_rather: {
    key: "would_rather",
    name: "Would You Rather • คุณจะเลือกอะไร?",
    emoji: "🎲",
    description: "เลือกตอบ 1 ใน 2 ตัวเลือก แล้วมาลุ้นว่าใจเราจะตรงกันกี่เปอร์เซ็นต์!",
    rounds: 3,
  },
  truth_lie: {
    key: "truth_lie",
    name: "Two Truths & A Lie • ทายใจเรื่องจริงหรือโกหก",
    emoji: "🎭",
    description: "จับผิดเรื่องโกหก 1 เรื่องจาก 3 ข้อความ ดูสิว่าคู่ของคุณจะจับไต๋ได้มั้ย!",
    rounds: 2,
  },
  quiz: {
    key: "quiz",
    name: "Couple Quiz • ควิซทายใจคู่แฟนเดย์",
    emoji: "🧠",
    description: "ตอบคำถามสไตล์และรสนิยม วัดคะแนนความเข้ากันแบบเรียลไทม์",
    rounds: 3,
  },
  mystery_gift: {
    key: "mystery_gift",
    name: "Mystery Gift • มอบของขวัญจำลองให้คู่",
    emoji: "🎁",
    description: "เลือกกล่องของขวัญ 1 ชิ้นพร้อมคำอวยพรสุดพิเศษส่งให้คู่ของคุณ",
    rounds: 1,
  },
  daily_mission: {
    key: "daily_mission",
    name: "Daily Mission • ภารกิจคู่รักประจำวัน",
    emoji: "🧩",
    description: "ทำภารกิจง่ายๆ ร่วมกัน เช่น แชร์เพลงโปรด หรือทายเมนูอาหารมื้อค่ำ",
    rounds: 1,
  },
};

/**
 * 🎮 1. Show Mini-Games Menu for a pair
 */
export async function showGameMenu(interaction: ButtonInteraction, pairId: string) {
  const pair = await prisma.fandayPair.findUnique({
    where: { id: pairId },
    include: { gameSessions: { where: { status: "COMPLETED" } } },
  });

  if (!pair) {
    await interaction.reply({ content: "❌ ไม่พบข้อมูลคู่แฟนเดย์นี้", ephemeral: true });
    return;
  }

  // Ensure only members of this pair can launch games
  if (interaction.user.id !== pair.playerAId && interaction.user.id !== pair.playerBId) {
    await interaction.reply({ content: "❌ เฉพาะคู่แฟนเดย์ในห้องนี้เท่านั้นที่เล่นได้ครับ", ephemeral: true });
    return;
  }

  const completedCount = pair.gameSessions.length;
  const totalScore = pair.gameSessions.reduce((acc, g) => acc + (g.score || 10), 0);

  const menuEmbed = createFandayEmbed({
    title: "🎮 คลังมินิเกมกระชับความสัมพันธ์ • Fanday Mini-Games",
    description:
      `ร่วมเล่นเกมกับคู่ของคุณเพื่อสะสม **Bond Score (คะแนนความสนิท)** และปลดล็อกระบบจดหมาย!\n\n` +
      `• **เกมที่เล่นสำเร็จแล้ว:** \`${completedCount} เกม\`\n` +
      `• **คะแนนความสนิทรวม:** ⭐ \`${totalScore} คะแนน\`\n\n` +
      `**เลือกเกมที่ต้องการเล่นด้านล่าง:**`,
    color: FANDAY_COLORS.primary,
  });

  const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`fd_game_select:${pairId}`)
      .setPlaceholder("🕹️ เลือกมินิเกมที่ต้องการเล่น")
      .addOptions(
        Object.values(FANDAY_GAMES).map((g) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(g.name)
            .setValue(g.key)
            .setDescription(g.description.slice(0, 50))
            .setEmoji(g.emoji)
        )
      )
  );

  await interaction.reply({ embeds: [menuEmbed], components: [select] });
}

/**
 * 🕹️ 2. Launch Selected Mini-Game
 */
export async function launchMiniGame(interaction: StringSelectMenuInteraction, pairId: string, gameKey: string) {
  const game = FANDAY_GAMES[gameKey];
  if (!game) {
    await interaction.reply({ content: "❌ ไม่พบมินิเกมที่เลือก", ephemeral: true });
    return;
  }

  // Create or load active game session
  const session = await prisma.fandayGameSession.create({
    data: {
      pairId,
      gameKey,
      state: { step: 1, answers: {} },
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  if (gameKey === "would_rather") {
    const gameEmbed = createFandayEmbed({
      title: "🎲 Would You Rather: คุณจะเลือกข้อไหน?",
      description:
        `**คำถามข้อที่ 1:**\n\n` +
        `🅰️ **เลือก A:** ไปเที่ยวภูเขา ดูหมอก สูดอากาศเย็นๆ 🌲\n` +
        `🅱️ **เลือก B:** ไปเที่ยวทะเล นั่งฟังเสียงคลื่นรับลม 🌊\n\n` +
        `-# ทั้งสองคนกดเลือกคำตอบของตัวเอง แล้วมาดูผลลัพธ์กัน!`,
      color: FANDAY_COLORS.theme,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`fd_game_answer:${session.id}:A`)
        .setLabel("เลือก A (ภูเขา 🌲)")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`fd_game_answer:${session.id}:B`)
        .setLabel("เลือก B (ทะเล 🌊)")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [gameEmbed], components: [row] });
    return;
  }

  if (gameKey === "mystery_gift") {
    const giftEmbed = createFandayEmbed({
      title: "🎁 Mystery Gift: ส่งของขวัญเสมือนจริงให้คู่",
      description:
        `เลือกของขวัญที่คุณอยากมอบให้คู่ของคุณในวันนี้:\n\n` +
        `🧸 **ตุ๊กตาหมีอุ่นใจ** • แทนความห่วงใย\n` +
        `🍰 **เค้กช็อกโกแลต** • เติมความหวานให้วันเหนื่อยๆ\n` +
        `☕ **กาแฟร้อนยามเช้า** • เริ่มต้นวันดีๆ ไปด้วยกัน\n` +
        `🎮 **สกินเกมสุดแรร์** • พร้อมเล่นด้วยกันทุกแมตช์`,
      color: FANDAY_COLORS.pink,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`fd_game_answer:${session.id}:bear`)
        .setLabel("ตุ๊กตาหมี 🧸")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`fd_game_answer:${session.id}:cake`)
        .setLabel("เค้ก 🍰")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`fd_game_answer:${session.id}:coffee`)
        .setLabel("กาแฟ ☕")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`fd_game_answer:${session.id}:skin`)
        .setLabel("สกินเกม 🎮")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [giftEmbed], components: [row] });
    return;
  }

  // Generic fallback game launcher
  const defaultEmbed = createFandayEmbed({
    title: `${game.emoji} ${game.name}`,
    description: `${game.description}\n\nกดปุ่มด้านล่างเพื่อยืนยันการทำภารกิจร่วมกัน!`,
    color: FANDAY_COLORS.success,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`fd_game_answer:${session.id}:complete`)
      .setLabel("ทำภารกิจสำเร็จแล้ว! ✨")
      .setStyle(ButtonStyle.Success)
  );

  await interaction.reply({ embeds: [defaultEmbed], components: [row] });
}

/**
 * 🎯 3. Handle Game Action / Answer
 */
export async function handleGameAnswer(interaction: ButtonInteraction, sessionId: string, answer: string) {
  try {
    const session = await prisma.fandayGameSession.findUnique({
      where: { id: sessionId },
      include: { pair: true },
    });

    if (!session) {
      await interaction.reply({ content: "❌ เกมนี้หมดอายุหรือสิ้นสุดไปแล้วครับ", ephemeral: true });
      return;
    }

    const state = (session.state as any) || {};
    state.answers = state.answers || {};
    state.answers[interaction.user.id] = answer;

    const hasA = state.answers[session.pair.playerAId];
    const hasB = state.answers[session.pair.playerBId];

    // If both players answered or single completion
    if ((hasA && hasB) || answer === "complete") {
      await prisma.fandayGameSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          score: 20,
          endedAt: new Date(),
          state,
        },
      });

      const isMatch = hasA && hasB && hasA === hasB;
      const resultEmbed = createFandayEmbed({
        title: isMatch ? "🎉 ใจตรงกัน 100%! (Perfect Match)" : "✨ ทำกิจกรรมสำเร็จร่วมกัน!",
        description:
          `• **คำตอบ <@${session.pair.playerAId}>:** \`${hasA || answer}\`\n` +
          `• **คำตอบ <@${session.pair.playerBId}>:** \`${hasB || answer}\`\n\n` +
          `${isMatch ? "💖 ว้าว! คุณทั้งสองคนเลือกคำตอบเหมือนกันเป๊ะเลยครับ!" : "🌟 แม้จะชอบไม่เหมือนกัน แต่ความต่างก็ทำให้ได้รู้จักกันมากขึ้น!"}\n\n` +
          `+ ได้รับ **20 Bond Score** เข้าสู่ประวัติคู่ของคุณเรียบร้อยแล้ว!`,
        color: FANDAY_COLORS.success,
      });

      await interaction.update({ embeds: [resultEmbed], components: [] });
    } else {
      await prisma.fandayGameSession.update({
        where: { id: sessionId },
        data: { state },
      });

      await interaction.reply({
        content: `✅ บันทึกคำตอบของคุณ (\`${answer}\`) เรียบร้อยแล้ว! รออีกฝ่ายกดเลือกคำตอบครับ...`,
        ephemeral: true,
      });
    }
  } catch (err: any) {
    console.error("Error in handleGameAnswer:", err);
  }
}

