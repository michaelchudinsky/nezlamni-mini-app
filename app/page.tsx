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
  symbol: string;
  title: string;
  description: string;
  action: string;
};

const TASK_META: Record<string, TaskMeta> = {
  water: {
    emoji: "В",
    symbol: "♢",
    title: "Вода",
    description: "Випито 2 літри",
    action: "Виконати",
  },
  activity: {
    emoji: "А",
    symbol: "♞",
    title: "Активність",
    description: "30 хвилин тренування",
    action: "Виконати",
  },
  food: {
    emoji: "Х",
    symbol: "♨",
    title: "Харчування",
    description: "Дотримано плану",
    action: "Виконати",
  },
  night: {
    emoji: "Н",
    symbol: "☾",
    title: "Ніч",
    description: "7-8 годин сну",
    action: "Виконати",
  },
};

function getTaskMeta(task: Task) {
  return (
    TASK_META[task.code.toLowerCase()] || {
      emoji: "🔥",
      symbol: "✦",
      title: task.title,
      description: task.description || "Виконай завдання та забери бали.",
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
  const topLeaderboard = leaderboard.slice(0, 3);
  const restLeaderboard = leaderboard.slice(3, 8);
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
<main className="nezlamni-shell min-h-screen px-5 py-6 text-[#F5F5F5]">
        Завантаження...
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
    <main className="nezlamni-shell min-h-screen p-3 text-[#F5F5F5]">
      <div className="app-frame vyshyvanka-edge relative mx-auto min-h-[calc(100vh-24px)] max-w-md overflow-hidden rounded-[18px] px-4 pb-28 pt-4">
        <header className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="logo-ornament mt-2 h-[4.6rem] w-6 shrink-0" />
            <div>
            <h1 className="logo-gold text-[3.55rem] font-black leading-none">
              NEZLAMNI
            </h1>
            <p className="mt-1 text-[1.02rem] text-[#F3D49A]">
              Сила. Дисципліна. Незламність.
            </p>
            </div>
          </div>
          <button
            aria-label="Сповіщення"
            className="relative mt-3 grid h-12 w-12 place-items-center rounded-full border border-[#A67C52]/45 bg-[#08090A] text-xl text-[#D4AF37]"
          >
            ♧
            <span className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full bg-[#E63946]" />
          </button>
        </header>

        {message && (
          <div className="dark-premium-card mb-4 rounded-2xl p-4 text-sm text-[#F2C94C]">
            {message}
          </div>
        )}

        {activeTab === "home" && (
          <section className="space-y-3">
            <div className="home-user-card rounded-2xl p-3">
              <div className="grid grid-cols-[6.6rem_minmax(0,1fr)_4.9rem] items-center gap-3">
                <div className="avatar-ring relative h-[6.6rem] w-[6.6rem] shrink-0 rounded-full p-2">
                  <Image
                    src="/assets/nezlamni-avatar.png"
                    alt=""
                    width={150}
                    height={150}
                    className="h-full w-full rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border border-[#A67C52] bg-[#111] text-lg text-[#D4AF37]">
                    ◌
                  </div>
                </div>
                <div className="min-w-0 flex-1 py-2">
                  <p className="whitespace-nowrap text-lg font-medium">
                    Привіт, {displayName}!
                  </p>
                  <p className="mt-3 flex items-center gap-2 whitespace-nowrap text-sm text-[#EAC46D]">
                    <span className="text-[#E63946]">♜</span>
                    Рівень 7. Козачка
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#2A2A2E]">
                      <div
                        className="h-full rounded-full bg-[#E63946]"
                        style={{ width: `${xpProgress}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-xs text-[#F0D8A1]">
                      {xpCurrent} / {xpGoal} XP
                    </span>
                  </div>
                </div>
                <div className="flex w-[4.9rem] shrink-0 flex-col items-center">
                  <div className="trident-badge h-[4.2rem] w-[4.2rem] overflow-hidden">
                    <Image
                      src="/assets/nezlamni-badge-custom.png"
                      alt=""
                      width={512}
                      height={512}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-1 text-2xl font-black leading-none text-[#F2C94C]">
                    {profile.streak_current || 7}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[#F0D8A1]">
                    <span className="text-[#E63946]">🔥</span>
                    стрік
                  </p>
                </div>
              </div>
            </div>

            <div className="premium-card overflow-hidden rounded-xl p-0">
              <div className="flex min-h-[4.6rem] items-stretch justify-between">
                <div className="score-card-symbol grid w-[7.4rem] place-items-center">
                  <span className="score-rosette">✽</span>
                </div>
                <div className="flex-1 px-4 py-3">
                  <p className="section-title text-xs font-black">
                    ТВОЇ БАЛИ
                  </p>
                  <p className="text-4xl font-light leading-tight text-[#F2CDA0]">
                    {formatPoints(displayPoints)}
                  </p>
                </div>
                <span className="flex items-center pr-4 text-3xl text-[#F2C94C]">
                  ›
                </span>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title text-lg font-medium">
                  СЬОГОДНІШНІ ЗАВДАННЯ
                </h2>
                <span className="rounded-full border border-[#A67C52]/40 px-3 py-1 text-xs text-[#D4AF37]">
                  {completedTaskCodes.length}/{dailyMissionCount}
                </span>
              </div>

              <div className="space-y-0 overflow-hidden rounded-xl border border-[#A67C52]/32">
                {tasks.map((task) => {
                  const meta = getTaskMeta(task);
                  const isCompleted = completedTaskCodes.includes(task.code);

                  return (
                    <button
                      key={task.id}
                      onClick={() => completeTask(task)}
                      disabled={isCompleted}
                      className={`task-row flex w-full items-center gap-3 border-b border-[#A67C52]/14 px-4 py-3 text-left transition last:border-b-0 active:scale-[0.99] ${
                        isCompleted
                          ? "bg-[#8B1E3F]/28"
                          : ""
                      }`}
                    >
                      <div className="task-icon grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl">
                        {meta.symbol}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-medium leading-tight">{meta.title}</h3>
                          <span className="text-xl font-medium text-[#F5E4C5]">
                            +{task.points}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-[#B8A98A]">
                          {meta.description}
                        </p>
                      </div>
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
                          isCompleted
                            ? "border-[#E63946] bg-[#8B1E3F]/70 text-[#F4C7C9]"
                            : "border-[#E63946] text-[#E63946]"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative min-h-[9.7rem] overflow-hidden rounded-xl border border-[#A67C52]/38 p-6">
              <Image
                src="/assets/nezlamni-hero.png"
                alt=""
                fill
                sizes="(max-width: 480px) 100vw, 420px"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/20" />
              <div className="relative max-w-[14rem]">
                <p className="font-serif text-xl font-black leading-tight tracking-[0.03em] text-[#F2D8A4]">
                  СИЛА РОДУ В ТОБІ
                </p>
                <p className="mt-3 text-sm text-[#F0D8A1]">
                  Твій шлях — твоя легенда
                </p>
              </div>
              <div className="absolute bottom-4 right-4 grid h-12 w-12 place-items-center rounded-full border border-[#D4AF37]/50 bg-[#0D0D0F]/70 text-3xl text-[#F2C94C]">
                ›
              </div>
            </div>
          </section>
        )}

        {activeTab === "leaderboard" && (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <button className="text-3xl text-[#F5F5F5]">‹</button>
              <h2 className="text-xl font-medium">Рейтинг</h2>
              <button className="flex items-center gap-2 rounded-xl border border-[#A67C52]/40 px-3 py-2 text-sm text-[#F2C94C]">
                <span>▣</span>
                Місяць
                <span>⌄</span>
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <div className="premium-card rounded-2xl p-5 text-[#B8A98A]">
                Поки немає учасників
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 items-end gap-3 px-1 pt-4">
                  {topLeaderboard.map((user, index) => (
                    <div
                      key={user.profile_id}
                      className={`text-center ${index === 0 ? "order-2" : index === 1 ? "order-1" : "order-3"}`}
                    >
                      <div
                        className={`mb-1 text-3xl leading-none ${
                          index === 0
                            ? "leader-crown-gold"
                            : index === 1
                              ? "leader-crown-silver"
                              : "leader-crown-bronze"
                        }`}
                      >
                        ♛
                      </div>
                      <div
                        className={`avatar-ring relative mx-auto rounded-full border-2 p-1 ${
                          index === 0
                            ? "leader-ring-gold h-28 w-28"
                            : index === 1
                              ? "leader-ring-silver h-20 w-20"
                              : "leader-ring-bronze h-20 w-20"
                        }`}
                      >
                        <Image
                          src="/assets/nezlamni-avatar.png"
                          alt=""
                          width={150}
                          height={150}
                          className="h-full w-full rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full text-sm font-black ${
                            index === 0
                              ? "bg-[#F2C94C] text-[#3A2508]"
                              : index === 1
                                ? "bg-[#D8D6D1] text-[#2A2A2E]"
                                : "bg-[#D46A36] text-white"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </div>
                      <p className="mt-2 truncate font-medium">{user.name}</p>
                      <p className="text-xl text-[#F2C94C]">
                        {formatPoints(user.points)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="leader-list overflow-hidden rounded-2xl">
                  {restLeaderboard.map((user, index) => (
                  <div
                    key={user.profile_id}
                    className={`flex items-center justify-between border-b border-[#A67C52]/14 px-3 py-2.5 last:border-b-0 ${
                      index === 0 ? "bg-[#8B1E3F]/45" : "bg-[#0B0C0D]/70"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-[#F2C94C]">{index + 4}</span>
                      <span className="avatar-ring h-9 w-9 shrink-0 rounded-full p-0.5">
                        <Image
                          src="/assets/nezlamni-avatar.png"
                          alt=""
                          width={150}
                          height={150}
                          className="h-full w-full rounded-full object-cover"
                        />
                      </span>
                      <span className="truncate font-medium">{user.name}</span>
                    </span>
                    <span className="shrink-0">{formatPoints(user.points)}</span>
                  </div>
                ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "profile" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <button className="text-3xl">‹</button>
              <h2 className="text-xl font-medium">Профіль</h2>
              <button className="text-2xl text-[#F2C94C]">⚙</button>
            </div>

            <div className="text-center">
              <div className="avatar-ring relative mx-auto h-28 w-28 rounded-full p-2">
                <Image
                  src="/assets/nezlamni-avatar.png"
                  alt=""
                  width={150}
                  height={150}
                  className="h-full w-full rounded-full object-cover"
                />
                <div className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full border border-[#A67C52] bg-[#111] text-[#D4AF37]">
                  ◉
                </div>
              </div>
              <h2 className="mt-3 text-2xl font-medium">{displayName}</h2>
              <p className="text-sm text-[#B8A98A]">
                ♜ {getLevel()} · з нами {getDaysWithUs()} днів
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="dark-premium-card rounded-xl p-3 text-center">
                <p className="text-xs text-[#F2C94C]">Рівень</p>
                <p className="mt-1 text-2xl text-[#F2D8A4]">♜ 7</p>
              </div>
              <div className="dark-premium-card rounded-xl p-3 text-center">
                <p className="text-xs text-[#F2C94C]">Стрік</p>
                <p className="mt-1 text-2xl text-[#F2D8A4]">
                  {profile.streak_current || 7}
                </p>
              </div>
              <div className="dark-premium-card rounded-xl p-3 text-center">
                <p className="text-xs text-[#F2C94C]">Бали</p>
                <p className="mt-1 text-2xl text-[#F2D8A4]">
                  {formatPoints(displayPoints)}
                </p>
              </div>
            </div>

            <div className="premium-card rounded-2xl p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-[#F2C94C]">Поточна вага</p>
                  <p className="text-2xl text-[#F2D8A4]">
                    {profile.current_weight} кг
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#F2C94C]">Ціль</p>
                  <p className="text-2xl text-[#F2D8A4]">
                    {profile.target_weight} кг
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#F2C94C]">Прогрес</p>
                  <p className="text-2xl text-[#F2D8A4]">
                    {Math.round(getWeightProgress())}%
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#2A2A2E]">
                <div
                  className="h-full rounded-full bg-[#E63946]"
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

            <div className="overflow-hidden rounded-2xl border border-[#A67C52]/30">
              {["Фото прогресу", "Статистика"].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between border-b border-[#A67C52]/14 bg-[#0B0C0D]/70 p-4 last:border-b-0"
                >
                  <span className="text-[#F2D8A4]">{item}</span>
                  <span className="text-2xl text-[#F2C94C]">›</span>
                </div>
              ))}
            </div>

            <div className="premium-card rounded-2xl p-4">
              <p className="section-title text-sm font-black">ФОТО ПРОГРЕСУ</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {["до", "після"].map((label) => (
                  <div
                    key={label}
                    className="avatar-portrait grid aspect-[3/4] place-items-end rounded-xl border border-[#A67C52]/24 p-3"
                  >
                    <span className="rounded-full bg-[#0D0D0F]/70 px-3 py-1 text-sm">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "rewards" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <button className="text-3xl">‹</button>
              <h2 className="text-xl font-medium">Нагороди</h2>
              <span />
            </div>
            <div className="premium-card rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-[#F2C94C]">Наступна нагорода</p>
                  <h3 className="mt-1 text-xl">Скриня хоробрості</h3>
                  <p className="mt-2 text-sm text-[#F2D8A4]">
                    {formatPoints(displayPoints)} / 2 000 балів
                  </p>
                  <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-[#2A2A2E]">
                    <div
                      className="h-full rounded-full bg-[#E63946]"
                      style={{
                        width: `${Math.min(100, (displayPoints / 2000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="grid h-20 flex-1 place-items-center rounded-xl border border-[#A67C52]/30 bg-[#111] text-5xl text-[#D4AF37]">
                  ▣
                </div>
              </div>
            </div>
            <p className="section-title text-sm font-black">ДОСТУПНІ НАГОРОДИ</p>
            {["Скриня хоробрості", "Сила предків", "Козацька воля", "Легенда роду"].map(
              (reward) => (
                <div
                  key={reward}
                  className="dark-premium-card flex items-center justify-between rounded-xl p-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl text-[#D4AF37]">◈</span>
                    <span>{reward}</span>
                  </span>
                  <span className="text-[#B8A98A]">▣</span>
                </div>
              )
            )}
          </section>
        )}

        <nav className="fixed bottom-0 left-0 right-0 border-t border-[#D4AF37]/20 bg-[#0D0D0F]/95 px-3 py-3 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-2 text-center text-[11px]">
            {[
              ["home", "⌂", "Головна"],
              ["leaderboard", "♕", "Рейтинг"],
              ["profile", "♙", "Профіль"],
              ["rewards", "▣", "Нагороди"],
            ].map(([tab, icon, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 ${
                  activeTab === tab
                    ? "nav-item-active"
                    : "text-[#B8A98A]"
                }`}
              >
                <span className="text-2xl leading-none">{icon}</span>
                {label}
                {activeTab === tab && (
                  <span className="absolute -bottom-3 h-0.5 w-10 rounded-full bg-[#E63946]" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
