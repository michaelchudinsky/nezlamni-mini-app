export type LegendRarity = "common" | "rare" | "epic" | "legendary";
export type LegendRequirement =
  | "perfectDays"
  | "activeStreak"
  | "sportChallenges"
  | "activeDays"
  | "waterCompleteDays"
  | "sleepCompleteDays"
  | "foodCompleteDays"
  | "doubleBonusDays"
  | "foodQuests"
  | "totalTasks"
  | "totalPoints"
  | "unlockedLegends";

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
  legend("otter", "ВИДРА", "common", ["ЕНЕРГІЯ", "РУХ", "РАДІСТЬ"], "Повністю виконати денну норму води у 20 різних днях.", "20 днів із нормою води", "waterCompleteDays", 20),
  legend("stork", "ЛЕЛЕКА", "common", ["РОДИНА", "ДІМ", "НАДІЯ"], "У 7 різних календарних днях виконати хоча б одне завдання. Дні не обов’язково мають бути поспіль.", "7 активних днів", "activeDays", 7),
  legend("wolf", "ВОВК", "rare", ["СИЛА", "ВІРНІСТЬ", "ЛІДЕРСТВО"], "30 днів поспіль виконувати хоча б одне завдання щодня.", "30 активних днів поспіль", "activeStreak", 30),
  legend("fox", "ЛИС", "rare", ["МУДРІСТЬ", "ХИТРІСТЬ", "ІНТУЇЦІЯ"], "Виконати 30 Food Quest.", "30 Food Quest", "foodQuests", 30),
  legend("horse", "КІНЬ", "rare", ["ВОЛЯ", "ШВИДКІСТЬ", "ВИТРИВАЛІСТЬ"], "Виконати 50 Sport Challenge.", "50 Sport Challenge", "sportChallenges", 50),
  legend("deer", "ОЛЕНЬ", "rare", ["ГАРМОНІЯ", "СПОКІЙ", "ВІДНОВЛЕННЯ"], "Повністю виконати напрямок «Сон» у 30 різних днях.", "30 повністю виконаних ночей", "sleepCompleteDays", 30),
  legend("boar", "КАБАН", "rare", ["НАПОЛЕГЛИВІСТЬ", "СИЛА", "ЗАХИСТ"], "Виконати загалом 250 унікальних завдань будь-якого типу.", "250 виконаних завдань", "totalTasks", 250),
  legend("lynx", "РИСЬ", "epic", ["СПРИТНІСТЬ", "УВАЖНІСТЬ", "ТОЧНІСТЬ"], "В один день виконати Food Quest і Sport Challenge. Повторити це 20 разів.", "20 подвійних викликів", "doubleBonusDays", 20),
  legend("swan", "ЛЕБІДЬ", "epic", ["КРАСА", "ЧИСТОТА", "ВІРНІСТЬ"], "Повністю виконати всі основні завдання харчування у 30 різних днях.", "30 чистих днів харчування", "foodCompleteDays", 30),
  legend("beaver", "БОБЕР", "epic", ["ПРАЦЕЛЮБНІСТЬ", "ТВОРЧІСТЬ", "СТВОРЕННЯ"], "Виконати сумарно 500 унікальних завдань будь-якого типу.", "500 виконаних завдань", "totalTasks", 500),
  legend("bear", "ВЕДМІДЬ", "epic", ["СИЛА", "МІЦЬ", "НЕЗЛАМНІСТЬ"], "Виконати 100 Sport Challenge.", "100 Sport Challenge", "sportChallenges", 100),
  legend("falcon", "СОКІЛ", "legendary", ["СВОБОДА", "ВИСОТА", "ФОКУС"], "Досягти статусу «Світлоносний» — набрати 10 000 балів.", "10 000 балів", "totalPoints", 10000),
  legend("bison", "ЗУБР", "legendary", ["МОГУТНІСТЬ", "СТІЙКІСТЬ", "НЕЗЛАМНІСТЬ"], "Набрати 90 активних днів. Дні не обов’язково мають бути поспіль.", "90 активних днів", "activeDays", 90),
  legend("owl", "ФІЛІН", "legendary", ["МУДРІСТЬ", "ІНТУЇЦІЯ", "ДОСВІД"], "Відкрити 12 інших Легенд NEZLAMNI.", "Відкрити 12 інших Легенд", "unlockedLegends", 12),
];

export const LEGEND_BY_SLUG = new Map(LEGENDS.map((item) => [item.slug, item]));

export const RARITY_LABELS: Record<LegendRarity, string> = {
  common: "Звичайна",
  rare: "Рідкісна",
  epic: "Епічна",
  legendary: "Легендарна",
};
