import assert from "node:assert/strict";
import test from "node:test";
import { calculateLegendProgress, type LegendLog } from "./legendProgress.ts";

const baseCodes = ["water_wakeup", "water_breakfast", "water_lunch", "water_dinner", "water_daily_norm", "food_protein_armor", "food_no_snacks", "food_three_meals", "food_dinner_before_20", "activity_walk_90_pro", "activity_workout_20", "night_sleep_7", "night_no_food_after_20"];
const waterCodes = ["water_wakeup", "water_breakfast", "water_lunch", "water_dinner", "water_daily_norm"];
const day = (index: number) => new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10);
const logsFor = (days: number, codes: string[]) => Array.from({ length: days }, (_, index) => codes.map((task_code) => ({ task_code, event_day: day(index), points: 1 }))).flat();
const result = (logs: LegendLog[], points = 0) => new Map(calculateLegendProgress(logs, points).map((item) => [item.slug, item]));

test("new user starts with 0/16", () => assert.equal([...result([]).values()].filter((item) => item.unlocked).length, 0));
test("7 perfect days unlock hare and bonus tasks are irrelevant", () => assert.equal(result(logsFor(7, [...baseCodes, "bonus_day_1_daily"])).get("hare")?.unlocked, true));
test("7 different active days unlock stork, not wolf", () => {
  const logs = Array.from({ length: 7 }, (_, index) => ({ task_code: "water_wakeup", event_day: day(index * 2), points: 1 }));
  assert.equal(result(logs).get("stork")?.unlocked, true);
  assert.equal(result(logs).get("wolf")?.unlocked, false);
});
test("several tasks on one day count as only one active day for stork", () => {
  assert.equal(result(logsFor(1, baseCodes)).get("stork")?.current, 1);
});
test("30 consecutive active days unlock wolf", () => assert.equal(result(logsFor(30, ["water_wakeup"])).get("wolf")?.unlocked, true));
test("20 complete water days unlock otter", () => assert.equal(result(logsFor(20, waterCodes)).get("otter")?.unlocked, true));
test("30 Food Quest unlock fox", () => assert.equal(result(logsFor(30, ["bonus_day_1_daily"])).get("fox")?.unlocked, true));
test("50 Sport Challenge unlock horse", () => assert.equal(result(logsFor(50, ["bonus_day_1_challenge"])).get("horse")?.unlocked, true));
test("30 complete sleep days unlock deer", () => assert.equal(result(logsFor(30, ["night_sleep_7", "night_no_food_after_20"])).get("deer")?.unlocked, true));
test("20 days with both bonus types unlock lynx", () => assert.equal(result(logsFor(20, ["bonus_day_1_daily", "bonus_day_1_challenge"])).get("lynx")?.unlocked, true));
test("30 complete food days unlock swan", () => assert.equal(result(logsFor(30, ["food_protein_armor", "food_no_snacks", "food_three_meals", "food_dinner_before_20"])).get("swan")?.unlocked, true));
test("250 unique completion rows unlock boar", () => {
  const logs = Array.from({ length: 250 }, (_, index) => ({ task_code: `task_${index}`, event_day: day(index), points: 1 }));
  assert.equal(result(logs).get("boar")?.unlocked, true);
});
test("500 unique completion rows unlock beaver", () => {
  const logs = Array.from({ length: 500 }, (_, index) => ({ task_code: `task_${index}`, event_day: day(index), points: 1 }));
  assert.equal(result(logs).get("beaver")?.unlocked, true);
});
test("100 Sport Challenge unlock bear", () => assert.equal(result(logsFor(100, ["bonus_day_1_challenge"])).get("bear")?.unlocked, true));
test("10000 existing points unlock falcon", () => assert.equal(result([], 10000).get("falcon")?.unlocked, true));
test("90 active days unlock bison", () => assert.equal(result(logsFor(90, ["water_wakeup"])).get("bison")?.unlocked, true));
test("12 previously opened legends unlock owl", () => {
  const opened = ["hare", "roe-deer", "otter", "stork", "wolf", "fox", "horse", "deer", "boar", "lynx", "swan", "beaver"];
  const progress = new Map(calculateLegendProgress([], 0, opened).map((item) => [item.slug, item]));
  assert.equal(progress.get("owl")?.unlocked, true);
});
test("optional-only day is active but not perfect", () => {
  const progress = result(logsFor(7, ["bonus_day_1_daily"]));
  assert.equal(progress.get("hare")?.current, 0);
  assert.equal(progress.get("roe-deer")?.current, 7);
});
