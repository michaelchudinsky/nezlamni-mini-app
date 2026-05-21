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
    description: "Прогулянка, тренування або будь-який рух вперед.",
    accent: "from-lime-400 to-emerald-600",
    glow: "shadow-emerald-500/20",
    action: "Я порухався",
  },
  food: {
    emoji: "🥗",
    title: "Контроль харчування",
    description: "Обери нормальну їжу та не зривай свій темп.",
    accent: "from-orange-400 to-rose-500",
    glow: "shadow-orange-500/20",
    action: "Харчування під контролем",
  },
  night: {
    emoji: "🌙",
    title: "Ніч без їжі",
    description: "Закрий вечір спокійно: без нічних перекусів.",
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
<main className="min-h-screen bg-black text-white p-6 pb-24">        Завантаження...
      </main>
    );
  }

  if (!profile.start_weight || !profile.target_weight) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-6">NEZLAMNI 🔥</h1>


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
              placeholder="Точка А: твоя вага зараз"
              type="number"
              value={startWeight}
              onChange={(e) => setStartWeight(e.target.value)}
            />

            <input
              className="w-full rounded-xl p-3 bg-zinc-800"
              placeholder="Точка Б: бажана вага"
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
            />

            <button
              onClick={saveProfile}
              className="w-full bg-green-600 rounded-xl p-3 font-bold"
            >
              Почати шлях 💪
            </button>
          </div>
        </div>
      </main>
    );
  }

  const completedCount = completedTaskCodes.length;
  const weightProgress = getWeightProgress();
  const nextTask = tasks.find((task) => !completedTaskCodes.includes(task.code));
  const topUsers = leaderboard.slice(0, 3);
  const restUsers = leaderboard.slice(3, 10);

  return (
    <main className="min-h-screen bg-black p-5 pb-28 text-white">
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
                  <p className="text-sm text-zinc-400">Привіт,</p>
                  <h2 className="truncate text-2xl font-black">
                    {profile.first_name || "друже"}!
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
                {tasks.map((task) => {
                  const meta = getTaskMeta(task);
                  const isCompleted = completedTaskCodes.includes(task.code);

                  return (
                    <button
                      key={task.id}
                      onClick={() => completeTask(task)}
                      disabled={isCompleted}
                      className={`w-full rounded-2xl border p-4 text-left shadow-lg transition active:scale-[0.99] ${
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
                          <p className="font-black text-green-300">
                            +{task.points}
                          </p>
                          <p className="text-xl">
                            {isCompleted ? "✅" : "○"}
                          </p>
                        </div>
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

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-center">
              <div className="mx-auto mb-4 grid h-28 w-28 place-items-center rounded-full border-8 border-green-500/40 text-5xl">
                {nextTask ? getTaskMeta(nextTask).emoji : "✅"}
              </div>
              <p className="font-black text-green-400">
                {nextTask ? `+${nextTask.points} балів` : "День закрито"}
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {nextTask ? getTaskMeta(nextTask).title : "Все виконано"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {nextTask
                  ? getTaskMeta(nextTask).description
                  : "Сьогодні ти забрав усі доступні бали."}
              </p>
              {nextTask && (
                <button
                  onClick={() => completeTask(nextTask)}
                  className="mt-5 w-full rounded-2xl bg-green-600 p-4 font-black"
                >
                  Завдання виконано
                </button>
              )}
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
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-3">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-2 text-xs text-center">
          <button
            onClick={() => setActiveTab("home")}
            className={activeTab === "home" ? "text-green-400" : "text-zinc-400"}
          >
            🏠<br />Головна
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={
              activeTab === "leaderboard" ? "text-green-400" : "text-zinc-400"
            }
          >
            🏆<br />Рейтинг
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={
              activeTab === "profile" || activeTab === "photo"
                ? "text-green-400"
                : "text-zinc-400"
            }
          >
            👤<br />Профіль
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={
              activeTab === "rewards" ? "text-green-400" : "text-zinc-400"
            }
          >
            🎁<br />Нагороди
          </button>
        </div>
      </div>
    </main>
  );
}
