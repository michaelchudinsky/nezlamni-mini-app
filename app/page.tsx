"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Task = {
  id: string;
  code: string;
  title: string;
  description: string;
  points: number;
};

type Profile = {
  id: string;
  telegram_id: string;
  first_name: string | null;
  points_today: number;
  points_total: number;
  streak_current: number;
  start_weight: number | null;
  current_weight: number | null;
  target_weight: number | null;
  last_activity_date: string | null;
  registration_date: string | null;
  reminders_enabled?: boolean | null;
  reminder_morning_enabled?: boolean | null;
  reminder_water_enabled?: boolean | null;
  reminder_activity_enabled?: boolean | null;
  reminder_sleep_enabled?: boolean | null;
  timezone?: string | null;
};

type LeaderboardUser = {
  profile_id: string;
  name: string;
  points: number;
};

type TelegramUser = {
  id?: number | string;
  first_name?: string | null;
};

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: TelegramUser;
  };
  ready: () => void;
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

type LeaderboardLog = {
  profile_id: string;
  points: number | null;
  profiles:
    | {
        first_name: string | null;
        telegram_id: string | null;
      }
    | {
        first_name: string | null;
        telegram_id: string | null;
      }[]
    | null;
};

type CompletedTaskLog = {
  task_code: string;
};

type DailyLogStats = {
  points: number | null;
  event_day: string | null;
};

type TaskMeta = {
  emoji: string;
  title: string;
  description: string;
  accent: string;
  glow: string;
  action: string;
};

type WaterItem = {
  code: string;
  title: string;
  description: string;
};

type FoodItem = {
  code: string;
  title: string;
  description: string;
  points: number;
};

type ActivityItem = {
  code: string;
  title: string;
  description: string;
  points: number;
};

type NightItem = {
  code: string;
  title: string;
  description: string;
  points: number;
};

type OnboardingSlide = {
  eyebrow: string;
  title: string;
  text: string;
  bullets: string[];
};

type ReminderSettingKey =
  | "reminders_enabled"
  | "reminder_morning_enabled"
  | "reminder_water_enabled"
  | "reminder_activity_enabled"
  | "reminder_sleep_enabled";

type ReminderOption = {
  key: ReminderSettingKey;
  time: string;
  title: string;
  description: string;
};

const REMINDER_OPTIONS: ReminderOption[] = [
  {
    key: "reminder_morning_enabled",
    time: "08:00",
    title: "Ранковий старт",
    description: "Сон за минулу ніч + перша вода",
  },
  {
    key: "reminder_water_enabled",
    time: "15:00",
    title: "Вода і рух",
    description: "Вода до 16:00 + прогулянка або зарядка",
  },
  {
    key: "reminder_sleep_enabled",
    time: "21:00",
    title: "Нічний режим",
    description: "Без їжі на ніч + сон 7+ годин",
  },
];

const WATER_ITEMS: WaterItem[] = [
  {
    code: "water_wakeup",
    title: "Після пробудження",
    description: "Запусти день зі склянки води.",
  },
  {
    code: "water_breakfast",
    title: "Перед сніданком",
    description: "Допоможи апетиту бути спокійнішим.",
  },
  {
    code: "water_lunch",
    title: "Перед обідом",
    description: "Підтримай контроль порцій вдень.",
  },
  {
    code: "water_dinner",
    title: "Перед вечерею",
    description: "Зменш ризик переїдання ввечері.",
  },
  {
    code: "water_daily_norm",
    title: "Денна норма",
    description: "Закрий свою норму води за день.",
  },
];

const FOOD_ITEMS: FoodItem[] = [
  {
    code: "food_protein_armor",
    title: "Білкова броня",
    description:
      "Додай білок у кожен основний прийом їжі: яйця, рибу, мʼясо, сир або бобові.",
    points: 4,
  },
  {
    code: "food_no_snacks",
    title: "Без перекусів",
    description: "Ніяких цукерок, горішків, яблук чи кави з молоком між їжею.",
    points: 3,
  },
  {
    code: "food_three_meals",
    title: "3 основні прийоми їжі",
    description: "Сніданок, обід і вечеря без хаотичного добирання їжі.",
    points: 2,
  },
  {
    code: "food_dinner_before_20",
    title: "Останній прийом їжі до 20:00",
    description: "Після 20:00 тільки вода або несолодкий чай.",
    points: 1,
  },
];

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    code: "activity_walk_30",
    title: "Прогулянка 30 хв",
    description: "Приблизно 3000 кроків у спокійному або швидкому темпі.",
    points: 3,
  },
  {
    code: "activity_walk_60_pro",
    title: "Прогулянка PRO 60 хв",
    description: "Приблизно 6000 кроків — сильний рівень денного руху.",
    points: 2,
  },
  {
    code: "activity_walk_90_pro",
    title: "Прогулянка PRO 90 хв",
    description: "Приблизно 9000 кроків — потужний рівень витривалості.",
    points: 2,
  },
  {
    code: "activity_workout_20",
    title: "Тренування / Зарядка 20+ хв",
    description: "Силова, йога, домашня зарядка або будь-який свідомий рух.",
    points: 3,
  },
];

const NIGHT_ITEMS: NightItem[] = [
  {
    code: "night_sleep_7",
    title: "Сон 7+ годин",
    description:
      "Ранковий check за попередню ніч: спав/спала 7 годин або більше.",
    points: 3,
  },
  {
    code: "night_no_food_after_20",
    title: "Без їжі після 20:00",
    description:
      "За попередній вечір і ніч: після 20:00 без їжі та калорійних напоїв.",
    points: 2,
  },
];

const TASK_ORDER: Record<string, number> = {
  night: 0,
  water: 1,
  food: 2,
  activity: 3,
};

const DAILY_POINTS_MAX = 30;
const ONBOARDING_STORAGE_KEY = "nezlamni_v2_onboarding_seen";

const START_INTRO_SLIDES: OnboardingSlide[] = [
  {
    eyebrow: "Ласкаво просимо",
    title: "NEZLAMNI — це твій 30-денний шлях до перемоги і контролю.",
    text: "Це не магія. Це система: маленькі щоденні дії, які повертають тобі тіло, енергію, віру в себе і в свої сили.",
    bullets: [
      "Без хаосу і зривів",
      "З балами за кожну дію",
      "З відчуттям: я знову керую собою",
    ],
  },
  {
    eyebrow: "Як це працює",
    title: "Кожен день ти збираєш 4 сили схуднення.",
    text: "Вода, харчування, рух і сон. Відмічай виконане протягом дня, отримуй бали і тримай streak (стабільність).",
    bullets: [
      "Максимум 30 балів на день",
      "Пункти можна додавати поступово",
      "Випадковий вибір можна скасувати",
    ],
  },
  {
    eyebrow: "Твій результат",
    title: "Ти стаєш не ідеальною. Ти стаєш незламною.",
    text: "Через 30 днів ти побачиш не тільки цифру на вагах, а нову дисципліну: менше хаосу, більше сили, більше поваги до себе.",
    bullets: [
      "Стартуй з анкети",
      "Вкажи поточну вагу і ціль",
      "Почни перший день сьогодні",
    ],
  },
];

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    eyebrow: "30 днів сили",
    title: "Ти не худнеш на силі волі. Ти збираєш день.",
    text: "NEZLAMNI допомагає щодня тримати просту базу: вода, білок, рух і сон. Без хаосу, без самобичування, маленькими перемогами.",
    bullets: [
      "Отримуй бали за дії",
      "Тримай streak і темп",
      "Бач свій прогрес щодня",
    ],
  },
  {
    eyebrow: "Як працюють бали",
    title: "Максимум за день — 30 балів",
    text: "Не треба бути ідеальною. Просто забирай свої пункти протягом дня і повертайся, коли виконала ще один крок.",
    bullets: [
      "Сон і ніч без їжі — до 5",
      "Вода — до 5",
      "Харчування і білок — до 10",
      "Активність — до 10",
    ],
  },
  {
    eyebrow: "Коли що відмічати",
    title: "Відмічай одразу після дії",
    text: "Так легше не забути і чесно бачити день. Якщо натиснула випадково — пункт можна скасувати.",
    bullets: [
      "Зранку: сон за минулу ніч і перша вода",
      "Після їжі: харчування без перекусів",
      "Після прогулянки: активність",
      "Ввечері: закрий воду і нічний режим",
    ],
  },
  {
    eyebrow: "Кроки без стресу",
    title: "Кроки можна рахувати телефоном",
    text: "Підійде будь-який простий спосіб. Головне — не точність до кроку, а чесний рух.",
    bullets: [
      "iPhone: Здоровʼя / Apple Health",
      "Android: Google Fit або Samsung Health",
      "Годинник, браслет або 30 хв ≈ 3000 кроків",
    ],
  },
];

const TASK_META: Record<string, TaskMeta> = {
  water: {
    emoji: "💧",
    title: "Вода",
    description: "Закрий норму води та дай тілу чисту енергію.",
    accent: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/20",
    action: "Випив воду",
  },
  activity: {
    emoji: "⚡",
    title: "Активність",
    description: "Рухай тіло, розганяй енергію і тримай темп.",
    accent: "from-lime-400 to-emerald-600",
    glow: "shadow-emerald-500/20",
    action: "Я порухався",
  },
  food: {
    emoji: "🥗",
    title: "Харчування",
    description: "Білок, режим і чистий день без перекусів.",
    accent: "from-orange-400 to-rose-500",
    glow: "shadow-orange-500/20",
    action: "Харчування під контролем",
  },
  night: {
    emoji: "🌙",
    title: "Сон",
    description: "7+ годин сну і спокійна ніч без їжі.",
    accent: "from-violet-500 to-indigo-600",
    glow: "shadow-violet-500/20",
    action: "Ніч витримав",
  },
};

function getTaskMeta(task: Task) {
  return (
    TASK_META[task.code.toLowerCase()] || {
      emoji: "🔥",
      title: task.title,
      description: task.description || "Виконай завдання та забери бали.",
      accent: "from-zinc-500 to-zinc-700",
      glow: "shadow-zinc-500/20",
      action: "Виконати",
    }
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskCodes, setCompletedTaskCodes] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isWaterInfoOpen, setIsWaterInfoOpen] = useState(false);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isFoodInfoOpen, setIsFoodInfoOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isActivityInfoOpen, setIsActivityInfoOpen] = useState(false);
  const [isNightModalOpen, setIsNightModalOpen] = useState(false);
  const [isNightInfoOpen, setIsNightInfoOpen] = useState(false);
  const [rewardToast, setRewardToast] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [isFeedbackSaving, setIsFeedbackSaving] = useState(false);
  const [isReminderTestSending, setIsReminderTestSending] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isStartIntroDone, setIsStartIntroDone] = useState(false);
  const [startIntroStep, setStartIntroStep] = useState(0);

  const [name, setName] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
const [newWeight, setNewWeight] = useState("");
const [showWeightForm, setShowWeightForm] = useState(false);

  const showLoadError = useCallback((context: string, error: unknown) => {
    console.error(`[NEZLAMNI] ${context}`, error);
    setMessage("Не вдалося завантажити дані. Спробуй оновити застосунок.");
  }, []);

  const showSaveError = useCallback((context: string, error: unknown) => {
    console.error(`[NEZLAMNI] ${context}`, error);
    setMessage("Не вдалося зберегти. Спробуй ще раз.");
  }, []);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from("tasks").select("*");

    if (error) {
      showLoadError("fetch tasks", error);
      return;
    }

    setTasks(data || []);
  }, [showLoadError]);

const getOrCreateProfile = useCallback(async (tgUser: TelegramUser | null) => {
  const telegramId = tgUser?.id?.toString() || "demo_user_1";

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (selectError) {
    showLoadError("get profile", selectError);
    return null;
  }

  if (existing) {
    setProfile(existing);
    return existing as Profile;
  }

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      telegram_id: telegramId,
      first_name: tgUser?.first_name || "User",
    })
    .select()
    .single();

  if (insertError) {
    showSaveError("create profile", insertError);
    return null;
  }

  setProfile(created);
  return created as Profile;
}, [showLoadError, showSaveError]);

const fetchLeaderboard = useCallback(async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  const monthStart = startOfMonth.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_logs")
    .select("profile_id, points, profiles(first_name, telegram_id)")
    .gte("event_day", monthStart);

  if (error) {
    showLoadError("fetch leaderboard", error);
    return;
  }

  const map = new Map<string, LeaderboardUser>();

  (data as LeaderboardLog[] | null)?.forEach((log) => {
    const profileId = log.profile_id;
    const profileData = Array.isArray(log.profiles)
      ? log.profiles[0]
      : log.profiles;
    const name =
      profileData?.first_name ||
      `User ${profileData?.telegram_id || ""}`;

    const existing = map.get(profileId);

    if (existing) {
      existing.points += log.points || 0;
    } else {
      map.set(profileId, {
        profile_id: profileId,
        name,
        points: log.points || 0,
      });
    }
  });

  const sorted = Array.from(map.values())
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  setLeaderboard(sorted);
}, [showLoadError]);

const fetchCompletedTaskCodes = useCallback(async (profileId: string) => {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("task_code")
    .eq("profile_id", profileId)
    .eq("event_day", today());

  if (error) {
    showLoadError("fetch completed task codes", error);
    return;
  }

  const completedCodes = (data as CompletedTaskLog[] | null)?.map(
    (log) => log.task_code
  );

  setCompletedTaskCodes(completedCodes || []);
}, [showLoadError]);

const init = useCallback(async (tgUser: TelegramUser | null) => {
  await fetchTasks();
  const activeProfile = await getOrCreateProfile(tgUser);

  if (activeProfile) {
    await fetchCompletedTaskCodes(activeProfile.id);
  }

  await fetchLeaderboard();
}, [fetchCompletedTaskCodes, fetchLeaderboard, fetchTasks, getOrCreateProfile]);

  useEffect(() => {
    const tg = (window as TelegramWindow).Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user || null;

    tg?.ready();

    const timer = window.setTimeout(() => {
      void init(user);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [init]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasSeenOnboarding =
        window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";

      if (!hasSeenOnboarding) {
        setIsOnboardingOpen(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function saveProfile() {
    if (!profile) return;

    const { data, error } = await supabase
      .from("profiles")
      .update({
        first_name: name,
        start_weight: Number(startWeight),
        current_weight: Number(startWeight),
        target_weight: Number(targetWeight),
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      showSaveError("save profile", error);
      return;
    }

    setProfile(data);
    setMessage("Профіль збережено!");
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  async function syncProfileStats(profileId: string) {
    const { data: logs, error: logsError } = await supabase
      .from("daily_logs")
      .select("points, event_day")
      .eq("profile_id", profileId);

    if (logsError) {
      showLoadError("sync profile stats logs", logsError);
      return null;
    }

    const dailyLogs = (logs || []) as DailyLogStats[];
    const todayDate = today();
    const pointsTotal = dailyLogs.reduce(
      (sum, log) => sum + (log.points || 0),
      0
    );
    const pointsToday = dailyLogs
      .filter((log) => log.event_day === todayDate)
      .reduce((sum, log) => sum + (log.points || 0), 0);
    const activeDays = Array.from(
      new Set(dailyLogs.map((log) => log.event_day).filter(Boolean))
    ).sort() as string[];
    const lastActivityDate = activeDays.at(-1) || null;
    let streakCurrent = 0;

    if (lastActivityDate) {
      const activeDaySet = new Set(activeDays);
      const cursor = new Date(`${lastActivityDate}T00:00:00`);

      while (activeDaySet.has(cursor.toISOString().slice(0, 10))) {
        streakCurrent += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        points_today: pointsToday,
        points_total: pointsTotal,
        streak_current: streakCurrent,
        last_activity_date: lastActivityDate,
      })
      .eq("id", profileId)
      .select()
      .single();

    if (updateError) {
      showSaveError("sync profile stats update", updateError);
      return null;
    }

    setProfile(updatedProfile);
    return updatedProfile as Profile;
  }

  function getDaysWithUs() {
    if (!profile?.registration_date) return 1;

    const start = new Date(profile.registration_date);
    const now = new Date();
    const diff = now.getTime() - start.getTime();

    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  function getLevel() {
    const total = profile?.points_total || 0;

    if (total >= 10000) return "☀️ Світлоносний";
    if (total >= 6000) return "🛡️ Титан";
    if (total >= 3000) return "👑 Командир";
    if (total >= 1500) return "🔥 Легенда";
    if (total >= 700) return "⚔️ Незламний";
    if (total >= 300) return "🥇 Воїн";
    if (total >= 100) return "🥈 Боєць";

    return "🥉 Новачок";
  }

  function getWeightProgress() {
    if (!profile?.start_weight || !profile.current_weight || !profile.target_weight) {
      return 0;
    }

    const distance = profile.start_weight - profile.target_weight;

    if (distance <= 0) {
      return 0;
    }

    const progress =
      ((profile.start_weight - profile.current_weight) / distance) * 100;

    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  function getWaterCompletedCount() {
    return WATER_ITEMS.filter((item) => completedTaskCodes.includes(item.code))
      .length;
  }

  function getDailyWaterNorm() {
    const currentWeight = profile?.current_weight || profile?.start_weight || 0;

    if (!currentWeight) {
      return "0";
    }

    return (currentWeight * 0.03).toFixed(1);
  }

  function getFoodCompletedCount() {
    return FOOD_ITEMS.filter((item) => completedTaskCodes.includes(item.code))
      .length;
  }

  function getFoodPointsEarned() {
    return FOOD_ITEMS.reduce((sum, item) => {
      return completedTaskCodes.includes(item.code) ? sum + item.points : sum;
    }, 0);
  }

  function getActivityCompletedCount() {
    return ACTIVITY_ITEMS.filter((item) => completedTaskCodes.includes(item.code))
      .length;
  }

  function getActivityPointsEarned() {
    return ACTIVITY_ITEMS.reduce((sum, item) => {
      return completedTaskCodes.includes(item.code) ? sum + item.points : sum;
    }, 0);
  }

  function getNightCompletedCount() {
    return NIGHT_ITEMS.filter((item) => completedTaskCodes.includes(item.code))
      .length;
  }

  function getNightPointsEarned() {
    return NIGHT_ITEMS.reduce((sum, item) => {
      return completedTaskCodes.includes(item.code) ? sum + item.points : sum;
    }, 0);
  }

  function getDayStatus(points: number) {
    if (points >= 27) {
      return {
        title: "Легендарний день",
        description: "Максимальна дисципліна. День майже закритий ідеально.",
      };
    }

    if (points >= 20) {
      return {
        title: "Сильний день",
        description: "Ти тримаєш темп і вже зробив головне для прогресу.",
      };
    }

    if (points >= 10) {
      return {
        title: "Нормальний день",
        description: "База є. Ще кілька дій — і день стане сильним.",
      };
    }

    return {
      title: "Почни з малого",
      description: "Закрий один простий пункт і запусти рух дня.",
    };
  }

  function getTodayFocus() {
    if (!isNightCompleted) {
      return {
        title: "Закрий нічний check",
        description: "Почни день із сну 7+ годин і попередньої ночі без їжі.",
        action: "Відкрити сон",
        onClick: () => setIsNightModalOpen(true),
      };
    }

    if (waterCompletedCount < WATER_ITEMS.length) {
      return {
        title: "Добери воду",
        description: "Один пункт води швидко додасть бал і підтримає апетит.",
        action: "Відкрити воду",
        onClick: () => setIsWaterModalOpen(true),
      };
    }

    if (!completedTaskCodes.includes("food_protein_armor")) {
      return {
        title: "Додай білкову броню",
        description: "Білок у прийомах їжі тримає ситість і захищає мʼязи.",
        action: "Відкрити харчування",
        onClick: () => setIsFoodModalOpen(true),
      };
    }

    if (!isFoodCompleted) {
      return {
        title: "Дотисни харчування",
        description: "Без перекусів і режим їжі зроблять день набагато сильнішим.",
        action: "Відкрити харчування",
        onClick: () => setIsFoodModalOpen(true),
      };
    }

    if (!isActivityCompleted) {
      return {
        title: "Додай рух",
        description: "Прогулянка або зарядка піднімуть день ближче до 30 балів.",
        action: "Відкрити активність",
        onClick: () => setIsActivityModalOpen(true),
      };
    }

    return {
      title: "День закрито сильно",
      description: "Ти забрав максимум бази. Тримай темп і не перегоряй.",
      action: "Подивитись нагороди",
      onClick: () => setActiveTab("rewards"),
    };
  }

  function showRewardToast(points: number) {
    const phrases = [
      "Так тримати!",
      "Сильний крок!",
      "Темп є!",
      "Красиво йдеш!",
      "Ще один плюс!",
      "Дисципліна росте!",
      "Рухаємось далі!",
      "День стає сильнішим!",
      "Чітко!",
      "Незламно!",
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    setRewardToast(`Виконано +${points} · ${phrase}`);

    window.setTimeout(() => {
      setRewardToast("");
    }, 2200);
  }

  function isDuplicateLogError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    );
  }

  function openOnboarding() {
    setOnboardingStep(0);
    setIsOnboardingOpen(true);
  }

  function closeOnboarding() {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    setIsOnboardingOpen(false);
    setOnboardingStep(0);
  }

  function showNextOnboardingStep() {
    if (onboardingStep >= ONBOARDING_SLIDES.length - 1) {
      closeOnboarding();
      return;
    }

    setOnboardingStep((currentStep) => currentStep + 1);
  }

  function showNextStartIntroStep() {
    if (startIntroStep >= START_INTRO_SLIDES.length - 1) {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
      setIsStartIntroDone(true);
      setStartIntroStep(0);
      return;
    }

    setStartIntroStep((currentStep) => currentStep + 1);
  }

  async function updateReminderSetting(
    key: ReminderSettingKey,
    value: boolean
  ) {
    if (!profile) return;

    const { data, error } = await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      showSaveError("update reminder setting", error);
      return;
    }

    setProfile(data as Profile);
    setMessage(value ? "Нагадування увімкнено." : "Нагадування вимкнено.");
  }

  async function sendTestReminder() {
    if (!profile || isReminderTestSending) return;

    setIsReminderTestSending(true);

    const response = await fetch("/api/telegram/test-reminder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profileId: profile.id,
        telegramId: profile.telegram_id,
      }),
    });

    setIsReminderTestSending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (data?.error === "TELEGRAM_BOT_TOKEN is not configured") {
        setMessage("Спочатку додай TELEGRAM_BOT_TOKEN у змінні Vercel.");
        return;
      }

      setMessage("Не вдалося надіслати тест. Перевір токен бота.");
      return;
    }

    setMessage("Тестове нагадування надіслано в Telegram.");
  }

  async function completeWaterItem(item: WaterItem) {
    if (!profile) return;

    const todayDate = today();

    if (completedTaskCodes.includes(item.code)) {
      const { error: deleteLogError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("profile_id", profile.id)
        .eq("task_code", item.code)
        .eq("event_day", todayDate);

      if (deleteLogError) {
        showSaveError("cancel water item", deleteLogError);
        return;
      }

      const { data, error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          points_today: Math.max(0, profile.points_today - 1),
          points_total: Math.max(0, profile.points_total - 1),
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateProfileError) {
        showSaveError("update profile after water cancel", updateProfileError);
        return;
      }

      setProfile(data);
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.filter((code) => code !== item.code)
      );
      setMessage(`↩️ Скасовано: ${item.title} -1 бал`);
      await syncProfileStats(profile.id);
      await fetchLeaderboard();
      return;
    }

    const { data: existingLogs, error: existingLogsError } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("task_code", item.code)
      .eq("event_day", todayDate);

    if (existingLogsError) {
      showLoadError("check water item", existingLogsError);
      return;
    }

    if (existingLogs && existingLogs.length > 0) {
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.includes(item.code) ? currentCodes : [...currentCodes, item.code]
      );
      setMessage("✅ Цей пункт води вже зараховано сьогодні");
      return;
    }

    const { error: insertLogError } = await supabase.from("daily_logs").insert({
      profile_id: profile.id,
      task_code: item.code,
      points: 1,
      event_day: todayDate,
    });

    if (insertLogError) {
      if (isDuplicateLogError(insertLogError)) {
        setCompletedTaskCodes((currentCodes) =>
          currentCodes.includes(item.code)
            ? currentCodes
            : [...currentCodes, item.code]
        );
        setMessage("✅ Цей пункт води вже зараховано сьогодні");
        await syncProfileStats(profile.id);
        return;
      }

      showSaveError("save water item", insertLogError);
      return;
    }

    let newStreak = profile.streak_current || 0;

    const todayDateObj = new Date(todayDate);
    const yesterday = new Date(todayDateObj);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayString = yesterday.toISOString().slice(0, 10);

    if (profile.last_activity_date === yesterdayString) {
      newStreak += 1;
    } else if (profile.last_activity_date !== todayDate) {
      newStreak = 1;
    }

    const { data, error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        points_today: profile.points_today + 1,
        points_total: profile.points_total + 1,
        streak_current: newStreak,
        last_activity_date: todayDate,
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (updateProfileError) {
      showSaveError("update profile after water item", updateProfileError);
      return;
    }

    setProfile(data);
    setCompletedTaskCodes((currentCodes) => [...currentCodes, item.code]);
    setMessage(`💧 Вода зарахована: ${item.title} +1 бал`);
    showRewardToast(1);
    await syncProfileStats(profile.id);
    await fetchLeaderboard();
  }

  async function completeFoodItem(item: FoodItem) {
    if (!profile) return;

    const todayDate = today();

    if (completedTaskCodes.includes(item.code)) {
      const { error: deleteLogError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("profile_id", profile.id)
        .eq("task_code", item.code)
        .eq("event_day", todayDate);

      if (deleteLogError) {
        showSaveError("cancel food item", deleteLogError);
        return;
      }

      const { data, error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          points_today: Math.max(0, profile.points_today - item.points),
          points_total: Math.max(0, profile.points_total - item.points),
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateProfileError) {
        showSaveError("update profile after food cancel", updateProfileError);
        return;
      }

      setProfile(data);
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.filter((code) => code !== item.code)
      );
      setMessage(`↩️ Скасовано: ${item.title} -${item.points} бали`);
      await syncProfileStats(profile.id);
      await fetchLeaderboard();
      return;
    }

    const { data: existingLogs, error: existingLogsError } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("task_code", item.code)
      .eq("event_day", todayDate);

    if (existingLogsError) {
      showLoadError("check food item", existingLogsError);
      return;
    }

    if (existingLogs && existingLogs.length > 0) {
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.includes(item.code) ? currentCodes : [...currentCodes, item.code]
      );
      setMessage("✅ Цей прийом їжі вже зараховано сьогодні");
      return;
    }

    const { error: insertLogError } = await supabase.from("daily_logs").insert({
      profile_id: profile.id,
      task_code: item.code,
      points: item.points,
      event_day: todayDate,
    });

    if (insertLogError) {
      if (isDuplicateLogError(insertLogError)) {
        setCompletedTaskCodes((currentCodes) =>
          currentCodes.includes(item.code)
            ? currentCodes
            : [...currentCodes, item.code]
        );
        setMessage("✅ Цей пункт харчування вже зараховано сьогодні");
        await syncProfileStats(profile.id);
        return;
      }

      showSaveError("save food item", insertLogError);
      return;
    }

    let newStreak = profile.streak_current || 0;

    const todayDateObj = new Date(todayDate);
    const yesterday = new Date(todayDateObj);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayString = yesterday.toISOString().slice(0, 10);

    if (profile.last_activity_date === yesterdayString) {
      newStreak += 1;
    } else if (profile.last_activity_date !== todayDate) {
      newStreak = 1;
    }

    const { data, error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        points_today: profile.points_today + item.points,
        points_total: profile.points_total + item.points,
        streak_current: newStreak,
        last_activity_date: todayDate,
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (updateProfileError) {
      showSaveError("update profile after food item", updateProfileError);
      return;
    }

    setProfile(data);
    setCompletedTaskCodes((currentCodes) => [...currentCodes, item.code]);
    setMessage(`🥗 Харчування зараховано: ${item.title} +${item.points} бали`);
    showRewardToast(item.points);
    await syncProfileStats(profile.id);
    await fetchLeaderboard();
  }

  async function completeActivityItem(item: ActivityItem) {
    if (!profile) return;

    const todayDate = today();

    if (completedTaskCodes.includes(item.code)) {
      const { error: deleteLogError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("profile_id", profile.id)
        .eq("task_code", item.code)
        .eq("event_day", todayDate);

      if (deleteLogError) {
        showSaveError("cancel activity item", deleteLogError);
        return;
      }

      const { data, error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          points_today: Math.max(0, profile.points_today - item.points),
          points_total: Math.max(0, profile.points_total - item.points),
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateProfileError) {
        showSaveError("update profile after activity cancel", updateProfileError);
        return;
      }

      setProfile(data);
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.filter((code) => code !== item.code)
      );
      setMessage(`↩️ Скасовано: ${item.title} -${item.points} бали`);
      await syncProfileStats(profile.id);
      await fetchLeaderboard();
      return;
    }

    const { data: existingLogs, error: existingLogsError } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("task_code", item.code)
      .eq("event_day", todayDate);

    if (existingLogsError) {
      showLoadError("check activity item", existingLogsError);
      return;
    }

    if (existingLogs && existingLogs.length > 0) {
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.includes(item.code) ? currentCodes : [...currentCodes, item.code]
      );
      setMessage("✅ Ця активність вже зарахована сьогодні");
      return;
    }

    const { error: insertLogError } = await supabase.from("daily_logs").insert({
      profile_id: profile.id,
      task_code: item.code,
      points: item.points,
      event_day: todayDate,
    });

    if (insertLogError) {
      if (isDuplicateLogError(insertLogError)) {
        setCompletedTaskCodes((currentCodes) =>
          currentCodes.includes(item.code)
            ? currentCodes
            : [...currentCodes, item.code]
        );
        setMessage("✅ Ця активність вже зарахована сьогодні");
        await syncProfileStats(profile.id);
        return;
      }

      showSaveError("save activity item", insertLogError);
      return;
    }

    let newStreak = profile.streak_current || 0;

    const todayDateObj = new Date(todayDate);
    const yesterday = new Date(todayDateObj);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayString = yesterday.toISOString().slice(0, 10);

    if (profile.last_activity_date === yesterdayString) {
      newStreak += 1;
    } else if (profile.last_activity_date !== todayDate) {
      newStreak = 1;
    }

    const { data, error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        points_today: profile.points_today + item.points,
        points_total: profile.points_total + item.points,
        streak_current: newStreak,
        last_activity_date: todayDate,
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (updateProfileError) {
      showSaveError("update profile after activity item", updateProfileError);
      return;
    }

    setProfile(data);
    setCompletedTaskCodes((currentCodes) => [...currentCodes, item.code]);
    setMessage(`⚡ Активність зарахована: ${item.title} +${item.points} бали`);
    showRewardToast(item.points);
    await syncProfileStats(profile.id);
    await fetchLeaderboard();
  }

  async function completeNightItem(item: NightItem) {
    if (!profile) return;

    const todayDate = today();

    if (completedTaskCodes.includes(item.code)) {
      const { error: deleteLogError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("profile_id", profile.id)
        .eq("task_code", item.code)
        .eq("event_day", todayDate);

      if (deleteLogError) {
        showSaveError("cancel sleep item", deleteLogError);
        return;
      }

      const { data, error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          points_today: Math.max(0, profile.points_today - item.points),
          points_total: Math.max(0, profile.points_total - item.points),
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateProfileError) {
        showSaveError("update profile after sleep cancel", updateProfileError);
        return;
      }

      setProfile(data);
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.filter((code) => code !== item.code)
      );
      setMessage(`↩️ Скасовано: ${item.title} -${item.points} бали`);
      await syncProfileStats(profile.id);
      await fetchLeaderboard();
      return;
    }

    const { data: existingLogs, error: existingLogsError } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("task_code", item.code)
      .eq("event_day", todayDate);

    if (existingLogsError) {
      showLoadError("check sleep item", existingLogsError);
      return;
    }

    if (existingLogs && existingLogs.length > 0) {
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.includes(item.code) ? currentCodes : [...currentCodes, item.code]
      );
      setMessage("✅ Цей пункт вже зараховано сьогодні");
      return;
    }

    const { error: insertLogError } = await supabase.from("daily_logs").insert({
      profile_id: profile.id,
      task_code: item.code,
      points: item.points,
      event_day: todayDate,
    });

    if (insertLogError) {
      if (isDuplicateLogError(insertLogError)) {
        setCompletedTaskCodes((currentCodes) =>
          currentCodes.includes(item.code)
            ? currentCodes
            : [...currentCodes, item.code]
        );
        setMessage("✅ Цей пункт сну вже зараховано сьогодні");
        await syncProfileStats(profile.id);
        return;
      }

      showSaveError("save sleep item", insertLogError);
      return;
    }

    let newStreak = profile.streak_current || 0;

    const todayDateObj = new Date(todayDate);
    const yesterday = new Date(todayDateObj);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayString = yesterday.toISOString().slice(0, 10);

    if (profile.last_activity_date === yesterdayString) {
      newStreak += 1;
    } else if (profile.last_activity_date !== todayDate) {
      newStreak = 1;
    }

    const { data, error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        points_today: profile.points_today + item.points,
        points_total: profile.points_total + item.points,
        streak_current: newStreak,
        last_activity_date: todayDate,
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (updateProfileError) {
      showSaveError("update profile after sleep item", updateProfileError);
      return;
    }

    setProfile(data);
    setCompletedTaskCodes((currentCodes) => [...currentCodes, item.code]);
    setMessage(`🌙 Сон зараховано: ${item.title} +${item.points} бали`);
    showRewardToast(item.points);
    await syncProfileStats(profile.id);
    await fetchLeaderboard();
  }
async function updateWeight() {
  if (!profile || !newWeight) return;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      current_weight: Number(newWeight),
    })
    .eq("id", profile.id)
    .select()
    .single();

  if (error) {
    showSaveError("update weight", error);
    return;
  }

  setProfile(data);
  setNewWeight("");
  setShowWeightForm(false);

  setMessage("⚖️ Вага оновлена!");
}

  async function submitFeedback() {
    if (!profile || isFeedbackSaving) return;

    const text = feedbackText.trim();

    if (text.length < 3) {
      setMessage("Напиши хоча б кілька слів, щоб ми зрозуміли думку.");
      return;
    }

    setIsFeedbackSaving(true);

    const { error } = await supabase.from("feedback_messages").insert({
      profile_id: profile.id,
      message: text,
      screen: activeTab,
    });

    setIsFeedbackSaving(false);

    if (error) {
      showSaveError("submit feedback", error);
      return;
    }

    setFeedbackText("");
    setMessage("Дякуємо! Коментар збережено.");
  }

  async function completeTask(task: Task) {
    if (!profile) return;

    if (task.code.toLowerCase() === "water") {
      setIsWaterModalOpen(true);
      return;
    }

    if (task.code.toLowerCase() === "food") {
      setIsFoodModalOpen(true);
      return;
    }

    if (task.code.toLowerCase() === "activity") {
      setIsActivityModalOpen(true);
      return;
    }

    if (task.code.toLowerCase() === "night") {
      setIsNightModalOpen(true);
      return;
    }

    const todayDate = today();

    if (completedTaskCodes.includes(task.code)) {
      setMessage("✅ Це завдання вже виконано сьогодні");
      return;
    }

    const { data: existingLogs, error: existingLogsError } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("task_code", task.code)
      .eq("event_day", todayDate);

    if (existingLogsError) {
      showLoadError("check task", existingLogsError);
      return;
    }

    if (existingLogs && existingLogs.length > 0) {
      setMessage("❌ Ти вже виконав це завдання сьогодні");
      return;
    }

    const { error: insertLogError } = await supabase.from("daily_logs").insert({
      profile_id: profile.id,
      task_code: task.code,
      points: task.points,
      event_day: todayDate,
    });

    if (insertLogError) {
      if (isDuplicateLogError(insertLogError)) {
        setCompletedTaskCodes((currentCodes) =>
          currentCodes.includes(task.code)
            ? currentCodes
            : [...currentCodes, task.code]
        );
        setMessage("✅ Це завдання вже виконано сьогодні");
        await syncProfileStats(profile.id);
        return;
      }

      showSaveError("save task", insertLogError);
      return;
    }

    let newStreak = profile.streak_current || 0;

    const todayDateObj = new Date(todayDate);
    const yesterday = new Date(todayDateObj);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayString = yesterday.toISOString().slice(0, 10);

    if (profile.last_activity_date === yesterdayString) {
      newStreak += 1;
    } else if (profile.last_activity_date !== todayDate) {
      newStreak = 1;
    }

    const { data, error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        points_today: profile.points_today + task.points,
        points_total: profile.points_total + task.points,
        streak_current: newStreak,
        last_activity_date: todayDate,
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (updateProfileError) {
      showSaveError("update profile after task", updateProfileError);
      return;
    }

    setProfile(data);
    setCompletedTaskCodes((currentCodes) => [...currentCodes, task.code]);
    setMessage(`🔥 Зараховано! ${task.title} +${task.points} балів`);
    showRewardToast(task.points);
    await syncProfileStats(profile.id);
    await fetchLeaderboard();
  }

  if (!profile) {
    return (
<main className="min-h-screen bg-black text-white p-6 pb-24">        Завантаження...
      </main>
    );
  }

  if (!profile.start_weight || !profile.target_weight) {
    const startIntroSlide = START_INTRO_SLIDES[startIntroStep];

    if (!isStartIntroDone) {
      return (
        <main className="min-h-screen bg-black p-5 text-white">
          <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-between">
            <header className="pt-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">
                Power of control
              </p>
              <h1 className="mt-2 text-4xl font-black">NEZLAMNI 🔥</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Сила. Дисципліна. Незламність.
              </p>
            </header>

            <section className="rounded-[2rem] border border-green-500/30 bg-zinc-950 p-5 shadow-2xl shadow-green-950/30">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-green-400">
                {startIntroSlide.eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">
                {startIntroSlide.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                {startIntroSlide.text}
              </p>

              <div className="mt-6 space-y-2">
                {startIntroSlide.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="flex items-center gap-3 rounded-2xl bg-zinc-900 p-3"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-500 text-sm font-black text-black">
                      ✓
                    </span>
                    <span className="text-sm font-bold">{bullet}</span>
                  </div>
                ))}
              </div>
            </section>

            <footer className="pb-3">
              <div className="mb-4 flex justify-center gap-2">
                {START_INTRO_SLIDES.map((slide, index) => (
                  <span
                    key={slide.title}
                    className={`h-2 rounded-full transition-all ${
                      index === startIntroStep
                        ? "w-8 bg-green-400"
                        : "w-2 bg-zinc-700"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={showNextStartIntroStep}
                className="w-full rounded-2xl bg-green-600 p-4 text-base font-black"
              >
                {startIntroStep === START_INTRO_SLIDES.length - 1
                  ? "Хочу стати незламною"
                  : "Далі"}
              </button>
            </footer>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto space-y-5">
          <h1 className="text-3xl font-bold">NEZLAMNI 🔥</h1>

          <div className="bg-zinc-900 rounded-2xl p-5 space-y-4">
            <h2 className="text-xl font-bold">Стартова анкета</h2>

            <input
              className="w-full rounded-xl p-3 bg-zinc-800"
              placeholder="Твоє імʼя"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="w-full rounded-xl p-3 bg-zinc-800"
              placeholder="Точка А: твоя вага зараз "
              type="number"
              value={startWeight}
              onChange={(e) => setStartWeight(e.target.value)}
            />

            <input
              className="w-full rounded-xl p-3 bg-zinc-800"
              placeholder="Точка Б: бажана вага "
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
            />

            <button
              onClick={saveProfile}
              className="w-full bg-green-600 rounded-xl p-3 font-bold"
            >
Почати свій шлях            </button>
          </div>

          <Image
            src="/start-motivation.png"
            alt="Стань кращою версією себе"
            width={1681}
            height={936}
            className="aspect-[16/9] w-full rounded-[2rem] border border-amber-500/30 object-cover shadow-2xl shadow-amber-950/30"
          />
        </div>
      </main>
    );
  }

  const waterCompletedCount = getWaterCompletedCount();
  const isWaterCompleted = waterCompletedCount === WATER_ITEMS.length;
  const foodCompletedCount = getFoodCompletedCount();
  const foodPointsEarned = getFoodPointsEarned();
  const isFoodCompleted = foodCompletedCount === FOOD_ITEMS.length;
  const activityCompletedCount = getActivityCompletedCount();
  const activityPointsEarned = getActivityPointsEarned();
  const isActivityCompleted = activityCompletedCount === ACTIVITY_ITEMS.length;
  const nightCompletedCount = getNightCompletedCount();
  const nightPointsEarned = getNightPointsEarned();
  const isNightCompleted = nightCompletedCount === NIGHT_ITEMS.length;
  const dayPoints =
    waterCompletedCount +
    foodPointsEarned +
    activityPointsEarned +
    nightPointsEarned;
  const dayProgress = Math.min(
    100,
    Math.round((dayPoints / DAILY_POINTS_MAX) * 100)
  );
  const dayStatus = getDayStatus(dayPoints);
  const todayFocus = getTodayFocus();
  const taskSummaries = [
    {
      code: "night",
      meta: TASK_META.night,
      points: nightPointsEarned,
      maxPoints: 5,
      progress: nightCompletedCount,
      total: NIGHT_ITEMS.length,
      isCompleted: isNightCompleted,
      onClick: () => setIsNightModalOpen(true),
    },
    {
      code: "water",
      meta: TASK_META.water,
      points: waterCompletedCount,
      maxPoints: 5,
      progress: waterCompletedCount,
      total: WATER_ITEMS.length,
      isCompleted: isWaterCompleted,
      onClick: () => setIsWaterModalOpen(true),
    },
    {
      code: "food",
      meta: TASK_META.food,
      points: foodPointsEarned,
      maxPoints: 10,
      progress: foodCompletedCount,
      total: FOOD_ITEMS.length,
      isCompleted: isFoodCompleted,
      onClick: () => setIsFoodModalOpen(true),
    },
    {
      code: "activity",
      meta: TASK_META.activity,
      points: activityPointsEarned,
      maxPoints: 10,
      progress: activityCompletedCount,
      total: ACTIVITY_ITEMS.length,
      isCompleted: isActivityCompleted,
      onClick: () => setIsActivityModalOpen(true),
    },
  ];
  const orderedTasks = [...tasks].sort((a, b) => {
    const aOrder = TASK_ORDER[a.code.toLowerCase()] ?? 99;
    const bOrder = TASK_ORDER[b.code.toLowerCase()] ?? 99;

    return aOrder - bOrder;
  });
  const completedCount = tasks.filter((task) =>
    task.code.toLowerCase() === "water"
      ? isWaterCompleted
      : task.code.toLowerCase() === "food"
        ? isFoodCompleted
        : task.code.toLowerCase() === "activity"
          ? isActivityCompleted
          : task.code.toLowerCase() === "night"
            ? isNightCompleted
            : completedTaskCodes.includes(task.code)
  ).length;
  const weightProgress = getWeightProgress();
  const topUsers = leaderboard.slice(0, 3);
  const restUsers = leaderboard.slice(3, 10);
  const onboardingSlide = ONBOARDING_SLIDES[onboardingStep];

  return (
    <main className="min-h-screen bg-black p-5 pb-28 text-white">
      {rewardToast && (
        <div className="reward-toast fixed inset-x-8 top-4 z-[60] mx-auto max-w-xs rounded-xl border border-green-400/40 bg-green-500 px-4 py-3 text-center text-sm font-black text-white shadow-xl shadow-green-500/30">
          {rewardToast}
        </div>
      )}

      {isOnboardingOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/80 px-4 pb-4">
          <section className="mx-auto w-full max-w-md rounded-[2rem] border border-green-500/30 bg-zinc-950 p-5 shadow-2xl shadow-green-950/40">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-green-400">
                  {onboardingSlide.eyebrow}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {onboardingStep + 1}/{ONBOARDING_SLIDES.length}
                </p>
              </div>

              <button
                onClick={closeOnboarding}
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300"
              >
                Пропустити
              </button>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-5">
              <h2 className="text-3xl font-black leading-tight">
                {onboardingSlide.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {onboardingSlide.text}
              </p>

              <div className="mt-5 space-y-2">
                {onboardingSlide.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="flex items-center gap-3 rounded-2xl bg-black/40 p-3"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-500 text-sm font-black text-black">
                      ✓
                    </span>
                    <span className="text-sm font-bold text-white">
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {ONBOARDING_SLIDES.map((slide, index) => (
                  <span
                    key={slide.title}
                    className={`h-2 rounded-full transition-all ${
                      index === onboardingStep
                        ? "w-7 bg-green-400"
                        : "w-2 bg-zinc-700"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={showNextOnboardingStep}
                className="rounded-full bg-green-600 px-6 py-3 text-sm font-black text-white"
              >
                {onboardingStep === ONBOARDING_SLIDES.length - 1
                  ? "Почати день"
                  : "Далі"}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="mx-auto max-w-md">
        {activeTab === "home" && (
          <div className="space-y-5">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">
                  Mini App
                </p>
                <h1 className="text-4xl font-black">NEZLAMNI 🔥</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Сила. Дисципліна. Незламність.
                </p>
                <button
                  onClick={openOnboarding}
                  className="help-pulse mt-3 rounded-full border border-green-500/30 bg-green-950/30 px-4 py-2 text-xs font-black text-green-300"
                >
                  Як це працює?
                </button>
              </div>

              <button className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-900 text-xl">
                🔔
              </button>
            </header>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
              <div className="flex gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-500 to-emerald-700 text-3xl font-black">
                  {(profile.first_name || "U").slice(0, 1)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-400">Вітаємо,</p>
                  <h2 className="truncate text-2xl font-black">
                    {profile.first_name || "друже"}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-green-400">
                    {getLevel()}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${weightProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">
                      {weightProgress}%
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-orange-500/15 px-3 py-2 text-center">
                  <p className="text-2xl font-black">
                    {profile.streak_current || 0}
                  </p>
                  <p className="text-xs font-bold text-orange-300">streak</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-[1fr_1.3fr] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              <div className="grid place-items-center border-r border-zinc-800 bg-black/30 p-5 text-4xl">
                ❖
              </div>
              <div className="p-5">
                <p className="text-sm font-bold uppercase tracking-wider text-green-400">
                  Твої бали
                </p>
                <p className="text-4xl font-black">
                  {profile.points_total || 0}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-green-400">
                    Прогрес дня
                  </p>
                  <h2 className="text-2xl font-black">{dayStatus.title}</h2>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black">
                    {dayPoints}/{DAILY_POINTS_MAX}
                  </p>
                  <p className="text-xs font-bold text-zinc-400">балів</p>
                </div>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${dayProgress}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-zinc-400">
                {dayStatus.description}
              </p>
            </section>

            <section className="rounded-3xl border border-green-500/30 bg-green-950/25 p-5">
              <p className="text-sm font-bold text-green-400">
                Фокус сьогодні
              </p>
              <h2 className="mt-1 text-2xl font-black">{todayFocus.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">
                {todayFocus.description}
              </p>
              <button
                onClick={todayFocus.onClick}
                className="mt-4 rounded-full bg-green-600 px-5 py-3 text-sm font-black"
              >
                {todayFocus.action}
              </button>
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-400">
                    Сьогоднішні завдання
                  </p>
                  <h2 className="text-2xl font-black">Забери свої бали</h2>
                </div>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-bold text-zinc-300"
                >
                  {completedCount}/{tasks.length}
                </button>
              </div>

              <div className="space-y-3">
                {orderedTasks.map((task) => {
                  const meta = getTaskMeta(task);
                  const isWaterTask = task.code.toLowerCase() === "water";
                  const isFoodTask = task.code.toLowerCase() === "food";
                  const isActivityTask = task.code.toLowerCase() === "activity";
                  const isNightTask = task.code.toLowerCase() === "night";
                  const isCompleted = isWaterTask
                    ? isWaterCompleted
                    : isFoodTask
                      ? isFoodCompleted
                      : isActivityTask
                        ? isActivityCompleted
                        : isNightTask
                          ? isNightCompleted
                          : completedTaskCodes.includes(task.code);
                  const pointsText = isWaterTask
                    ? `+${waterCompletedCount}`
                    : isFoodTask
                      ? `+${foodPointsEarned}`
                      : isActivityTask
                        ? `+${activityPointsEarned}`
                        : isNightTask
                          ? `+${nightPointsEarned}`
                          : `+${task.points}`;
                  const statusText = isWaterTask
                    ? `${waterCompletedCount}/${WATER_ITEMS.length}`
                    : isFoodTask
                      ? `${foodCompletedCount}/${FOOD_ITEMS.length}`
                      : isActivityTask
                        ? `${activityCompletedCount}/${ACTIVITY_ITEMS.length}`
                        : isNightTask
                          ? `${nightCompletedCount}/${NIGHT_ITEMS.length}`
                          : isCompleted
                            ? "✅"
                            : "○";
                  const progressPercent = isWaterTask
                    ? (waterCompletedCount / WATER_ITEMS.length) * 100
                    : isFoodTask
                      ? (foodCompletedCount / FOOD_ITEMS.length) * 100
                      : isActivityTask
                        ? (activityCompletedCount / ACTIVITY_ITEMS.length) * 100
                        : isNightTask
                          ? (nightCompletedCount / NIGHT_ITEMS.length) * 100
                          : isCompleted
                            ? 100
                            : 0;

                  return (
                    <button
                      key={task.id}
                      onClick={() => completeTask(task)}
                      className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left shadow-lg transition active:scale-[0.99] ${
                        isCompleted
                          ? "border-green-500/40 bg-green-950/40 text-white"
                          : `border-zinc-800 bg-zinc-900 ${meta.glow}`
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.accent} text-3xl shadow-lg`}
                        >
                          {isCompleted ? "✓" : meta.emoji}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black leading-tight">
                            {meta.title}
                          </h3>
                          <p className="truncate text-sm text-zinc-300">
                            {meta.description}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-black text-green-300">
                            {pointsText}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {statusText}
                          </p>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 h-1 w-full bg-black/30">
                        <div
                          className={`h-full bg-gradient-to-r ${meta.accent}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-green-950 p-5">
              <p className="text-sm font-bold text-green-400">Мотивація дня</p>
              <h2 className="mt-2 text-2xl font-black">Сила роду в тобі</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Твій шлях — твоя легенда. Один день, одне рішення, один крок.
              </p>
              <button
                onClick={() => setActiveTab("tasks")}
                className="mt-5 rounded-full bg-green-600 px-5 py-3 text-sm font-black"
              >
                Перейти до завдань
              </button>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm font-bold text-green-400">
                Коментар розробникам
              </p>
              <h2 className="mt-1 text-2xl font-black">Що покращити?</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Напиши, якщо щось незручно, незрозуміло або зламалось.
              </p>

              <textarea
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Наприклад: не зрозумів, як зарахувати воду..."
                className="mt-4 w-full resize-none rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-green-500"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">
                  {feedbackText.trim().length}/1000
                </span>
                <button
                  onClick={submitFeedback}
                  disabled={isFeedbackSaving || feedbackText.trim().length < 3}
                  className="rounded-full bg-green-600 px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                  {isFeedbackSaving ? "Зберігаю..." : "Надіслати"}
                </button>
              </div>
            </section>
          </div>
        )}
        {message && (
          <div className="bg-zinc-800 rounded-2xl p-4 mb-6">{message}</div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-5">
            <header className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab("home")}
                className="text-2xl"
              >
                ‹
              </button>
              <h1 className="text-2xl font-black">Рейтинг</h1>
              <div className="rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                Місяць
              </div>
            </header>

            {topUsers.length > 0 && (
              <section className="grid grid-cols-3 items-end gap-3">
                {topUsers.map((user, index) => (
                  <div
                    key={user.profile_id}
                    className={`rounded-3xl border border-zinc-800 bg-zinc-900 p-3 text-center ${
                      index === 0 ? "pb-8" : "pb-4"
                    }`}
                  >
                    <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-green-500 to-emerald-800 text-xl font-black">
                      {user.name.slice(0, 1)}
                    </div>
                    <p className="font-bold">{user.name}</p>
                    <p className="text-green-400">{user.points}</p>
                  </div>
                ))}
              </section>
            )}

            {leaderboard.length === 0 ? (
              <p className="text-zinc-400">Поки немає учасників</p>
            ) : (
              <div className="space-y-2 rounded-3xl border border-zinc-800 bg-zinc-900 p-3">
                {restUsers.map((user, index) => (
                  <div
                    key={user.profile_id}
                    className="flex items-center justify-between rounded-2xl bg-zinc-800/70 p-3"
                  >
                    <span className="text-zinc-400">{index + 4}</span>
                    <span className="flex-1 px-3">{user.name}</span>
                    <span className="font-bold">{user.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-5">
            <header className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab("home")}
                className="text-2xl"
              >
                ‹
              </button>
              <h1 className="text-2xl font-black">Профіль</h1>
              <span className="text-2xl">⚙️</span>
            </header>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-center">
              <div className="mx-auto mb-3 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-green-500 to-emerald-800 text-4xl font-black">
                {(profile.first_name || "U").slice(0, 1)}
              </div>
              <h2 className="text-3xl font-black">
                {profile.first_name || "User"}
              </h2>
              <p className="text-sm text-zinc-400">
                Учасниця з {profile.registration_date || today()} ·{" "}
                {getDaysWithUs()} днів з нами
              </p>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-zinc-900 p-4 text-center">
                <p className="text-xs text-zinc-400">Рівень</p>
                <p className="text-xl font-black">{getLevel()}</p>
              </div>
              <div className="rounded-2xl bg-zinc-900 p-4 text-center">
                <p className="text-xs text-zinc-400">Стрік</p>
                <p className="text-2xl font-black">
                  {profile.streak_current || 0}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-900 p-4 text-center">
                <p className="text-xs text-zinc-400">Бали</p>
                <p className="text-2xl font-black">
                  {profile.points_total || 0}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-zinc-400">Поточна</p>
                  <p className="text-xl font-black">
                    {profile.current_weight} кг
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Ціль</p>
                  <p className="text-xl font-black">
                    {profile.target_weight} кг
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Прогрес</p>
                  <p className="text-xl font-black">{weightProgress}%</p>
                </div>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${weightProgress}%` }}
                />
              </div>

              <button
                onClick={() => setShowWeightForm(!showWeightForm)}
                className="mt-4 w-full rounded-2xl bg-zinc-800 p-3 font-bold"
              >
                Оновити вагу
              </button>

              {showWeightForm && (
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-xl bg-zinc-800 p-3"
                    placeholder="Нова вага"
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                  />

                  <button
                    onClick={updateWeight}
                    className="w-full rounded-xl bg-green-600 p-3 font-bold"
                  >
                    Зберегти
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-green-400">
                    Нагадування
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Твій бот підтримає темп
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Короткі повідомлення в Telegram у правильний момент дня.
                  </p>
                </div>

                <button
                  onClick={() =>
                    updateReminderSetting(
                      "reminders_enabled",
                      !(profile.reminders_enabled ?? true)
                    )
                  }
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${
                    profile.reminders_enabled ?? true
                      ? "bg-green-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {profile.reminders_enabled ?? true ? "Увімк." : "Вимк."}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {REMINDER_OPTIONS.map((option) => {
                  const isEnabled = profile[option.key] ?? true;

                  return (
                    <button
                      key={option.key}
                      onClick={() =>
                        updateReminderSetting(option.key, !isEnabled)
                      }
                      className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                        isEnabled
                          ? "border-green-500/25 bg-green-950/20"
                          : "border-zinc-800 bg-zinc-800/80"
                      }`}
                    >
                      <span className="grid h-12 w-16 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-sm font-black text-green-300">
                        {option.time}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="block font-bold">
                            {option.title}
                          </span>
                          {isEnabled && (
                            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-black text-green-300">
                              active
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-sm leading-snug text-zinc-400">
                          {option.description}
                        </span>
                      </span>

                      <span
                        className={`grid h-8 w-12 shrink-0 place-items-center rounded-full text-xs font-black ${
                          isEnabled
                            ? "bg-green-500 text-zinc-950"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {isEnabled ? "ON" : "OFF"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Можна вимкнути все одразу або залишити тільки потрібні моменти.
              </p>

              <button
                onClick={sendTestReminder}
                disabled={isReminderTestSending}
                className="mt-4 w-full rounded-2xl bg-green-600 p-3 font-black text-white disabled:opacity-50"
              >
                {isReminderTestSending
                  ? "Надсилаємо..."
                  : "Надіслати тестове нагадування"}
              </button>
            </section>

            <div className="space-y-3">
              <button
                onClick={() => setActiveTab("photo")}
                className="flex w-full items-center justify-between rounded-2xl bg-zinc-900 p-4"
              >
                <span>📸 Фото прогресу</span>
                <span>›</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-2xl bg-zinc-900 p-4">
                <span>📊 Статистика</span>
                <span>›</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-5">
            <header className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab("home")}
                className="text-2xl"
              >
                ‹
              </button>
              <h1 className="text-2xl font-black">Завдання</h1>
              <span className="text-sm text-zinc-400">
                {completedCount}/{tasks.length}
              </span>
            </header>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-green-400">
                    Прогрес дня
                  </p>
                  <h2 className="text-2xl font-black">{dayStatus.title}</h2>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black">
                    {dayPoints}/{DAILY_POINTS_MAX}
                  </p>
                  <p className="text-xs font-bold text-zinc-400">балів</p>
                </div>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${dayProgress}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-zinc-400">
                {dayStatus.description}
              </p>
            </section>

            <section className="rounded-3xl border border-green-500/30 bg-green-950/25 p-5">
              <p className="text-sm font-bold text-green-400">
                Фокус сьогодні
              </p>
              <h2 className="mt-1 text-2xl font-black">{todayFocus.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">
                {todayFocus.description}
              </p>
              <button
                onClick={todayFocus.onClick}
                className="mt-4 rounded-full bg-green-600 px-5 py-3 text-sm font-black"
              >
                {todayFocus.action}
              </button>
            </section>

            <section className="space-y-3">
              {taskSummaries.map((task) => {
                const progressPercent = (task.points / task.maxPoints) * 100;

                return (
                  <button
                    key={task.code}
                    onClick={task.onClick}
                    className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left ${
                      task.isCompleted
                        ? "border-green-500/40 bg-green-950/40"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${task.meta.accent} text-3xl`}
                      >
                        {task.isCompleted ? "✓" : task.meta.emoji}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black leading-tight">
                          {task.meta.title}
                        </h3>
                        <p className="truncate text-sm text-zinc-400">
                          {task.progress}/{task.total} пунктів
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-green-300">
                          +{task.points}
                        </p>
                        <p className="text-xs text-zinc-400">
                          з {task.maxPoints}
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 h-1 w-full bg-black/30">
                      <div
                        className={`h-full bg-gradient-to-r ${task.meta.accent}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="font-bold text-green-400">
                Дисципліна сьогодні — свобода завтра.
              </p>
            </section>
          </div>
        )}

        {activeTab === "rewards" && (
          <div className="space-y-5">
            <header className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab("home")}
                className="text-2xl"
              >
                ‹
              </button>
              <h1 className="text-2xl font-black">Нагороди</h1>
              <span />
            </header>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm font-bold text-green-400">
                Наступна нагорода
              </p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">Скриня хоробрості</h2>
                  <p className="text-sm text-zinc-400">
                    {profile.points_total || 0} / 2 000 балів
                  </p>
                </div>
                <div className="text-5xl">🎁</div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((profile.points_total || 0) / 2000) * 100
                    )}%`,
                  }}
                />
              </div>
            </section>

            <section className="space-y-3">
              {[
                ["Скриня хоробрості", "2 000 балів"],
                ["Сила предків", "5 000 балів"],
                ["Козацька воля", "10 000 балів"],
                ["Легенда роду", "20 000 балів"],
              ].map(([title, price]) => (
                <div
                  key={title}
                  className="flex items-center justify-between rounded-2xl bg-zinc-900 p-4"
                >
                  <div>
                    <p className="font-bold">{title}</p>
                    <p className="text-sm text-zinc-400">{price}</p>
                  </div>
                  <span>🔒</span>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeTab === "shop" && (
          <div className="space-y-5">
            <header className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab("home")}
                className="text-2xl"
              >
                ‹
              </button>
              <h1 className="text-2xl font-black">Shop</h1>
              <span className="text-2xl">🛍️</span>
            </header>

            <section className="rounded-3xl border border-green-500/30 bg-green-950/25 p-5">
              <p className="text-sm font-bold text-green-400">
                Скоро в NEZLAMNI
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Бонуси, марафони і преміум
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Тут зʼявляться корисні продукти для учасниць: доступи,
                марафони, подарунки за бали та преміум-можливості.
              </p>
            </section>

            <section className="grid gap-3">
              {[
                ["🎟️", "Марафон 30 днів", "Запуск після бета-тесту"],
                ["🎁", "Подарунки за бали", "Обмін балів на бонуси"],
                ["⭐", "Premium", "Додаткові інструменти і підтримка"],
              ].map(([icon, title, description]) => (
                <div
                  key={title}
                  className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-800 text-2xl">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black">{title}</p>
                    <p className="text-sm text-zinc-400">{description}</p>
                  </div>
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-black text-zinc-400">
                    soon
                  </span>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeTab === "photo" && (
          <div className="space-y-5">
            <header className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab("profile")}
                className="text-2xl"
              >
                ‹
              </button>
              <h1 className="text-2xl font-black">Фото прогресу</h1>
              <span />
            </header>

            <section className="grid grid-cols-2 gap-4">
              <div className="grid aspect-[3/4] place-items-center rounded-3xl border border-zinc-800 bg-zinc-900 text-center text-zinc-400">
                <div>
                  <p className="text-4xl">📷</p>
                  <p className="mt-2 font-bold">До</p>
                </div>
              </div>
              <div className="grid aspect-[3/4] place-items-center rounded-3xl border border-zinc-800 bg-zinc-900 text-center text-zinc-400">
                <div>
                  <p className="text-4xl">📷</p>
                  <p className="mt-2 font-bold">Після</p>
                </div>
              </div>
            </section>

            <button className="w-full rounded-2xl bg-green-600 p-4 font-black">
              + Додати нове фото
            </button>

            <p className="text-center text-sm text-zinc-400">
              Роби фото раз на 7 днів для відстеження прогресу.
            </p>
          </div>
        )}
      </div>

      {isWaterModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/75 px-3 pb-3">
          <div className="flex h-[80vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="overflow-y-auto p-5 pb-4">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-700" />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-green-400">
                  Твоя денна норма:{" "}
                  {getDailyWaterNorm()} л
                </p>
                <h2 className="text-3xl font-black">Вода</h2>
              </div>
              <button
                onClick={() => setIsWaterModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-500/25 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-300">
                Можна повертатися протягом дня
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Відмічай воду поступово протягом дня. Натиснула випадково — натисни ще раз,
                щоб скасувати пункт.
              </p>
            </div>

            <div className="mb-4 rounded-3xl bg-zinc-900 p-4">
              <div className="mb-3 grid h-28 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-700/30 text-6xl">
                💧
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                Вода допомагає контролювати апетит і легше відрізняти голод
                від спраги. Склянка води зранку та перед їжею допомагає
                спокійніше тримати харчування і не переїдати.
              </p>
              <button
                onClick={() => setIsWaterInfoOpen(true)}
                className="mt-4 text-sm font-bold text-green-400"
              >
                Чому це важливо?
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl bg-zinc-900 p-4">
              <div>
                <p className="text-sm text-zinc-400">Сьогодні</p>
                <p className="text-2xl font-black">
                  {waterCompletedCount}/{WATER_ITEMS.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Бали за воду</p>
                <p className="text-2xl font-black text-green-400">
                  +{waterCompletedCount}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {WATER_ITEMS.map((item) => {
                const isCompleted = completedTaskCodes.includes(item.code);

                return (
                  <button
                    key={item.code}
                    onClick={() => completeWaterItem(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                      isCompleted
                        ? "border-green-500/40 bg-green-950/40"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-black ${
                        isCompleted
                          ? "bg-green-500 text-black"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {isCompleted ? "✓" : "+1"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{item.title}</span>
                      <span className="block text-sm text-zinc-400">
                        {item.code === "water_daily_norm"
                          ? `${item.description}: ${getDailyWaterNorm()} л`
                          : item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsWaterModalOpen(false)}
              className="sticky bottom-0 mt-5 w-full rounded-2xl bg-green-600 p-4 font-black shadow-lg shadow-green-950/40"
            >
              Зберегти прогрес
            </button>
            </div>
          </div>
        </div>
      )}

      {isWaterInfoOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black">Навіщо пити воду?</h2>
              <button
                onClick={() => setIsWaterInfoOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 grid rounded-3xl bg-gradient-to-br from-cyan-500/30 to-blue-700/30 p-5 text-center">
              <div className="mb-3 text-7xl">💧</div>
              <p className="whitespace-nowrap text-[11px] font-black uppercase text-white sm:text-sm">
                Вода камінь точить — а жир зникати дуже хоче!
              </p>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                Жир горить тільки за умови достатньої гідратації — без води
                тіло біохімічно блокує схуднення. Коли ти п&apos;єш свою норму
                (30 мл на 1 кг ваги), організм розслабляється і зливає
                застояні набряки, що дає мінус 1.5–3 кг уже за перший тиждень.
                Склянка води за 20 хвилин до їжі заповнює шлунок і допомагає
                не плутати спрагу з голодом, природно зменшуючи апетит.
              </p>
              <p>
                <span className="font-bold text-white">
                  Чому 80% норми потрібно випити до 16:00?
                </span>
                <br />
                Тіло отримує воду в найактивнішу фазу дня, коли метаболізм та
                лімфа працюють на максимум. Вечірній мінімум уберігає тебе від
                ранкових набряків на обличчі та частих нічних походів у туалет,
                забезпечуючи міцний сон, під час якого активно спалюється
                підшкірний жир.
              </p>
              <p>
                Регулярне пиття зранку на пустий шлунок та перед їжею — це не
                магія, а залізна база для розгону обміну речовин і контролю
                дисципліни!
              </p>
            </div>
          </div>
        </div>
      )}

      {isFoodModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/75 px-3 pb-3">
          <div className="flex h-[80vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="overflow-y-auto p-5 pb-4">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-700" />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-green-400">
                  3 прийоми, білок і без перекусів
                </p>
                <h2 className="text-3xl font-black">
                  Харчування і білкова броня
                </h2>
              </div>
              <button
                onClick={() => setIsFoodModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-500/25 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-300">
                Можна повертатися протягом дня
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Відмічай харчування ввечері. Натиснула випадково — натисни ще
                раз, щоб скасувати пункт.
              </p>
            </div>

            <div className="mb-4 rounded-3xl bg-zinc-900 p-4">
              <div className="mb-3 grid h-28 place-items-center rounded-2xl bg-gradient-to-br from-orange-400/30 to-rose-600/30 text-6xl">
                🥗
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                Твоя задача — три чисті прийоми їжі без перекусів між ними та з
                білком у кожному прийомі. Так тіло отримує паузи без їжі, а
                тобі легше тримати ситість, апетит і дисципліну.
              </p>
              <button
                onClick={() => setIsFoodInfoOpen(true)}
                className="mt-4 text-sm font-bold text-green-400"
              >
                Чому це важливо?
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl bg-zinc-900 p-4">
              <div>
                <p className="text-sm text-zinc-400">Сьогодні</p>
                <p className="text-2xl font-black">
                  {foodCompletedCount}/{FOOD_ITEMS.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Бали за харчування</p>
                <p className="text-2xl font-black text-green-400">
                  +{foodPointsEarned}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {FOOD_ITEMS.map((item) => {
                const isCompleted = completedTaskCodes.includes(item.code);

                return (
                  <button
                    key={item.code}
                    onClick={() => completeFoodItem(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                      isCompleted
                        ? "border-green-500/40 bg-green-950/40"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-black ${
                        isCompleted
                          ? "bg-green-500 text-black"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {isCompleted ? "✓" : `+${item.points}`}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{item.title}</span>
                      <span className="block text-sm text-zinc-400">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsFoodModalOpen(false)}
              className="sticky bottom-0 mt-5 w-full rounded-2xl bg-green-600 p-4 font-black shadow-lg shadow-green-950/40"
            >
              Зберегти прогрес
            </button>
            </div>
          </div>
        </div>
      )}

      {isFoodInfoOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black">
                Навіщо їсти 3 рази на день без перекусів? 🤫
              </h2>
              <button
                onClick={() => setIsFoodInfoOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 grid rounded-3xl bg-gradient-to-br from-orange-400/30 to-rose-600/30 p-5 text-center">
              <div className="mb-3 text-7xl">🥗</div>
              <p className="whitespace-nowrap text-[11px] font-black uppercase text-white sm:text-sm">
                3 прийоми — і ніяких перекусів!
              </p>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                Кожен укус їжі, навіть маленька цукерка, горішок, кава з
                молоком чи яблуко, викликає викид гормону інсуліну. Поки рівень
                інсуліну в крові високий — жироспалювання чисто технічно
                заблоковане, а тіло працює тільки на накопичення жиру.
              </p>
              <p>
                Коли ти постійно перекушуєш, твій інсулін високий весь день.
                Організм просто не має часу, щоб спалювати власні запаси. Чисті
                3 прийоми їжі створюють «вікна харчової тиші», під час яких
                інсулін падає, і тіло починає активно палити підшкірний жир. До
                того ж, це дає відпочинок шлунку та уберігає від прихованих
                калорій.
              </p>
              <p>
                <span className="font-bold text-white">
                  Чому остання вечеря строго до 20:00?
                </span>
                <br />
                Ближче до ночі метаболізм уповільнюється, а чутливість до
                вуглеводів падає. Якщо поїсти пізно, їжа не встигне
                перетравитися і піде прямо в жирове депо. Рання вечеря гарантує,
                що вночі під час сну у тебе буде низький рівень цукру, і
                організм увімкне максимальний режим нічного жироспалювання.
              </p>
            </div>
          </div>
        </div>
      )}

      {isActivityModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/75 px-3 pb-3">
          <div className="flex h-[80vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="overflow-y-auto p-5 pb-4">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-700" />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-green-400">
                  Прогулянка PRO і тренування
                </p>
                <h2 className="text-3xl font-black">Активність і рух</h2>
              </div>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-500/25 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-300">
                Можна повертатися протягом дня
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Відмічай рух після прогулянки або тренування. Натиснула
                випадково — натисни ще раз, щоб скасувати пункт.
              </p>
            </div>

            <div className="mb-4 rounded-3xl bg-zinc-900 p-4">
              <div className="mb-3 grid h-28 place-items-center rounded-2xl bg-gradient-to-br from-lime-400/30 to-emerald-600/30 text-6xl">
                ⚡
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                Прогулянка допомагає тілу витрачати більше енергії без
                жорсткого спорту. Якщо є сили — додай тренування або зарядку на
                20 хвилин, щоб зміцнити тіло і тримати темп.
              </p>
              <button
                onClick={() => setIsActivityInfoOpen(true)}
                className="mt-4 text-sm font-bold text-green-400"
              >
                Чому це важливо?
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl bg-zinc-900 p-4">
              <div>
                <p className="text-sm text-zinc-400">Сьогодні</p>
                <p className="text-2xl font-black">
                  {activityCompletedCount}/{ACTIVITY_ITEMS.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Бали за активність</p>
                <p className="text-2xl font-black text-green-400">
                  +{activityPointsEarned}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {ACTIVITY_ITEMS.map((item) => {
                const isCompleted = completedTaskCodes.includes(item.code);

                return (
                  <button
                    key={item.code}
                    onClick={() => completeActivityItem(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                      isCompleted
                        ? "border-green-500/40 bg-green-950/40"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-black ${
                        isCompleted
                          ? "bg-green-500 text-black"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {isCompleted ? "✓" : `+${item.points}`}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{item.title}</span>
                      <span className="block text-sm text-zinc-400">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsActivityModalOpen(false)}
              className="sticky bottom-0 mt-5 w-full rounded-2xl bg-green-600 p-4 font-black shadow-lg shadow-green-950/40"
            >
              Зберегти прогрес
            </button>
            </div>
          </div>
        </div>
      )}

      {isActivityInfoOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black">
                Навіщо рухатися щодня? ⚡
              </h2>
              <button
                onClick={() => setIsActivityInfoOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 grid rounded-3xl bg-gradient-to-br from-lime-400/30 to-emerald-600/30 p-5 text-center">
              <div className="mb-3 text-7xl">⚡</div>
              <p className="whitespace-nowrap text-[11px] font-black uppercase text-white sm:text-sm">
                Рух пішов — жир поплив!
              </p>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                Активність допомагає створити дефіцит енергії без жорсткого
                голоду. Коли ти ходиш, тренуєшся або просто більше рухаєшся
                протягом дня, тіло витрачає більше калорій і легше використовує
                жирові запаси.
              </p>
              <p>
                Силові вправи та зарядка допомагають зберігати мʼязи, а мʼязи —
                це твій живий двигун обміну речовин. Чим краще ти тримаєш
                мʼязи, тим легше худнути без втрати сил і форми.
              </p>
              <p>
                Навіть якщо немає ресурсу на важке тренування, прогулянка і
                кроки вже працюють. Головне — не ідеальний спорт, а щоденний
                рух, який робить тебе стабільнішим.
              </p>
            </div>
          </div>
        </div>
      )}

      {isNightModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/75 px-3 pb-3">
          <div className="flex h-[80vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="overflow-y-auto p-5 pb-4">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-700" />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-green-400">
                  Check за попередню ніч
                </p>
                <h2 className="text-3xl font-black">Сон і відновлення</h2>
              </div>
              <button
                onClick={() => setIsNightModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-500/25 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-300">
                Ранковий check за попередню ніч
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Відмічай сон і ніч без їжі, вранці. Натиснула випадково —
                натисни ще раз, щоб скасувати пункт.
              </p>
            </div>

            <div className="mb-4 rounded-3xl bg-zinc-900 p-4">
              <div className="mb-3 grid h-28 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 text-6xl">
                🌙
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                Це завдання ми рахуємо вранці за попередню ніч: як ти спав і чи
                не їв після 20:00. Сон 7+ годин — база відновлення, контролю
                апетиту і нормального жироспалювання.
              </p>
              <button
                onClick={() => setIsNightInfoOpen(true)}
                className="mt-4 text-sm font-bold text-green-400"
              >
                Чому це важливо?
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl bg-zinc-900 p-4">
              <div>
                <p className="text-sm text-zinc-400">Сьогодні</p>
                <p className="text-2xl font-black">
                  {nightCompletedCount}/{NIGHT_ITEMS.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Бали за сон</p>
                <p className="text-2xl font-black text-green-400">
                  +{nightPointsEarned}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {NIGHT_ITEMS.map((item) => {
                const isCompleted = completedTaskCodes.includes(item.code);

                return (
                  <button
                    key={item.code}
                    onClick={() => completeNightItem(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                      isCompleted
                        ? "border-green-500/40 bg-green-950/40"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-black ${
                        isCompleted
                          ? "bg-green-500 text-black"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {isCompleted ? "✓" : `+${item.points}`}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{item.title}</span>
                      <span className="block text-sm text-zinc-400">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsNightModalOpen(false)}
              className="sticky bottom-0 mt-5 w-full rounded-2xl bg-green-600 p-4 font-black shadow-lg shadow-green-950/40"
            >
              Зберегти прогрес
            </button>
            </div>
          </div>
        </div>
      )}

      {isNightInfoOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black">
                Навіщо спати 7+ годин? 🌙
              </h2>
              <button
                onClick={() => setIsNightInfoOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 grid rounded-3xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 p-5 text-center">
              <div className="mb-3 text-7xl">🌙</div>
              <p className="whitespace-nowrap text-[11px] font-black uppercase text-white sm:text-sm">
                Сон міцний — апетит ручний!
              </p>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                Сон 7+ годин допомагає тримати під контролем гормони апетиту.
                Коли сну мало, організм частіше просить солодке, швидкі калорії
                та перекуси, бо шукає енергію будь-яким способом.
              </p>
              <p>
                Під час якісного сну тіло відновлює нервову систему, мʼязи та
                гормональний баланс. Це напряму впливає на дисципліну
                наступного дня: легше не зриватися, легше рухатися і легше
                тримати харчування.
              </p>
              <p>
                Ніч без їжі після 20:00 підсилює цей ефект: травлення не
                заважає відновленню, інсулін нижчий, а тіло спокійніше
                переходить у режим нічного жироспалювання.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950/95 px-2 pb-4 pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 text-center">
          {[
            { tab: "home", icon: "🏠", label: "Головна" },
            { tab: "tasks", icon: "✅", label: "Завдання" },
            { tab: "leaderboard", icon: "🏆", label: "Рейтинг" },
            { tab: "profile", icon: "👤", label: "Профіль" },
            { tab: "shop", icon: "🛍️", label: "Shop" },
          ].map((item) => {
            const isActive =
              activeTab === item.tab ||
              (item.tab === "profile" && activeTab === "photo");

            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`rounded-2xl px-1 py-2 text-[11px] font-bold transition ${
                  isActive
                    ? "bg-green-500/15 text-green-300"
                    : "text-zinc-400"
                }`}
              >
                <span className="block text-2xl leading-none">
                  {item.icon}
                </span>
                <span className="mt-1 block leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
