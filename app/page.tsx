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

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-6">NEZLAMNI 🔥</h1>
        <p className="text-zinc-400 mb-4">
  Активна вкладка: {activeTab}
</p>

{activeTab === "home" && (
        <div className="bg-zinc-900 rounded-2xl p-4 mb-6 space-y-2">
          <button
  onClick={() => setShowWeightForm(!showWeightForm)}
  className="w-full bg-zinc-800 rounded-xl p-3 mt-4 font-semibold"
>
  ✏️ Оновити вагу
</button>

{showWeightForm && (
  <div className="mt-4 space-y-3">
    <input
      className="w-full rounded-xl p-3 bg-zinc-800"
      placeholder="Нова вага"
      type="number"
      value={newWeight}
      onChange={(e) => setNewWeight(e.target.value)}
    />

    <button
      onClick={updateWeight}
      className="w-full bg-green-600 rounded-xl p-3 font-bold"
    >
      Зберегти
    </button>
  </div>
  
)}
          <p>📊 Сьогодні: {profile.points_today || 0} балів</p>
          <p>🏆 Всього: {profile.points_total || 0} балів</p>
          <p>🔥 Серія: {profile.streak_current || 0} днів</p>
          <p>🎮 Рівень: {getLevel()}</p>
          <p>🗓 З нами: {getDaysWithUs()} днів</p>
          <p>
            ⚖️ {profile.start_weight} кг → {profile.current_weight} кг →{" "}
            {profile.target_weight} кг
          </p>

          <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden mt-3">
            <div
              className="bg-green-500 h-4"
              style={{
                width: `${
                  profile.start_weight &&
                  profile.target_weight &&
                  profile.current_weight
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          ((profile.start_weight - profile.current_weight) /
                            (profile.start_weight - profile.target_weight)) *
                            100
                        )
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
)}
        {message && (
          <div className="bg-zinc-800 rounded-2xl p-4 mb-6">{message}</div>
        )}

        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-green-400">
              Щоденні місії
            </p>
            <h2 className="text-2xl font-black">Забери свої бали</h2>
          </div>
          <div className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-bold text-zinc-300">
            {completedTaskCodes.length}/{tasks.length}
          </div>
        </div>

        <div className="space-y-3 pb-24">
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
                <div className="flex items-start gap-4">
                  <div
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.accent} text-3xl shadow-lg`}
                  >
                    {isCompleted ? "✓" : meta.emoji}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black leading-tight">
                        {meta.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-black/30 px-3 py-1 text-sm font-black text-green-300">
                        +{task.points}
                      </span>
                    </div>

                    <p className="mb-3 text-sm leading-snug text-zinc-300">
                      {meta.description}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-white">
                        {isCompleted ? "Виконано сьогодні" : meta.action}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          isCompleted
                            ? "bg-green-500 text-black"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {isCompleted ? "DONE" : "START"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-3">
  <div className="max-w-md mx-auto grid grid-cols-4 gap-2 text-xs text-center">
<button onClick={() => setActiveTab("home")}>🏠<br />Головна</button>
<button onClick={() => setActiveTab("leaderboard")}>🏆<br />Рейтинг</button>
<button onClick={() => setActiveTab("profile")}>👤<br />Профіль</button>
<button onClick={() => setActiveTab("rewards")}>🎁<br />Нагороди</button>
  </div>
  
</div>
{activeTab === "leaderboard" && (
  <div className="bg-zinc-900 rounded-2xl p-4 mt-6">
    <h2 className="text-2xl font-bold mb-4">
      🏆 Рейтинг місяця
    </h2>

    {leaderboard.length === 0 ? (
      <p className="text-zinc-400">Поки немає учасників</p>
    ) : (
      <div className="space-y-3">
        {leaderboard.map((user, index) => (
          <div
            key={user.profile_id}
            className="flex justify-between bg-zinc-800 rounded-xl p-3"
          >
            <span>
              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`} {user.name}
            </span>

            <span>{user.points} балів</span>
          </div>
        ))}
      </div>
    )}
  </div>
)}
    </main>
  );
}
