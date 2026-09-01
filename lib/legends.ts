export type LegendRarity = "common" | "rare" | "epic" | "legendary";
export type LegendRequirement =
  | "perfectDays"
  | "activeStreak"
  | "sportChallenges"
  | "activeDays"
  | "foodQuests"
  | "foodQuestStreak"
  | "totalTasks"
  | "totalPoints";

export type LegendDefinition = {
  slug: string;
  name: string;
  rarity: LegendRarity;
  traits: [string, string, string];
  condition: string;
  shortCondition: string;
  requirement: LegendRequirement;
  target: number;
  imagePath: string;
};

const legend = (
  slug: string,
  name: string,
  rarity: LegendRarity,
  traits: [string, string, string],
  condition: string,
  shortCondition: string,
  requirement: LegendRequirement,
  target: number
): LegendDefinition => ({
  slug,
  name,
  rarity,
  traits,
  condition,
  shortCondition,
  requirement,
  target,
  imagePath: `/legends/${slug}.png`,
});

export const LEGENDS: LegendDefinition[] = [
  legend("hare", "ЗАЄЦЬ", "common", ["ШВИДКІСТЬ", "СПРИТНІСТЬ", "РЕАКЦІЯ"], "Набрати 7 ідеальних днів. Дні не обов’язково мають бути поспіль.", "7 ідеальних днів", "perfectDays", 7),
  legend("roe-deer", "КОСУЛЯ", "common", ["ГРАЦІЯ", "ЛЕГКІСТЬ", "ГАРМОНІЯ"], "14 днів поспіль виконувати хоча б одне завдання щодня.", "14 активних днів поспіль", "activeStreak", 14),
  legend("otter", "ВИДРА", "common", ["ЕНЕРГІЯ", "РУХ", "РАДІСТЬ"], "Виконати 50 Sport Challenge.", "50 Sport Challenge", "sportChallenges", 50),
  legend("stork", "ЛЕЛЕКА", "common", ["РОДИНА", "ДІМ", "НАДІЯ"], "Набрати 30 активних днів. Дні не обов’язково мають бути поспіль.", "30 активних днів", "activeDays", 30),
  legend("wolf", "ВОВК", "rare", ["СИЛА", "ВІРНІСТЬ", "ЛІДЕРСТВО"], "30 днів поспіль виконувати хоча б одне завдання щодня.", "30 активних днів поспіль", "activeStreak", 30),
  legend("fox", "ЛИС", "rare", ["МУДРІСТЬ", "ХИТРІСТЬ", "ІНТУЇЦІЯ"], "Виконати 100 Food Quest.", "100 Food Quest", "foodQuests", 100),
  legend("horse", "КІНЬ", "rare", ["ВОЛЯ", "ШВИДКІСТЬ", "ВИТРИВАЛІСТЬ"], "Виконати 100 Sport Challenge.", "100 Sport Challenge", "sportChallenges", 100),
  legend("deer", "ОЛЕНЬ", "rare", ["ГАРМОНІЯ", "СПОКІЙ", "ВІДНОВЛЕННЯ"], "Набрати 30 ідеальних днів. Дні не обов’язково мають бути поспіль.", "30 ідеальних днів", "perfectDays", 30),
  legend("boar", "КАБАН", "rare", ["НАПОЛЕГЛИВІСТЬ", "СИЛА", "ЗАХИСТ"], "Набрати 60 активних днів. Дні не обов’язково мають бути поспіль.", "60 активних днів", "activeDays", 60),
  legend("lynx", "РИСЬ", "epic", ["СПРИТНІСТЬ", "УВАЖНІСТЬ", "ТОЧНІСТЬ"], "Набрати 60 ідеальних днів. Дні не обов’язково мають бути поспіль.", "60 ідеальних днів", "perfectDays", 60),
  legend("swan", "ЛЕБІДЬ", "epic", ["КРАСА", "ЧИСТОТА", "ВІРНІСТЬ"], "Виконати 30 доступних Food Quest поспіль без пропуску.", "30 Food Quest поспіль", "foodQuestStreak", 30),
  legend("beaver", "БОБЕР", "epic", ["ПРАЦЕЛЮБНІСТЬ", "ТВОРЧІСТЬ", "СТВОРЕННЯ"], "Виконати сумарно 500 унікальних завдань будь-якого типу.", "500 виконаних завдань", "totalTasks", 500),
  legend("bear", "ВЕДМІДЬ", "epic", ["СИЛА", "МІЦЬ", "НЕЗЛАМНІСТЬ"], "Виконати 250 Sport Challenge.", "250 Sport Challenge", "sportChallenges", 250),
  legend("falcon", "СОКІЛ", "legendary", ["СВОБОДА", "ВИСОТА", "ФОКУС"], "Досягти статусу «Світлоносний» — набрати 10 000 балів.", "10 000 балів", "totalPoints", 10000),
  legend("bison", "ЗУБР", "legendary", ["МОГУТНІСТЬ", "СТІЙКІСТЬ", "НЕЗЛАМНІСТЬ"], "Набрати 90 активних днів. Дні не обов’язково мають бути поспіль.", "90 активних днів", "activeDays", 90),
  legend("owl", "ФІЛІН", "legendary", ["МУДРІСТЬ", "ІНТУЇЦІЯ", "ДОСВІД"], "Набрати 180 активних днів. Дні не обов’язково мають бути поспіль.", "180 активних днів", "activeDays", 180),
];

export const LEGEND_BY_SLUG = new Map(LEGENDS.map((item) => [item.slug, item]));

export const RARITY_LABELS: Record<LegendRarity, string> = {
  common: "Звичайна",
  rare: "Рідкісна",
  epic: "Епічна",
  legendary: "Легендарна",
};
