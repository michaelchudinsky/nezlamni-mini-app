"use client";

import { useEffect, useState } from "react";
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

export default function Home() {
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user || null;

    if (tg) tg.ready();

    setTelegramUser(user);
    init(user);
  }, []);

  async function init(tgUser: any) {
  await fetchTasks();
  await getOrCreateProfile(tgUser);
  await fetchLeaderboard();
}

  async function fetchTasks() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

async function getOrCreateProfile(tgUser: any) {
  const telegramId = tgUser?.id?.toString() || "demo_user_1";

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (selectError) {
    setMessage("Помилка профілю: " + selectError.message);
    return;
  }

  if (existing) {
    setProfile(existing);
    return;
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
    return;
  }

  setProfile(created);
}

  async function saveProfile() {
    if (!profile) return;

    const { data } = await supabase
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

    setProfile(data);
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
async function fetchLeaderboard() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  const monthStart = startOfMonth.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("daily_logs")
    .select("profile_id, points, profiles(first_name, telegram_id)")
    .gte("event_day", monthStart);

  const map = new Map<string, LeaderboardUser>();

  data?.forEach((log: any) => {
    const profileId = log.profile_id;
    const name =
      log.profiles?.first_name ||
      `User ${log.profiles?.telegram_id || ""}`;

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
}
  async function completeTask(task: Task) {
    if (!profile) return;

    const todayDate = today();

    const { data: existingLogs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("task_code", task.code)
      .eq("event_day", todayDate);

    if (existingLogs && existingLogs.length > 0) {
      setMessage("❌ Ти вже виконав це завдання сьогодні");
      return;
    }

    await supabase.from("daily_logs").insert({
      profile_id: profile.id,
      task_code: task.code,
      points: task.points,
      event_day: todayDate,
    });

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

    const { data } = await supabase
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

    setProfile(data);
    setMessage(`🔥 Зараховано! ${task.title} +${task.points} балів`);
    await fetchLeaderboard();
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        Завантаження...
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


        <div className="bg-zinc-900 rounded-2xl p-4 mb-6 space-y-2">
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

        {message && (
          <div className="bg-zinc-800 rounded-2xl p-4 mb-6">{message}</div>
        )}

        <div className="space-y-4">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => completeTask(task)}
              className="w-full bg-zinc-800 rounded-2xl p-4 text-left font-semibold"
            >
              {task.title} +{task.points}
            </button>
          ))}
        </div>
        <div className="bg-zinc-900 rounded-2xl p-4 mt-6">
  <h2 className="text-xl font-bold mb-4">🏆 Рейтинг місяця</h2>

  {leaderboard.length === 0 ? (
    <p className="text-zinc-400">Поки немає учасників</p>
  ) : (
    <div className="space-y-2">
      {leaderboard.map((user, index) => (
        <div
          key={user.profile_id}
          className="flex justify-between bg-zinc-800 rounded-xl p-3"
        >
          <span>
            {index + 1}. {user.name}
          </span>
          <span>{user.points} балів</span>
        </div>
      ))}
    </div>
  )}
</div>
      </div>
    </main>
  );
}