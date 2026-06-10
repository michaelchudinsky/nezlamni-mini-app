import { createClient } from "@supabase/supabase-js";

type Profile = {
  id: string;
  telegram_id: string | null;
  first_name: string | null;
  reminders_enabled: boolean | null;
  reminder_morning_enabled: boolean | null;
  reminder_water_enabled: boolean | null;
  reminder_sleep_enabled: boolean | null;
  timezone: string | null;
};

type DailyLog = {
  profile_id: string;
  task_code: string | null;
};

export type ReminderCode = "morning_start" | "water_and_movement" | "night_mode";

type ReminderConfig = {
  code: ReminderCode;
  hour: number;
  title: string;
  isEnabled: (profile: Profile) => boolean;
  shouldSkipWhenCompleted: boolean;
  taskCodes: string[];
  texts: string[];
};

type RunReminderCronOptions = {
  forcedReminderCode?: ReminderCode;
};

type CronDiagnostic = {
  profileId: string;
  reminderCode: ReminderCode | null;
  stage: "telegram" | "delivery";
  status?: number;
  message: string;
};

type CronRunStatus = "success" | "partial_failure" | "failure";

type CronLogClient = {
  from: (table: "reminder_cron_runs") => {
    insert: (values: unknown) => Promise<{ error: { message: string } | null }>;
  };
};

const WATER_CODES = [
  "water_wakeup",
  "water_breakfast",
  "water_lunch",
  "water_dinner",
  "water_daily_norm",
];

const ACTIVITY_CODES = [
  "activity_walk_30",
  "activity_walk_60_pro",
  "activity_walk_90_pro",
  "activity_workout_20",
];

const REMINDER_SETTINGS_NOTE =
  "Нагадування можна змінити у профілі NEZLAMNI.";

const REMINDERS: ReminderConfig[] = [
  {
    code: "morning_start",
    hour: 8,
    title: "Ранковий старт",
    isEnabled: (profile) => profile.reminder_morning_enabled ?? true,
    shouldSkipWhenCompleted: true,
    taskCodes: ["night_sleep_7", "night_no_food_after_20", "water_wakeup"],
    texts: [
      "Доброго ранку, {name}. Відміть сон, випий воду і забери силу першого кроку.",
      "Новий день починається з дисципліни: сон, вода, фокус. Ти вже в грі.",
      "Прокинувся — час увімкнути режим незламності. Сон і перша вода чекають.",
      "Сьогодні не треба ідеально. Треба почати: відміть сон і випий воду.",
      "Твоя перемога починається з ранку. Один check — і день уже під контролем.",
    ],
  },
  {
    code: "water_and_movement",
    hour: 15,
    title: "Вода і рух",
    isEnabled: (profile) => profile.reminder_water_enabled ?? true,
    shouldSkipWhenCompleted: true,
    taskCodes: [...WATER_CODES, ...ACTIVITY_CODES],
    texts: [
      "Добери воду до 16:00 і заплануй рух. Тіло любить чіткі дії.",
      "Середина дня — час повернути контроль. Вода, рух і ще один крок до результату.",
      "Не зливай темп. Вода до 16:00 і прогулянка тримають жироспалювання активним.",
      "Ти не чекаєш мотивацію. Ти робиш дію: вода, рух, бали.",
      "Ще не пізно зробити день сильним. Добери воду і додай рух.",
    ],
  },
  {
    code: "night_mode",
    hour: 21,
    title: "Нічний режим",
    isEnabled: (profile) => profile.reminder_sleep_enabled ?? true,
    shouldSkipWhenCompleted: false,
    taskCodes: [],
    texts: [
      "Закрий день красиво: без їжі на ніч, спокійний сон і завтра легше тіло.",
      "Ніч працює на тебе, якщо ти не заважаєш їй їжею і хаосом.",
      "Час берегти результат. Без перекусів, без зривів, сон 7+ годин.",
      "Сильний вечір — це не холодильник. Це спокій, вода і сон.",
      "Твоє тіло худне, коли ти відпочиваєш. Дай йому ніч без зайвої їжі.",
    ],
  },
];

function getLocalDateParts(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    eventDay: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

function pickReminderText(reminder: ReminderConfig, profile: Profile) {
  const index = Math.floor(Math.random() * reminder.texts.length);
  const name = profile.first_name || "Незламний";
  const reminderText = reminder.texts[index].replace("{name}", name);

  return `${reminderText}\n\n${REMINDER_SETTINGS_NOTE}`;
}

function getAppUrl(request: Request) {
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (process.env.TELEGRAM_MINI_APP_URL) {
    return process.env.TELEGRAM_MINI_APP_URL;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (productionUrl) {
    return `https://${productionUrl}`;
  }

  return new URL(request.url).origin;
}

async function sendTelegramMessage(
  botToken: string,
  telegramId: string,
  text: string,
  appUrl: string
) {
  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: telegramId,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Відкрити NEZLAMNI",
              web_app: {
                url: appUrl,
              },
            },
          ],
        ],
      },
    }),
  });
}

function hasCompletedAllRelevantTasks(
  completedTasks: Set<string>,
  taskCodes: string[]
) {
  if (taskCodes.length === 0) return false;

  return taskCodes.every((taskCode) => completedTasks.has(taskCode));
}

function getReminderForProfile(
  profile: Profile,
  hour: number,
  forcedReminderCode?: ReminderCode
) {
  if (forcedReminderCode) {
    return REMINDERS.find(
      (candidate) =>
        candidate.code === forcedReminderCode && candidate.isEnabled(profile)
    );
  }

  return REMINDERS.find(
    (candidate) => candidate.hour === hour && candidate.isEnabled(profile)
  );
}

async function readResponseText(response: Response) {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "Unable to read response body";
  }
}

function getCronRunStatus(sent: number, failed: number): CronRunStatus {
  if (failed === 0) return "success";
  if (sent > 0) return "partial_failure";

  return "failure";
}

async function writeCronRunLog(
  supabase: CronLogClient,
  request: Request,
  options: RunReminderCronOptions,
  startedAt: number,
  sent: number,
  skipped: number,
  failed: number,
  diagnostics: CronDiagnostic[]
) {
  const triggerPath = new URL(request.url).pathname;
  const status = getCronRunStatus(sent, failed);
  const { error } = await supabase.from("reminder_cron_runs").insert({
    trigger_path: triggerPath,
    mode: options.forcedReminderCode ? "forced" : "hourly",
    reminder_code: options.forcedReminderCode || null,
    status,
    sent_count: sent,
    skipped_count: skipped,
    failed_count: failed,
    diagnostics,
    duration_ms: Date.now() - startedAt,
  });

  return error?.message || null;
}

export async function runReminderCron(
  request: Request,
  options: RunReminderCronOptions = {}
) {
  const startedAt = Date.now();
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!botToken || !supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { error: "Missing Telegram or Supabase environment variables" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, telegram_id, first_name, reminders_enabled, reminder_morning_enabled, reminder_water_enabled, reminder_sleep_enabled, timezone"
    )
    .eq("reminders_enabled", true)
    .not("telegram_id", "is", null);

  if (profilesError) {
    const cronLogError = await writeCronRunLog(
      supabase as unknown as CronLogClient,
      request,
      options,
      startedAt,
      0,
      0,
      1,
      [
        {
          profileId: "system",
          reminderCode: options.forcedReminderCode || null,
          stage: "delivery",
          message: profilesError.message,
        },
      ]
    );

    return Response.json(
      { error: profilesError.message, cronLogError },
      { status: 500 }
    );
  }

  const appUrl = getAppUrl(request);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const diagnostics: CronDiagnostic[] = [];

  for (const profile of (profiles || []) as Profile[]) {
    const timeZone = profile.timezone || "Europe/Kyiv";
    const { hour, eventDay } = getLocalDateParts(timeZone);
    const reminder = getReminderForProfile(
      profile,
      hour,
      options.forcedReminderCode
    );

    if (!reminder || !profile.telegram_id) {
      skipped += 1;
      continue;
    }

    const { data: existingDelivery } = await supabase
      .from("reminder_deliveries")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("reminder_code", reminder.code)
      .eq("event_day", eventDay)
      .maybeSingle();

    if (existingDelivery) {
      skipped += 1;
      continue;
    }

    if (reminder.shouldSkipWhenCompleted) {
      const { data: logs } = await supabase
        .from("daily_logs")
        .select("profile_id, task_code")
        .eq("profile_id", profile.id)
        .eq("event_day", eventDay)
        .in("task_code", reminder.taskCodes);
      const completedTasks = new Set(
        ((logs || []) as DailyLog[])
          .map((log) => log.task_code)
          .filter(Boolean) as string[]
      );

      if (hasCompletedAllRelevantTasks(completedTasks, reminder.taskCodes)) {
        skipped += 1;
        continue;
      }
    }

    const telegramResponse = await sendTelegramMessage(
      botToken,
      profile.telegram_id,
      pickReminderText(reminder, profile),
      appUrl
    );

    if (!telegramResponse.ok) {
      if (diagnostics.length < 10) {
        diagnostics.push({
          profileId: profile.id,
          reminderCode: reminder.code,
          stage: "telegram",
          status: telegramResponse.status,
          message: await readResponseText(telegramResponse),
        });
      }

      failed += 1;
      continue;
    }

    const { error: deliveryError } = await supabase
      .from("reminder_deliveries")
      .insert({
        profile_id: profile.id,
        reminder_code: reminder.code,
        event_day: eventDay,
      });

    if (deliveryError) {
      if (diagnostics.length < 10) {
        diagnostics.push({
          profileId: profile.id,
          reminderCode: reminder.code,
          stage: "delivery",
          message: deliveryError.message,
        });
      }

      failed += 1;
      continue;
    }

    sent += 1;
  }

  const cronLogError = await writeCronRunLog(
    supabase as unknown as CronLogClient,
    request,
    options,
    startedAt,
    sent,
    skipped,
    failed,
    diagnostics
  );

  return Response.json({
    ok: true,
    mode: options.forcedReminderCode ? "forced" : "hourly",
    reminder: options.forcedReminderCode || null,
    sent,
    skipped,
    failed,
    diagnostics,
    cronLogError,
  });
}
