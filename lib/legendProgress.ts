import { LEGENDS, type LegendRequirement } from "./legends.ts";

export type LegendLog = { task_code: string; event_day: string; points: number | null };
export type LegendProgress = {
  slug: string;
  current: number;
  target: number;
  unlocked: boolean;
  achievedAt: string | null;
};

const WATER = new Set(["water_wakeup", "water_breakfast", "water_lunch", "water_dinner", "water_daily_norm"]);
const FOOD = new Set(["food_protein_armor", "food_no_snacks", "food_three_meals", "food_dinner_before_20"]);
const ACTIVITY = new Set(["activity_walk_90_pro", "activity_workout_20"]);
const NIGHT = new Set(["night_sleep_7", "night_no_food_after_20"]);
const isFoodQuest = (code: string) => /^bonus_day_\d+_daily$/.test(code);
const isSportChallenge = (code: string) => /^bonus_day_\d+_challenge$/.test(code);

function consecutiveStats(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  let max = 0;
  let current = 0;
  let previous = "";
  let maxAchievedAt: string | null = null;
  for (const date of sorted) {
    const expected = previous ? new Date(`${previous}T12:00:00Z`) : null;
    expected?.setUTCDate(expected.getUTCDate() + 1);
    current = expected?.toISOString().slice(0, 10) === date ? current + 1 : 1;
    if (current > max) {
      max = current;
      maxAchievedAt = date;
    }
    previous = date;
  }
  return { current, max, maxAchievedAt };
}

export function calculateLegendProgress(logs: LegendLog[], totalPoints: number): LegendProgress[] {
  const sorted = [...logs].filter((log) => Boolean(log.event_day)).sort((a, b) => a.event_day.localeCompare(b.event_day));
  const byDay = new Map<string, Set<string>>();
  for (const log of sorted) {
    const codes = byDay.get(log.event_day) || new Set<string>();
    codes.add(log.task_code);
    byDay.set(log.event_day, codes);
  }
  const activeDates = [...byDay.keys()].sort();
  const perfectDates = activeDates.filter((date) => {
    const codes = byDay.get(date)!;
    return [...WATER, ...FOOD, ...ACTIVITY, ...NIGHT].every((code) => codes.has(code));
  });
  const foodDates = sorted.filter((log) => isFoodQuest(log.task_code)).map((log) => log.event_day);
  const sportDates = sorted.filter((log) => isSportChallenge(log.task_code)).map((log) => log.event_day);
  const activeStreak = consecutiveStats(activeDates);
  const foodStreak = consecutiveStats(foodDates);
  const values: Record<LegendRequirement, { current: number; earned: number; dates: string[]; achievedAt?: string | null }> = {
    perfectDays: { current: perfectDates.length, earned: perfectDates.length, dates: perfectDates },
    activeStreak: { current: activeStreak.current, earned: activeStreak.max, dates: [], achievedAt: activeStreak.maxAchievedAt },
    sportChallenges: { current: sportDates.length, earned: sportDates.length, dates: sportDates },
    activeDays: { current: activeDates.length, earned: activeDates.length, dates: activeDates },
    foodQuests: { current: foodDates.length, earned: foodDates.length, dates: foodDates },
    foodQuestStreak: { current: foodStreak.current, earned: foodStreak.max, dates: [], achievedAt: foodStreak.maxAchievedAt },
    totalTasks: { current: sorted.length, earned: sorted.length, dates: sorted.map((log) => log.event_day) },
    totalPoints: { current: totalPoints, earned: totalPoints, dates: sorted.map((log) => log.event_day) },
  };
  return LEGENDS.map((item) => {
    const metric = values[item.requirement];
    const unlocked = metric.earned >= item.target;
    const achievedAt = unlocked
      ? metric.achievedAt || metric.dates[Math.min(item.target - 1, metric.dates.length - 1)] || new Date().toISOString().slice(0, 10)
      : null;
    return { slug: item.slug, current: Math.min(metric.current, item.target), target: item.target, unlocked, achievedAt };
  });
}
