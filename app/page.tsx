"use client";

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

type TaskMeta = {
  emoji: string;
  title: string;
  description: string;
  accent: string;
  glow: string;
  action: string;
};

const TASK_META: Record<string, TaskMeta> = {
  water: {
    emoji: "В",
    title: "Вода",
    description: "Норма води на сьогодні.",
    accent: "from-[#E63946] to-[#8B1E3F]",
    glow: "shadow-red-500/20",
    action: "Виконати",
  },
  activity: {
    emoji: "А",
    title: "Активність",
    description: "Рух, прогулянка або тренування.",
    accent: "from-[#E63946] to-[#8B1E3F]",
    glow: "shadow-red-500/20",
    action: "Виконати",
  },
  food: {
    emoji: "Х",
    title: "Харчування",
    description: "Контроль раціону без зривів.",
    accent: "from-[#E63946] to-[#8B1E3F]",
    glow: "shadow-red-500/20",
    action: "Виконати",
  },
  night: {
    emoji: "Н",
    title: "Ніч",
    description: "Вечір без нічних перекусів.",
    accent: "from-[#E63946] to-[#8B1E3F]",
    glow: "shadow-red-500/20",
    action: "Виконати",
  },
};

function getTaskMeta(task: Task) {
  return (
    TASK_META[task.code.toLowerCase()] || {
      emoji: "🔥",
      title: task.title,
      description: task.description || "Виконай завдання та забери бали.",
      accent: "from-[#E63946] to-[#8B1E3F]",
      glow: "shadow-red-500/20",
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

  const [name, setName] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
const [newWeight, setNewWeight] = useState("");
const [showWeightForm, setShowWeightForm] = useState(false);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from("tasks").select("*");

    if (error) {
      setMessage("Помилка завантаження завдань: " + error.message);
      return;
    }

    setTasks(data || []);
  }, []);

const getOrCreateProfile = useCallback(async (tgUser: TelegramUser | null) => {
  const telegramId = tgUser?.id?.toString() || "demo_user_1";

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (selectError) {
    setMessage("Помилка профілю: " + selectError.message);
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
    setMessage("Помилка створення профілю: " + insertError.message);
    return null;
  }

  setProfile(created);
  return created as Profile;
}, []);

const fetchLeaderboard = useCallback(async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  const monthStart = startOfMonth.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_logs")
    .select("profile_id, points, profiles(first_name, telegram_id)")
    .gte("event_day", monthStart);

  if (error) {
    setMessage("Помилка рейтингу: " + error.message);
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
}, []);

const fetchCompletedTaskCodes = useCallback(async (profileId: string) => {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("task_code")
    .eq("profile_id", profileId)
    .eq("event_day", today());

  if (error) {
    setMessage("Помилка завантаження прогресу дня: " + error.message);
    return;
  }

  const completedCodes = (data as CompletedTaskLog[] | null)?.map(
    (log) => log.task_code
  );

  setCompletedTaskCodes(completedCodes || []);
}, []);

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
      setMessage("Помилка збереження профілю: " + error.message);
      return;
    }

    setProfile(data);
    setMessage("Профіль збережено!");
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
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

  function formatPoints(points: number) {
    return new Intl.NumberFormat("uk-UA").format(points);
  }

  function getWeightProgress() {
    if (
      !profile?.start_weight ||
      !profile.target_weight ||
      !profile.current_weight ||
      profile.start_weight === profile.target_weight
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        ((profile.start_weight - profile.current_weight) /
          (profile.start_weight - profile.target_weight)) *
          100
      )
    );
  }

  const xpCurrent = profile ? profile.points_total % 1000 : 620;
  const xpGoal = 1000;
  const xpProgress = Math.min(100, Math.max(0, (xpCurrent / xpGoal) * 100));
  const displayName = profile?.first_name || "Соломіє";
  const displayPoints = profile?.points_total || 1250;
  const dailyMissionCount = Math.max(tasks.length, 4);
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
    setMessage("Помилка оновлення ваги: " + error.message);
    return;
  }

  setProfile(data);
  setNewWeight("");
  setShowWeightForm(false);

  setMessage("⚖️ Вага оновлена!");
}
  async function completeTask(task: Task) {
    if (!profile) return;

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
      setMessage("Помилка перевірки завдання: " + existingLogsError.message);
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
      setMessage("Помилка запису завдання: " + insertLogError.message);
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
      setMessage("Помилка оновлення балів: " + updateProfileError.message);
      return;
    }

    setProfile(data);
    setCompletedTaskCodes((currentCodes) => [...currentCodes, task.code]);
    setMessage(`🔥 Зараховано! ${task.title} +${task.points} балів`);
    await fetchLeaderboard();
  }

  if (!profile) {
    return (
<main className="nezlamni-shell min-h-screen px-5 py-6 text-[#F5F5F5]">        Завантаження...
      </main>
    );
  }

  if (!profile.start_weight || !profile.target_weight) {
    return (
      <main className="nezlamni-shell vyshyvanka-edge min-h-screen px-5 py-6 text-[#F5F5F5]">
        <div className="max-w-md mx-auto">
          <h1 className="gold-text text-4xl font-black tracking-[0.08em]">
            NEZLAMNI
          </h1>
          <p className="muted-gold-text mb-6 mt-1 text-sm">
            Сила. Дисципліна. Незламність.
          </p>


          <div className="premium-card rounded-[28px] p-5 space-y-4">
            <h2 className="text-xl font-black">Стартова анкета</h2>

            <input
              className="w-full rounded-2xl border border-[#D4AF37]/20 bg-[#0D0D0F] p-3 text-[#F5F5F5] outline-none"
              placeholder="Твоє імʼя"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="w-full rounded-2xl border border-[#D4AF37]/20 bg-[#0D0D0F] p-3 text-[#F5F5F5] outline-none"
              placeholder="Точка А: твоя вага зараз"
              type="number"
              value={startWeight}
              onChange={(e) => setStartWeight(e.target.value)}
            />

            <input
              className="w-full rounded-2xl border border-[#D4AF37]/20 bg-[#0D0D0F] p-3 text-[#F5F5F5] outline-none"
              placeholder="Точка Б: бажана вага"
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
            />

            <button
              onClick={saveProfile}
              className="red-action w-full rounded-2xl p-3 font-black"
            >
              Почати шлях
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="nezlamni-shell vyshyvanka-edge min-h-screen px-4 pb-28 pt-5 text-[#F5F5F5]">
      <div className="mx-auto max-w-md">
        <header className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="gold-text text-4xl font-black tracking-[0.08em]">
              NEZLAMNI
            </h1>
            <p className="muted-gold-text mt-1 text-sm">
              Сила. Дисципліна. Незламність.
            </p>
          </div>
          <button
            aria-label="Сповіщення"
            className="grid h-11 w-11 place-items-center rounded-full border border-[#D4AF37]/30 bg-[#141A1D] text-[#D4AF37]"
          >
            !
          </button>
        </header>

        {message && (
          <div className="dark-premium-card mb-4 rounded-2xl p-4 text-sm text-[#F2C94C]">
            {message}
          </div>
        )}

        {activeTab === "home" && (
          <section className="space-y-4">
            <div className="premium-card rounded-[30px] p-5">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full border border-[#D4AF37]/50 bg-[#1A1A1D] text-2xl font-black text-[#D4AF37]">
                  С
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black">Привіт, {displayName}!</p>
                  <p className="muted-gold-text text-sm">Рівень 7. Козачка</p>
                </div>
                <div className="rounded-2xl border border-[#E63946]/30 bg-[#8B1E3F]/30 px-3 py-2 text-center">
                  <p className="text-xl font-black text-[#E63946]">
                    {profile.streak_current || 7}
                  </p>
                  <p className="text-[10px] uppercase text-[#B8A98A]">
                    стрік
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-[#B8A98A]">
                  <span>XP прогрес</span>
                  <span>
                    {xpCurrent} / {xpGoal}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#0D0D0F]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8B1E3F] to-[#E63946]"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="premium-card rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.18em] text-[#B8A98A]">
                    ТВОЇ БАЛИ
                  </p>
                  <p className="mt-1 text-5xl font-black text-[#F2C94C]">
                    {formatPoints(displayPoints)}
                  </p>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-full border border-[#D4AF37]/40 bg-[#0D0D0F] text-3xl text-[#D4AF37]">
                  ✦
                </div>
              </div>
              <div className="ornament-line mt-5 rounded-full" />
            </div>

            <div className="premium-card rounded-[28px] p-5">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.16em] text-[#E63946]">
                    ЗАВДАННЯ
                  </p>
                  <h2 className="text-2xl font-black">Щоденна дисципліна</h2>
                </div>
                <div className="rounded-full border border-[#D4AF37]/30 px-3 py-1 text-sm font-black text-[#D4AF37]">
                  {completedTaskCodes.length}/{dailyMissionCount}
                </div>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => {
                  const meta = getTaskMeta(task);
                  const isCompleted = completedTaskCodes.includes(task.code);

                  return (
                    <button
                      key={task.id}
                      onClick={() => completeTask(task)}
                      disabled={isCompleted}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                        isCompleted
                          ? "border-[#E63946]/60 bg-[#8B1E3F]/28"
                          : "border-[#D4AF37]/20 bg-[#1A1A1D]"
                      }`}
                    >
                      <div
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.accent} text-lg font-black text-white shadow-lg ${meta.glow}`}
                      >
                        {meta.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-black">{meta.title}</h3>
                          <span className="text-sm font-black text-[#F2C94C]">
                            +{task.points}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#B8A98A]">
                          {meta.description}
                        </p>
                      </div>
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                          isCompleted
                            ? "bg-[#E63946] text-white"
                            : "border border-[#E63946]/50 text-[#E63946]"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hero-banner rounded-[30px] border border-[#D4AF37]/25 p-5">
              <div className="max-w-[14rem]">
                <p className="text-2xl font-black tracking-[0.05em] text-[#F2C94C]">
                  СИЛА РОДУ В ТОБІ
                </p>
                <p className="mt-2 text-sm text-[#B8A98A]">
                  Твій шлях — твоя легенда
                </p>
              </div>
              <div className="ornament-line mt-8 w-32 rounded-full" />
            </div>
          </section>
        )}

        {activeTab === "leaderboard" && (
          <section className="premium-card rounded-[28px] p-5">
            <p className="text-xs font-black tracking-[0.16em] text-[#E63946]">
              РЕЙТИНГ
            </p>
            <h2 className="mb-4 mt-1 text-2xl font-black">Рейтинг місяця</h2>

            {leaderboard.length === 0 ? (
              <p className="text-[#B8A98A]">Поки немає учасників</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((user, index) => (
                  <div
                    key={user.profile_id}
                    className="flex items-center justify-between rounded-2xl border border-[#D4AF37]/15 bg-[#1A1A1D] p-3"
                  >
                    <span className="font-bold">
                      {index + 1}. {user.name}
                    </span>
                    <span className="font-black text-[#F2C94C]">
                      {user.points} балів
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "profile" && (
          <section className="space-y-4">
            <div className="premium-card rounded-[28px] p-5">
              <p className="text-xs font-black tracking-[0.16em] text-[#E63946]">
                ПРОФІЛЬ
              </p>
              <h2 className="mt-1 text-2xl font-black">{displayName}</h2>
              <p className="muted-gold-text mt-1">{getLevel()}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="dark-premium-card rounded-2xl p-4">
                  <p className="text-xs text-[#B8A98A]">З нами</p>
                  <p className="text-2xl font-black text-[#F2C94C]">
                    {getDaysWithUs()}
                  </p>
                </div>
                <div className="dark-premium-card rounded-2xl p-4">
                  <p className="text-xs text-[#B8A98A]">Стрік</p>
                  <p className="text-2xl font-black text-[#E63946]">
                    {profile.streak_current || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="premium-card rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[0.16em] text-[#E63946]">
                    ФОТО ПРОГРЕСУ
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Твоя трансформація</h2>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#D4AF37]/30 text-[#D4AF37]">
                  +
                </div>
              </div>
              <p className="muted-gold-text mt-3 text-sm">
                Тут будуть фото-чекіни та історія змін тіла.
              </p>
            </div>

            <div className="premium-card rounded-[28px] p-5">
              <div className="mb-2 flex justify-between text-sm text-[#B8A98A]">
                <span>Вага</span>
                <span>
                  {profile.start_weight} кг → {profile.current_weight} кг →{" "}
                  {profile.target_weight} кг
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#0D0D0F]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8B1E3F] to-[#E63946]"
                  style={{ width: `${getWeightProgress()}%` }}
                />
              </div>
              <button
                onClick={() => setShowWeightForm(!showWeightForm)}
                className="mt-4 w-full rounded-2xl border border-[#D4AF37]/25 p-3 font-black text-[#D4AF37]"
              >
                Оновити вагу
              </button>

              {showWeightForm && (
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-2xl border border-[#D4AF37]/20 bg-[#0D0D0F] p-3 text-[#F5F5F5] outline-none"
                    placeholder="Нова вага"
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                  />

                  <button
                    onClick={updateWeight}
                    className="red-action w-full rounded-2xl p-3 font-black"
                  >
                    Зберегти
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "rewards" && (
          <section className="space-y-4">
            <div className="premium-card rounded-[28px] p-5">
              <p className="text-xs font-black tracking-[0.16em] text-[#E63946]">
                НАГОРОДИ
              </p>
              <h2 className="mt-1 text-2xl font-black">Знаки сили</h2>
              <p className="muted-gold-text mt-2 text-sm">
                Нагороди відкриватимуться за стрік, завдання та прогрес.
              </p>
            </div>
            {["7 днів дисципліни", "Перша сотня балів", "Нічна перемога"].map(
              (reward) => (
                <div
                  key={reward}
                  className="dark-premium-card flex items-center justify-between rounded-2xl p-4"
                >
                  <span className="font-bold">{reward}</span>
                  <span className="rounded-full border border-[#D4AF37]/30 px-3 py-1 text-xs font-black text-[#D4AF37]">
                    скоро
                  </span>
                </div>
              )
            )}
          </section>
        )}

        <nav className="fixed bottom-0 left-0 right-0 border-t border-[#D4AF37]/20 bg-[#0D0D0F]/95 px-3 py-3 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-2 text-center text-[11px] font-bold">
            {[
              ["home", "Головна"],
              ["leaderboard", "Рейтинг"],
              ["profile", "Профіль"],
              ["rewards", "Нагороди"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-2xl px-2 py-2 ${
                  activeTab === tab
                    ? "red-action text-white"
                    : "text-[#B8A98A]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
