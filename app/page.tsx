"use client";

import Image from "next/image";
import {
  Check,
  CircleHelp,
  Gift,
  House,
  ListChecks,
  Pencil,
  Sun,
  Trash2,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
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
  telegram_username?: string | null;
  show_telegram_contact?: boolean | null;
  avatar_url?: string | null;
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
  avatarUrl: string | null;
  points: number;
  totalPoints: number;
  status: ProfileStatus;
  registrationDate: string | null;
  telegramUsername: string | null;
  showTelegramContact: boolean;
  supportCount: number;
  isSupportedByMe: boolean;
};

type LeaderboardMode = "month" | "newcomers";

type TelegramUser = {
  id?: number | string;
  first_name?: string | null;
  username?: string | null;
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
  event_day: string | null;
  profiles:
    | {
        first_name: string | null;
        telegram_id: string | null;
        telegram_username: string | null;
        show_telegram_contact: boolean | null;
        avatar_url: string | null;
        points_total: number | null;
        registration_date: string | null;
      }
    | {
        first_name: string | null;
        telegram_id: string | null;
        telegram_username: string | null;
        show_telegram_contact: boolean | null;
        avatar_url: string | null;
        points_total: number | null;
        registration_date: string | null;
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

type ProfileSupport = {
  target_profile_id: string;
  supporter_profile_id: string;
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

type DailyMotivation = {
  title: string;
  text: string;
};

type BonusTaskTemplate = {
  title: string;
  description: string;
  points: number;
};

type BonusTask = BonusTaskTemplate & {
  code: string;
  cycleDay: number;
  slot: "daily" | "challenge";
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

type ProfileStatus = {
  title: string;
  points: number;
  icon: string;
  description: string;
  bonus: string;
};

type AppTheme = "dark" | "light";

type ProfileAvatarProps = {
  name: string | null | undefined;
  avatarUrl?: string | null;
  className: string;
  textClassName?: string;
};

const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

async function createCroppedAvatar(
  imageUrl: string,
  cropPixels: Area
): Promise<File> {
  const image = new window.Image();
  image.src = imageUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  const size = 640;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available");
  }

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    size,
    size
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("Avatar crop failed")),
      "image/jpeg",
      0.9
    );
  });

  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

function ProfileAvatar({
  name,
  avatarUrl,
  className,
  textClassName = "",
}: ProfileAvatarProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-[#D4AF3C] bg-gradient-to-br from-green-500 to-emerald-800 font-black ${className}`}
    >
      <span className={textClassName}>{(name || "U").slice(0, 1)}</span>
      {avatarUrl && avatarUrl !== failedAvatarUrl && (
        // Supabase Storage URLs are user-generated and loaded directly.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedAvatarUrl(avatarUrl)}
        />
      )}
    </div>
  );
}

function MetallicCrown({
  rank,
  className = "",
}: {
  rank: number;
  className?: string;
}) {
  const palette =
    rank === 1
      ? ["#8A5A08", "#FFE79A", "#D4AF3C", "#9A680E"]
      : rank === 2
        ? ["#71717A", "#FFFFFF", "#D4D4D8", "#8B8B93"]
        : ["#7C2D12", "#FFAA74", "#D95A24", "#8F3215"];
  const gradientId = `crown-metal-${rank}`;

  return (
    <svg
      viewBox="0 0 64 46"
      aria-hidden="true"
      className={className}
      style={{
        filter: `drop-shadow(0 3px 5px ${palette[2]}66)`,
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="18%" stopColor={palette[2]} />
          <stop offset="34%" stopColor={palette[1]} />
          <stop offset="43%" stopColor="#FFFFFF" />
          <stop offset="51%" stopColor={palette[1]} />
          <stop offset="68%" stopColor={palette[2]} />
          <stop offset="84%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[3]} />
        </linearGradient>
        <linearGradient
          id={`${gradientId}-vertical`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".7" />
          <stop offset="28%" stopColor={palette[1]} stopOpacity=".35" />
          <stop offset="58%" stopColor={palette[0]} stopOpacity=".12" />
          <stop offset="100%" stopColor="#000000" stopOpacity=".45" />
        </linearGradient>
      </defs>
      <path
        d="M9 36 6 14l15 12L32 6l11 20 15-12-3 22H9Z"
        fill={`url(#${gradientId})`}
        stroke={palette[2]}
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M9 36 6 14l15 12L32 6l11 20 15-12-3 22H9Z"
        fill={`url(#${gradientId}-vertical)`}
      />
      <path
        d="M9 35h46v7H9z"
        fill={`url(#${gradientId})`}
        stroke={palette[2]}
        strokeWidth="1.25"
      />
      <path
        d="M12 36.5h40"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity=".7"
        strokeWidth="1"
      />
      <path
        d="M13 33h38"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity=".45"
        strokeWidth="1.5"
      />
      <circle cx="6" cy="13" r="3" fill={palette[2]} />
      <circle cx="32" cy="5" r="3.5" fill={palette[2]} />
      <circle cx="58" cy="13" r="3" fill={palette[2]} />
      <circle cx="6" cy="12" r="1" fill="#FFFFFF" fillOpacity=".7" />
      <circle cx="31" cy="4" r="1.2" fill="#FFFFFF" fillOpacity=".75" />
      <circle cx="57" cy="12" r="1" fill="#FFFFFF" fillOpacity=".7" />
    </svg>
  );
}

const PROFILE_STATUSES: ProfileStatus[] = [
  {
    title: "Новачок",
    points: 0,
    icon: "🥉",
    description: "Перший крок у системі. Головне — почати і не зникнути.",
    bonus: "Стартовий доступ до базових завдань",
  },
  {
    title: "Боєць",
    points: 100,
    icon: "🥈",
    description: "Ти вже не просто дивишся. Ти почав діяти щодня.",
    bonus: "Перший статус у профілі",
  },
  {
    title: "Воїн",
    points: 300,
    icon: "🥇",
    description: "Дисципліна стає помітною. Ти тримаєш темп.",
    bonus: "Підсилення в рейтингу статусом",
  },
  {
    title: "Незламний",
    points: 700,
    icon: "⚔️",
    description: "Ти вже маєш характер системної людини.",
    bonus: "Відкриття майбутніх бонусів спільноти",
  },
  {
    title: "Легенда",
    points: 1500,
    icon: "🔥",
    description: "Твій шлях видно по діях, а не по словах.",
    bonus: "Майбутній бейдж у публічному профілі",
  },
  {
    title: "Командир",
    points: 3000,
    icon: "👑",
    description: "Ти можеш вести за собою інших і бути прикладом.",
    bonus: "Майбутній доступ до лідерських челенджів",
  },
  {
    title: "Титан",
    points: 6000,
    icon: "🛡️",
    description: "Стабільність стала твоєю силою, а не випадковістю.",
    bonus: "Майбутній premium-бонус",
  },
  {
    title: "Світлоносний",
    points: 10000,
    icon: "☀️",
    description: "Фінальний статус сили, дисципліни і прикладу для інших.",
    bonus: "Особливий статус легенди NEZLAMNI",
  },
];

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

const DAILY_MOTIVATIONS: DailyMotivation[] = [
  {
    title: "Сила змін в тобі",
    text: "Твій шлях — твоя легенда. Один день, одне рішення, один крок.",
  },
  {
    title: "Почни як воїн",
    text: "Сьогодні ти обираєш не легкість, а силу. І це вже перемога.",
  },
  {
    title: "Твій день — твоя битва",
    text: "Не віддавай цей день хаосу. Забери його діями.",
  },
  {
    title: "Вогонь всередині",
    text: "Ти сильніший, ніж здається. Просто дай собі доказ сьогодні.",
  },
  {
    title: "Крок незламного",
    text: "Не треба стрибати далеко. Достатньо зробити крок, який не зрадиш.",
  },
  {
    title: "Стань опорою собі",
    text: "Коли ти тримаєш слово перед собою, світ всередині стає міцнішим.",
  },
  {
    title: "Не згасай",
    text: "Імпульс уже є. Підкинь у нього дію, і він стане силою.",
  },
  {
    title: "Тіло чує волю",
    text: "Кожна дія сьогодні говорить тілу: ми йдемо вперед.",
  },
  {
    title: "Повернись у стрій",
    text: "День може хитнутись. Але незламний повертається.",
  },
  {
    title: "Половина легенди",
    text: "Ти вже не на старті. Ти в середині шляху, де народжується характер.",
  },
  {
    title: "Тиха перемога",
    text: "Справжня сила не кричить. Вона просто робить своє.",
  },
  {
    title: "Вище слабкості",
    text: "Слабкість просить відкласти. Ти обираєш діяти.",
  },
  {
    title: "Темп переможця",
    text: "Не гори один день. Світи стабільно.",
  },
  {
    title: "Повага в дії",
    text: "Кожен виконаний пункт — це повага до себе, яку видно без слів.",
  },
  {
    title: "Нова норма",
    text: "Те, що було важким, стає твоїм. Так народжується сила.",
  },
  {
    title: "Чесний шлях",
    text: "Не обманюй себе. Чесні дії дають справжній результат.",
  },
  {
    title: "Ти ростеш",
    text: "Навіть коли дзеркало мовчить, характер уже змінюється.",
  },
  {
    title: "Сильний вечір",
    text: "Закрий день так, щоб завтра прокинутись з повагою до себе.",
  },
  {
    title: "Без переговорів",
    text: "Не торгуйся зі слабкістю. Відкрий завдання і забери своє.",
  },
  {
    title: "Фініш видно",
    text: "Саме тут важливо не відпустити. Дотисни день.",
  },
  {
    title: "Стабільність сильних",
    text: "Не ідеальність перемагає. Перемагає повернення.",
  },
  {
    title: "Останній ривок",
    text: "Ще один день до доказу. Покажи собі, ким ти став.",
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
    description: "Закрий свою норму води за день",
  },
];

const FOOD_ITEMS: FoodItem[] = [
  {
    code: "food_protein_armor",
    title: "Білкова броня",
    description:
      "Додай білок у кожен основний прийом їжі: яйця, рибу, мʼясо, сир або бобові.",
    points: 3,
  },
  {
    code: "food_no_snacks",
    title: "Без перекусів",
    description: "Ніяких цукерок, горішків, яблук чи кави з молоком між їжею.",
    points: 2,
  },
  {
    code: "food_three_meals",
    title: "3 основні прийоми їжі",
    description: "Сніданок, обід і вечеря без додаткових прийомів їжі.",
    points: 2,
  },
  {
    code: "food_dinner_before_20",
    title: "Вечеря до 20:00",
    description: "Останній основний прийом їжі не пізніше 20:00.",
    points: 1,
  },
];

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    code: "activity_walk_30",
    title: "Прогулянка 30 хв",
    description: "Приблизно 3000 кроків у спокійному або швидкому темпі.",
    points: 2,
  },
  {
    code: "activity_walk_60_pro",
    title: "Прогулянка 60 хв",
    description: "Приблизно 6000 кроків — сильний рівень денного руху.",
    points: 4,
  },
  {
    code: "activity_walk_90_pro",
    title: "Прогулянка 90 хв",
    description: "Приблизно 9000 кроків — потужний рівень витривалості.",
    points: 6,
  },
  {
    code: "activity_workout_20",
    title: "Тренування / Зарядка 20+ хв",
    description: "Спорт, зарядка, вправи або будь-який свідомий рух.",
    points: 2,
  },
];

const WALK_ACTIVITY_CODES = [
  "activity_walk_30",
  "activity_walk_60_pro",
  "activity_walk_90_pro",
];

const ACTIVITY_GOAL_COUNT = 2;

const NIGHT_ITEMS: NightItem[] = [
  {
    code: "night_sleep_7",
    title: "Сон 7+ годин",
    description:
      "Ранкова перевірка за попередню ніч: спав 7 годин або більше.",
    points: 2,
  },
  {
    code: "night_no_food_after_20",
    title: "Без їжі після 20:00",
    description:
      "За попередню ніч: після 20:00 без їжі та перекусів.",
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
const BONUS_DAY_PLAN: Array<{
  daily: BonusTaskTemplate;
  challenge: BonusTaskTemplate;
}> = [
  {
    daily: {
      title: "Склянка перед вибором",
      description: "Перед наступним прийомом їжі випий склянку води й зачекай 10 хвилин.",
      points: 2,
    },
    challenge: {
      title: "Чесне фото старту",
      description: "Зроби фото прогресу без фільтрів. Воно потрібне тільки для чесного порівняння із собою.",
      points: 3,
    },
  },
  {
    daily: {
      title: "10 хвилин без телефону",
      description: "Поїж один прийом їжі без телефону, відео та стрічки новин.",
      points: 2,
    },
    challenge: {
      title: "Прогулянка після їжі",
      description: "Вийди на спокійну прогулянку щонайменше на 15 хвилин після одного прийому їжі.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Овочевий старт",
      description: "Почни один основний прийом їжі з овочів або салату.",
      points: 2,
    },
    challenge: {
      title: "Солодке під контроль",
      description: "Проведи день без солодких напоїв і цукру в каві або чаї.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Ранкова розминка",
      description: "Зроби 5 хвилин легкої розминки одразу після пробудження.",
      points: 2,
    },
    challenge: {
      title: "Додаткові 2000 кроків",
      description: "Пройди на 2000 кроків більше, ніж зазвичай проходиш у будній день.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Повільні перші укуси",
      description: "Перші п'ять хвилин одного прийому їжі їж повільно й без поспіху.",
      points: 2,
    },
    challenge: {
      title: "Вечір без перекусів",
      description: "Після вечері залиш тільки воду або несолодкий чай.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Білок на сніданок",
      description: "Додай до сніданку яйця, сир, йогурт без цукру, рибу або інше джерело білка.",
      points: 2,
    },
    challenge: {
      title: "20 хвилин сили",
      description: "Зроби 20 хвилин тренування, зарядки або вправ із власною вагою.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Підготуй воду",
      description: "Зранку постав поруч пляшку з денною нормою води.",
      points: 2,
    },
    challenge: {
      title: "План на завтра",
      description: "Увечері заздалегідь виріши, якими будуть три основні прийоми їжі завтра.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Сходи замість ліфта",
      description: "Хоча б один раз сьогодні обери сходи замість ліфта або ескалатора.",
      points: 2,
    },
    challenge: {
      title: "Година активності",
      description: "Збери сумарно 60 хвилин ходьби або іншого руху протягом дня.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Перевір справжній голод",
      description: "Перед незапланованою їжею зупинись і оціни голод за шкалою від 1 до 10.",
      points: 2,
    },
    challenge: {
      title: "День без доставки",
      description: "Приготуй або збери всі основні прийоми їжі самостійно.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Світло зранку",
      description: "Проведи 10 хвилин на денному світлі в першій половині дня.",
      points: 2,
    },
    challenge: {
      title: "Екран на паузу",
      description: "Відклади телефон щонайменше за 30 хвилин до сну.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Корисний запас",
      description: "Підготуй один простий білковий продукт на випадок зайнятого дня.",
      points: 2,
    },
    challenge: {
      title: "Ревізія кухні",
      description: "Прибери з видимого місця продукти, які найчастіше провокують випадкові перекуси.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Пауза після порції",
      description: "Після основної порції зачекай 10 хвилин перед рішенням взяти добавку.",
      points: 2,
    },
    challenge: {
      title: "Без рідких калорій",
      description: "Сьогодні пий воду, чай або каву без цукру та калорійних добавок.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Рух щогодини",
      description: "Тричі за день встань і порухайся хоча б по 3 хвилини.",
      points: 2,
    },
    challenge: {
      title: "Швидка прогулянка",
      description: "Пройди 30 хвилин у темпі, за якого дихання стає помітно активнішим.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Колір на тарілці",
      description: "Додай до одного прийому їжі два різні овочі.",
      points: 2,
    },
    challenge: {
      title: "Домашня вечеря",
      description: "Зроби просту домашню вечерю з білка та овочів.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Хвилина тиші",
      description: "Перед їжею зроби п'ять повільних вдихів і видихів.",
      points: 2,
    },
    challenge: {
      title: "Половина шляху",
      description: "Запиши одну зміну, яку вже помічаєш у дисципліні, тілі або самопочутті.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Вода поруч",
      description: "Кожного разу, коли береш телефон, зроби кілька ковтків води.",
      points: 2,
    },
    challenge: {
      title: "Активний маршрут",
      description: "Обери довший маршрут пішки або вийди з транспорту на одну зупинку раніше.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Чиста кава",
      description: "Одну звичну солодку каву заміни на каву або чай без цукру.",
      points: 2,
    },
    challenge: {
      title: "День без випічки",
      description: "Проведи день без печива, булок, тістечок і солодкої випічки.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Розтяжка ввечері",
      description: "Зроби 7 хвилин спокійної розтяжки перед сном.",
      points: 2,
    },
    challenge: {
      title: "Ранній відбій",
      description: "Ляж спати щонайменше на 30 хвилин раніше, ніж зазвичай.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Менша тарілка",
      description: "Один прийом їжі подай на тарілці меншого розміру.",
      points: 2,
    },
    challenge: {
      title: "Їжа без добавки",
      description: "Усі основні прийоми їжі сьогодні заверши однією порцією.",
      points: 3,
    },
  },
  {
    daily: {
      title: "П'ять хвилин ходьби",
      description: "Коли відчуєш втому, обери коротку ходьбу замість лежання з телефоном.",
      points: 2,
    },
    challenge: {
      title: "Сильні 7000",
      description: "Набери щонайменше 7000 кроків за день.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Спочатку білок",
      description: "В одному прийомі їжі спочатку з'їж білкову частину та овочі.",
      points: 2,
    },
    challenge: {
      title: "Без фастфуду",
      description: "Сьогодні повністю відмовся від фастфуду та снеків.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Подяка тілу",
      description: "Назви одну річ, за яку сьогодні вдячний своєму тілу.",
      points: 2,
    },
    challenge: {
      title: "Тренування без торгу",
      description: "Зроби заплановане тренування навіть у скороченому форматі.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Порядок у холодильнику",
      description: "Постав воду, овочі та білкові продукти на найпомітніше місце.",
      points: 2,
    },
    challenge: {
      title: "Заготовка на два дні",
      description: "Підготуй основу хоча б для двох майбутніх прийомів їжі.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Дихання замість перекусу",
      description: "При емоційному бажанні поїсти зроби хвилину повільного дихання.",
      points: 2,
    },
    challenge: {
      title: "Вечірня прогулянка",
      description: "Заміни 20 хвилин вечірнього екрана на прогулянку.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Одна корисна заміна",
      description: "Заміни калорійний соус, напій або гарнір на легший варіант.",
      points: 2,
    },
    challenge: {
      title: "День простих продуктів",
      description: "Склади меню дня переважно з продуктів без довгого складу на упаковці.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Ранковий план",
      description: "Зранку визнач один точний час для руху або прогулянки.",
      points: 2,
    },
    challenge: {
      title: "9000 кроків",
      description: "Збери 9000 кроків протягом дня у комфортному для себе темпі.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Повільна вечеря",
      description: "Виділи на вечерю щонайменше 15 хвилин і не поспішай.",
      points: 2,
    },
    challenge: {
      title: "Кухня закрита",
      description: "Після вечері прибери їжу та не повертайся до неї до ранку.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Перевір поставу",
      description: "Тричі за день випрями спину, опусти плечі та зроби глибокий вдих.",
      points: 2,
    },
    challenge: {
      title: "30 хвилин для тіла",
      description: "Присвяти 30 хвилин будь-якій активності, яка тобі справді підходить.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Підсумок дня",
      description: "Увечері назви одну дію, якою сьогодні пишаєшся.",
      points: 2,
    },
    challenge: {
      title: "Повтори сильний день",
      description: "Обери найкориснішу дію попередніх днів і свідомо повтори її сьогодні.",
      points: 3,
    },
  },
  {
    daily: {
      title: "Обіцянка наступного циклу",
      description: "Визнач одну звичку, яку точно переносиш у наступні 30 днів.",
      points: 2,
    },
    challenge: {
      title: "Фото і чесний висновок",
      description: "Зроби нове фото прогресу та коротко запиши, що змінилося за цикл.",
      points: 3,
    },
  },
];
const ONBOARDING_STORAGE_KEY = "nezlamni_v2_onboarding_seen";
const FIRST_ACTION_PROMPT_STORAGE_KEY = "nezlamni_first_action_prompt_v2_day";
const FIRST_ACTION_PROMPT_DELAY_MS = 5000;
const THEME_STORAGE_KEY = "nezlamni_app_theme";

function getMonthValue(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function getMonthRange(monthValue: string) {
  const start = new Date(`${monthValue}-01T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function shiftMonth(monthValue: string, shift: number) {
  const date = new Date(`${monthValue}-01T00:00:00`);
  date.setMonth(date.getMonth() + shift);

  return getMonthValue(date);
}

function addDaysToDate(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function getMonthLabel(monthValue: string) {
  const date = new Date(`${monthValue}-01T00:00:00`);

  return new Intl.DateTimeFormat("uk-UA", {
    month: "long",
    year: "numeric",
  }).format(date);
}

const START_INTRO_SLIDES: OnboardingSlide[] = [
  {
    eyebrow: "Ласкаво просимо",
    title: "30-денний шлях до перемоги і контролю.",
    text: "Система допомагає тримати базу схуднення без хаосу: вода, харчування, рух і сон. Ти не вгадуєш, що робити, а щодня робиш прості дії і отримаєш за це бали.",
    bullets: [
      "4 напрямки: вода, їжа, рух, сон",
      "Короткі завдання на кожен день",
      "Завдання виконано — бали отримано",
    ],
  },
  {
    eyebrow: "Як це працює",
    title: "Кожен день ти збираєш бали за завдання для схуднення.",
    text: "Вода, харчування, рух і сон. Відмічай виконане протягом дня, отримуй бали і тримай стабільність (streak).",
    bullets: [
      "Максимум 30 балів на день",
      "Пункти можна додавати поступово",
      "Випадковий вибір можна скасувати",
    ],
  },
  {
    eyebrow: "Твій результат",
    title: "Ти стаєш не ''Ідеальним'', ти стаєш Незламним.",
    text: "Через 30 днів ти побачиш не тільки цифру на вагах, а нову дисципліну: менше хаосу, більше сили, більше поваги до себе.",
    bullets: [
      "Стартуй з анкети",
      "Вкажи поточну вагу і ціль",
      "Почни перший вже день сьогодні",
    ],
  },
];

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    eyebrow: "Що це",
    title: "NEZLAMNI — це щоденна система дисципліни.",
    text: "Система допомагає тримати базу схуднення без хаосу: вода, харчування, рух і сон. Ти не вгадуєш, що робити, а щодня збираєш прості дії.",
    bullets: [
      "4 напрямки: вода, їжа, рух, сон",
      "Короткі завдання на кожен день",
      "Фокус на діях, а не на ідеальності",
    ],
  },
  {
    eyebrow: "Як користуватись",
    title: "Відкривай додаток і відмічай виконане.",
    text: "Можна заходити кілька разів на день. Виконав дію — відмітив її. Згадав пізніше — повернувся і дозаповнив день.",
    bullets: [
      "Натискай на блок завдання",
      "Обирай тільки те, що реально зробив",
      "Випадковий пункт можна скасувати",
    ],
  },
  {
    eyebrow: "Бали і прогрес",
    title: "Максимум за день — 30 балів.",
    text: "Бали показують, як ти тримаєш день. Вони впливають на рейтинг, стабільність (streak) і статус профілю. Не треба ідеально — важливо не випадати.",
    bullets: [
      "Вода — до 5 балів",
      "Харчування — до 8 балів",
      "Активність — до 8 балів",
      "Сон і нічний режим — до 4 балів",
      "Food квест і Sport челендж — до 5 балів",
    ],
  },
  {
    eyebrow: "Коли відмічати",
    title: "Розклади день на прості моменти.",
    text: "Так легше не забути і чесно бачити картину дня. Нагадування в Telegram допоможуть повернутись у потрібний момент.",
    bullets: [
      "Зранку: сон і перша вода",
      "Вдень: вода, їжа і рух",
      "Ввечері: останній прийом їжі і сон",
      "Після дії: одразу забирай свої бали",
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
    accent: "from-[#22c55e] to-[#15803d]",
    glow: "shadow-[0_12px_28px_rgb(34_197_94/0.2)]",
    action: "Я порухався",
  },
  food: {
    emoji: "🥗",
    title: "Харчування",
    description: "Білок, режим і чистий день без перекусів.",
    accent: "from-yellow-300 to-yellow-600",
    glow: "shadow-yellow-500/20",
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
  const [leaderboardMode, setLeaderboardMode] =
    useState<LeaderboardMode>("month");
  const [leaderboardMonth, setLeaderboardMonth] = useState(getMonthValue());
  const [selectedPublicProfile, setSelectedPublicProfile] =
    useState<LeaderboardUser | null>(null);
  const [isSupportSaving, setIsSupportSaving] = useState(false);
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
  const [selectedBonusTask, setSelectedBonusTask] =
    useState<BonusTask | null>(null);
  const [isBonusTaskSaving, setIsBonusTaskSaving] = useState(false);
  const [isStreakInfoOpen, setIsStreakInfoOpen] = useState(false);
  const [rewardToast, setRewardToast] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [isFeedbackSaving, setIsFeedbackSaving] = useState(false);
  const [isReminderTestSending, setIsReminderTestSending] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isStartIntroDone, setIsStartIntroDone] = useState(false);
  const [startIntroStep, setStartIntroStep] = useState(0);
  const [isFirstActionOpen, setIsFirstActionOpen] = useState(false);
  const [isFirstActionSaving, setIsFirstActionSaving] = useState(false);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [avatarCropSource, setAvatarCropSource] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCropPixels, setAvatarCropPixels] = useState<Area | null>(null);
  const [appTheme, setAppTheme] = useState<AppTheme>("dark");

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
  const telegramUsername = tgUser?.username || null;

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
    if (telegramUsername && existing.telegram_username !== telegramUsername) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({ telegram_username: telegramUsername })
        .eq("id", existing.id)
        .select()
        .single();

      if (updated) {
        setProfile(updated);
        return updated as Profile;
      }
    }

    setProfile(existing);
    return existing as Profile;
  }

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      telegram_id: telegramId,
      first_name: tgUser?.first_name || "User",
      telegram_username: telegramUsername,
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

function getProfileStatusByPoints(total: number) {
  return [...PROFILE_STATUSES]
    .reverse()
    .find((status) => total >= status.points) || PROFILE_STATUSES[0];
}

const fetchLeaderboard = useCallback(async () => {
  const { start: monthStart, end: monthEnd } = getMonthRange(leaderboardMonth);
  const newcomerRegistrationStart = addDaysToDate(monthStart, -29);
  const newcomerRegistrationEnd = addDaysToDate(monthEnd, -29);

  const { data, error } = await supabase
    .from("daily_logs")
    .select(
      "profile_id, points, event_day, profiles(first_name, telegram_id, telegram_username, show_telegram_contact, avatar_url, points_total, registration_date)"
    )
    .gte(
      "event_day",
      leaderboardMode === "newcomers" ? newcomerRegistrationStart : monthStart
    )
    .lte("event_day", monthEnd);

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
    const totalPoints = profileData?.points_total || 0;
    const status = getProfileStatusByPoints(totalPoints);
    const registrationDate = profileData?.registration_date || null;
    const telegramUsername = profileData?.telegram_username || null;
    const showTelegramContact = profileData?.show_telegram_contact || false;
    const avatarUrl = profileData?.avatar_url || null;

    if (leaderboardMode === "newcomers") {
      if (!registrationDate || !log.event_day) return;

      const first30EndDate = addDaysToDate(registrationDate, 29);
      const isFirst30EndingInSelectedMonth =
        first30EndDate >= monthStart && first30EndDate <= monthEnd;
      const isLogInsideFirst30Days =
        log.event_day >= registrationDate && log.event_day <= first30EndDate;
      const isRegistrationInExpectedRange =
        registrationDate >= newcomerRegistrationStart &&
        registrationDate <= newcomerRegistrationEnd;

      if (
        !isRegistrationInExpectedRange ||
        !isFirst30EndingInSelectedMonth ||
        !isLogInsideFirst30Days
      ) {
        return;
      }
    }

    const existing = map.get(profileId);

    if (existing) {
      existing.points += log.points || 0;
    } else {
      map.set(profileId, {
        profile_id: profileId,
        name,
        avatarUrl,
        points: log.points || 0,
        totalPoints,
        status,
        registrationDate,
        telegramUsername,
        showTelegramContact,
        supportCount: 0,
        isSupportedByMe: false,
      });
    }
  });

  const sortedProfiles = Array.from(map.values());
  const profileIds = sortedProfiles.map((user) => user.profile_id);

  if (profileIds.length > 0) {
    const { data: supports, error: supportsError } = await supabase
      .from("profile_supports")
      .select("target_profile_id, supporter_profile_id")
      .in("target_profile_id", profileIds);

    if (!supportsError) {
      const supportRows = (supports || []) as ProfileSupport[];
      const supportCounts = new Map<string, number>();

      supportRows.forEach((support) => {
        supportCounts.set(
          support.target_profile_id,
          (supportCounts.get(support.target_profile_id) || 0) + 1
        );
      });

      sortedProfiles.forEach((user) => {
        user.supportCount = supportCounts.get(user.profile_id) || 0;
        user.isSupportedByMe = supportRows.some(
          (support) =>
            support.target_profile_id === user.profile_id &&
            support.supporter_profile_id === profile?.id
        );
      });
    }
  }

  const sorted = sortedProfiles
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  setLeaderboard(sorted);
}, [leaderboardMode, leaderboardMonth, profile?.id, showLoadError]);

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
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

      if (savedTheme === "light" || savedTheme === "dark") {
        setAppTheme(savedTheme);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, appTheme);
    document.body.classList.toggle("theme-dark", appTheme === "dark");
    document.body.classList.toggle("theme-light", appTheme === "light");
  }, [appTheme]);

  useEffect(() => {
    if (!profile) return;

    const timer = window.setTimeout(() => {
      void fetchLeaderboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchLeaderboard, profile]);

  useEffect(() => {
    if (
      !profile ||
      !profile.start_weight ||
      !profile.target_weight ||
      activeTab !== "home" ||
      isOnboardingOpen ||
      isFirstActionOpen
    ) {
      return;
    }

    const todayDate = today();
    const dismissedDay = window.localStorage.getItem(
      FIRST_ACTION_PROMPT_STORAGE_KEY
    );

    if (dismissedDay === todayDate) return;

    const timer = window.setTimeout(() => {
      setIsFirstActionOpen(true);
    }, FIRST_ACTION_PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    completedTaskCodes,
    isFirstActionOpen,
    isOnboardingOpen,
    profile,
  ]);

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
  setActiveTab("home");
  window.localStorage.removeItem(FIRST_ACTION_PROMPT_STORAGE_KEY);
  window.setTimeout(() => {
    setIsFirstActionOpen(true);
  }, FIRST_ACTION_PROMPT_DELAY_MS);
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

  function getBonusCycleDay() {
    return ((getDaysWithUs() - 1) % BONUS_DAY_PLAN.length) + 1;
  }

  function getDailyBonusTasks(): BonusTask[] {
    const cycleDay = getBonusCycleDay();
    const plan = BONUS_DAY_PLAN[cycleDay - 1];

    return [
      {
        ...plan.daily,
        code: `bonus_day_${cycleDay}_daily`,
        cycleDay,
        slot: "daily",
      },
      {
        ...plan.challenge,
        code: `bonus_day_${cycleDay}_challenge`,
        cycleDay,
        slot: "challenge",
      },
    ];
  }

  function getDailyMotivation() {
    const dayIndex = (getDaysWithUs() - 1) % DAILY_MOTIVATIONS.length;

    return DAILY_MOTIVATIONS[dayIndex];
  }

  function getLevel() {
    const status = getCurrentProfileStatus();

    return `${status.icon} ${status.title}`;
  }

  function getCurrentProfileStatus() {
    const total = profile?.points_total || 0;

    return getProfileStatusByPoints(total);
  }

  function getNextProfileStatus() {
    const total = profile?.points_total || 0;

    return PROFILE_STATUSES.find((status) => status.points > total) || null;
  }

  function getProfileStatusProgress() {
    const total = profile?.points_total || 0;
    const currentStatus = getCurrentProfileStatus();
    const nextStatus = getNextProfileStatus();

    if (!nextStatus) return 100;

    const distance = nextStatus.points - currentStatus.points;
    const earned = total - currentStatus.points;

    return Math.min(100, Math.max(0, Math.round((earned / distance) * 100)));
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
    const hasWalk = WALK_ACTIVITY_CODES.some((code) =>
      completedTaskCodes.includes(code)
    );
    const hasWorkout = completedTaskCodes.includes("activity_workout_20");

    return Number(hasWalk) + Number(hasWorkout);
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
      title: "Прогрес дня",
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
      action: "Подивитись статус",
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

  function toggleAppTheme() {
    setAppTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
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

  async function updateTelegramContactVisibility(value: boolean) {
    if (!profile) return;

    const { data, error } = await supabase
      .from("profiles")
      .update({ show_telegram_contact: value })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      showSaveError("update telegram contact visibility", error);
      return;
    }

    setProfile(data as Profile);
    setMessage(
      value
        ? "Telegram-контакт відкрито у публічному профілі."
        : "Telegram-контакт приховано."
    );
    await fetchLeaderboard();
  }

  function closeAvatarCrop() {
    if (avatarCropSource) {
      URL.revokeObjectURL(avatarCropSource);
    }

    setAvatarCropSource(null);
    setAvatarCrop({ x: 0, y: 0 });
    setAvatarZoom(1);
    setAvatarCropPixels(null);
  }

  function selectAvatarFile(file: File) {
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setMessage("Обери фото у форматі JPG, PNG або WebP.");
      return;
    }

    if (file.size > AVATAR_MAX_SIZE) {
      setMessage("Фото завелике. Максимальний розмір — 5 МБ.");
      return;
    }

    if (avatarCropSource) {
      URL.revokeObjectURL(avatarCropSource);
    }

    setAvatarCropSource(URL.createObjectURL(file));
    setAvatarCrop({ x: 0, y: 0 });
    setAvatarZoom(1);
    setAvatarCropPixels(null);
  }

  async function saveCroppedAvatar() {
    if (!avatarCropSource || !avatarCropPixels || isAvatarSaving) return;

    try {
      const file = await createCroppedAvatar(
        avatarCropSource,
        avatarCropPixels
      );
      const isSaved = await uploadProfileAvatar(file);

      if (isSaved) {
        closeAvatarCrop();
      }
    } catch (error) {
      showSaveError("crop profile avatar", error);
    }
  }

  async function uploadProfileAvatar(file: File) {
    if (!profile || isAvatarSaving) return false;

    setIsAvatarSaving(true);

    const avatarPath = `${profile.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatarPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      setIsAvatarSaving(false);
      showSaveError("upload profile avatar", uploadError);
      return false;
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(avatarPath);
    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    const { data, error: updateProfileError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id)
      .select()
      .single();

    setIsAvatarSaving(false);

    if (updateProfileError) {
      showSaveError("save profile avatar", updateProfileError);
      return false;
    }

    setProfile(data as Profile);
    setMessage("Фото профілю оновлено.");
    await fetchLeaderboard();
    return true;
  }

  async function deleteProfileAvatar() {
    if (!profile?.avatar_url || isAvatarSaving) return;

    setIsAvatarSaving(true);

    const avatarPath = `${profile.id}/avatar`;
    const { error: storageError } = await supabase.storage
      .from("avatars")
      .remove([avatarPath]);

    if (storageError) {
      setIsAvatarSaving(false);
      showSaveError("delete profile avatar", storageError);
      return;
    }

    const { data, error: updateProfileError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profile.id)
      .select()
      .single();

    setIsAvatarSaving(false);

    if (updateProfileError) {
      showSaveError("clear profile avatar", updateProfileError);
      return;
    }

    setProfile(data as Profile);
    setMessage("Фото профілю видалено.");
    await fetchLeaderboard();
  }

  async function saveProfileName() {
    if (!profile || isNameSaving) return;

    const nextName = profileNameDraft.trim().replace(/\s+/g, " ");
    if (nextName.length < 2) {
      setMessage("Ім’я має містити щонайменше 2 символи.");
      return;
    }

    setIsNameSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ first_name: nextName })
      .eq("id", profile.id)
      .select()
      .single();

    setIsNameSaving(false);

    if (error || !data) {
      showSaveError("update profile name", error);
      return;
    }

    setProfile(data as Profile);
    setIsNameEditing(false);
    setMessage("Ім’я оновлено.");
    await fetchLeaderboard();
  }

  async function toggleProfileSupport(user: LeaderboardUser) {
    if (!profile || isSupportSaving || user.profile_id === profile.id) return;

    setIsSupportSaving(true);

    if (user.isSupportedByMe) {
      const { error } = await supabase
        .from("profile_supports")
        .delete()
        .eq("target_profile_id", user.profile_id)
        .eq("supporter_profile_id", profile.id);

      setIsSupportSaving(false);

      if (error) {
        showSaveError("remove profile support", error);
        return;
      }

      updateLocalSupport(user.profile_id, false);
      setMessage("Підтримку прибрано.");
      return;
    }

    const { error } = await supabase.from("profile_supports").insert({
      target_profile_id: user.profile_id,
      supporter_profile_id: profile.id,
    });

    setIsSupportSaving(false);

    if (error && !isDuplicateLogError(error)) {
      showSaveError("add profile support", error);
      return;
    }

    updateLocalSupport(user.profile_id, true);
    setMessage("Підтримка додана.");
  }

  function updateLocalSupport(profileId: string, isSupported: boolean) {
    setLeaderboard((currentUsers) =>
      currentUsers.map((user) =>
        user.profile_id === profileId
          ? {
              ...user,
              isSupportedByMe: isSupported,
              supportCount: Math.max(
                0,
                user.supportCount + (isSupported ? 1 : -1)
              ),
            }
          : user
      )
    );
    setSelectedPublicProfile((currentUser) =>
      currentUser?.profile_id === profileId
        ? {
            ...currentUser,
            isSupportedByMe: isSupported,
            supportCount: Math.max(
              0,
              currentUser.supportCount + (isSupported ? 1 : -1)
            ),
          }
        : currentUser
    );
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

  async function completeFirstWaterAction() {
    if (!profile || isFirstActionSaving) return;

    if (completedTaskCodes.includes("water_wakeup")) {
      window.localStorage.setItem(FIRST_ACTION_PROMPT_STORAGE_KEY, today());
      setIsFirstActionOpen(false);
      setMessage("Перший бал уже твій. Продовжуй день.");
      return;
    }

    setIsFirstActionSaving(true);

    const todayDate = today();
    const { data: existingLogs, error: existingLogsError } = await supabase
      .from("daily_logs")
      .select("task_code")
      .eq("profile_id", profile.id)
      .eq("task_code", "water_wakeup")
      .eq("event_day", todayDate);

    if (existingLogsError) {
      setIsFirstActionSaving(false);
      showLoadError("check first water action", existingLogsError);
      return;
    }

    if (existingLogs && existingLogs.length > 0) {
      setCompletedTaskCodes((currentCodes) =>
        currentCodes.includes("water_wakeup")
          ? currentCodes
          : [...currentCodes, "water_wakeup"]
      );
      setIsFirstActionSaving(false);
      setIsFirstActionOpen(false);
      window.localStorage.setItem(FIRST_ACTION_PROMPT_STORAGE_KEY, todayDate);
      setMessage("Перший бал уже твій. Продовжуй день.");
      return;
    }

    const { error: insertLogError } = await supabase.from("daily_logs").insert({
      profile_id: profile.id,
      task_code: "water_wakeup",
      points: 1,
      event_day: todayDate,
    });

    if (insertLogError) {
      setIsFirstActionSaving(false);

      if (isDuplicateLogError(insertLogError)) {
        await syncProfileStats(profile.id);
        setCompletedTaskCodes((currentCodes) =>
          currentCodes.includes("water_wakeup")
            ? currentCodes
            : [...currentCodes, "water_wakeup"]
        );
        setIsFirstActionOpen(false);
        window.localStorage.setItem(FIRST_ACTION_PROMPT_STORAGE_KEY, todayDate);
        setMessage("Перший бал уже твій. Продовжуй день.");
        return;
      }

      showSaveError("save first water action", insertLogError);
      return;
    }

    const { data, error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        points_today: profile.points_today + 1,
        points_total: profile.points_total + 1,
        streak_current:
          profile.last_activity_date === todayDate
            ? profile.streak_current || 1
            : 1,
        last_activity_date: todayDate,
      })
      .eq("id", profile.id)
      .select()
      .single();

    setIsFirstActionSaving(false);

    if (updateProfileError) {
      showSaveError("update profile after first water action", updateProfileError);
      await syncProfileStats(profile.id);
      return;
    }

    setProfile(data);
    setCompletedTaskCodes((currentCodes) => [...currentCodes, "water_wakeup"]);
    setIsFirstActionOpen(false);
    setActiveTab("home");
    window.localStorage.setItem(FIRST_ACTION_PROMPT_STORAGE_KEY, todayDate);
    setMessage("Перший бал твій. Ти вже в грі.");
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
    const isWalkItem = WALK_ACTIVITY_CODES.includes(item.code);

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

    const currentWalkItem = isWalkItem
      ? ACTIVITY_ITEMS.find(
          (activityItem) =>
            WALK_ACTIVITY_CODES.includes(activityItem.code) &&
            completedTaskCodes.includes(activityItem.code)
        )
      : null;

    if (isWalkItem && currentWalkItem) {
      const { error: deleteWalkLogsError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("profile_id", profile.id)
        .eq("event_day", todayDate)
        .in("task_code", WALK_ACTIVITY_CODES);

      if (deleteWalkLogsError) {
        showSaveError("replace activity walk item", deleteWalkLogsError);
        return;
      }

      const { error: insertWalkLogError } = await supabase
        .from("daily_logs")
        .insert({
          profile_id: profile.id,
          task_code: item.code,
          points: item.points,
          event_day: todayDate,
        });

      if (insertWalkLogError) {
        showSaveError("save replacement activity walk item", insertWalkLogError);
        await syncProfileStats(profile.id);
        return;
      }

      const pointsDelta = item.points - currentWalkItem.points;
      const { data, error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          points_today: Math.max(0, profile.points_today + pointsDelta),
          points_total: Math.max(0, profile.points_total + pointsDelta),
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateProfileError) {
        showSaveError("update profile after activity walk replacement", updateProfileError);
        await syncProfileStats(profile.id);
        return;
      }

      setProfile(data);
      setCompletedTaskCodes((currentCodes) => [
        ...currentCodes.filter((code) => !WALK_ACTIVITY_CODES.includes(code)),
        item.code,
      ]);
      setMessage(
        `⚡ Прогулянку оновлено: ${item.title} ${pointsDelta >= 0 ? "+" : ""}${pointsDelta} бали`
      );
      if (pointsDelta > 0) {
        showRewardToast(pointsDelta);
      }
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

  async function completeBonusTask(task: BonusTask) {
    if (!profile || isBonusTaskSaving) return;

    if (completedTaskCodes.includes(task.code)) {
      setMessage("Це бонусне завдання вже виконано сьогодні.");
      setSelectedBonusTask(null);
      return;
    }

    setIsBonusTaskSaving(true);

    const { error } = await supabase.from("daily_logs").insert({
      profile_id: profile.id,
      task_code: task.code,
      points: task.points,
      event_day: today(),
    });

    if (error) {
      setIsBonusTaskSaving(false);

      if (isDuplicateLogError(error)) {
        setCompletedTaskCodes((currentCodes) =>
          currentCodes.includes(task.code)
            ? currentCodes
            : [...currentCodes, task.code]
        );
        setSelectedBonusTask(null);
        setMessage("Це бонусне завдання вже виконано сьогодні.");
        await syncProfileStats(profile.id);
        return;
      }

      showSaveError("complete bonus task", error);
      return;
    }

    setCompletedTaskCodes((currentCodes) => [...currentCodes, task.code]);
    setSelectedBonusTask(null);
    setIsBonusTaskSaving(false);
    setMessage(`Бонус виконано: +${task.points} балів`);
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
                  ? "Хочу стати Незламним"
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
              placeholder="Старт : твоя вага зараз "
              type="number"
              value={startWeight}
              onChange={(e) => setStartWeight(e.target.value)}
            />

            <input
              className="w-full rounded-xl p-3 bg-zinc-800"
              placeholder="Перемога : бажана вага "
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
  const isActivityCompleted = activityPointsEarned >= 8;
  const nightCompletedCount = getNightCompletedCount();
  const nightPointsEarned = getNightPointsEarned();
  const isNightCompleted = nightCompletedCount === NIGHT_ITEMS.length;
  const dailyBonusTasks = getDailyBonusTasks();
  const bonusPointsEarned = dailyBonusTasks.reduce(
    (sum, task) =>
      completedTaskCodes.includes(task.code) ? sum + task.points : sum,
    0
  );
  const dayPoints =
    waterCompletedCount +
    foodPointsEarned +
    activityPointsEarned +
    nightPointsEarned +
    bonusPointsEarned;
  const dayProgress = Math.min(
    100,
    Math.round((dayPoints / DAILY_POINTS_MAX) * 100)
  );
  const dayStatus = getDayStatus(dayPoints);
  const todayFocus = getTodayFocus();
  const dailyMotivation = getDailyMotivation();
  const currentProfileStatus = getCurrentProfileStatus();
  const nextProfileStatus = getNextProfileStatus();
  const profileStatusProgress = getProfileStatusProgress();
  const taskSummaries = [
    {
      code: "night",
      meta: TASK_META.night,
      points: nightPointsEarned,
      maxPoints: 4,
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
      maxPoints: 8,
      progress: foodCompletedCount,
      total: FOOD_ITEMS.length,
      isCompleted: isFoodCompleted,
      onClick: () => setIsFoodModalOpen(true),
    },
    {
      code: "activity",
      meta: TASK_META.activity,
      points: activityPointsEarned,
      maxPoints: 8,
      progress: activityCompletedCount,
      total: ACTIVITY_GOAL_COUNT,
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
  const podiumUsers = [
    topUsers[1] ? { user: topUsers[1], rank: 2 } : null,
    topUsers[0] ? { user: topUsers[0], rank: 1 } : null,
    topUsers[2] ? { user: topUsers[2], rank: 3 } : null,
  ].filter(
    (entry): entry is { user: LeaderboardUser; rank: number } => entry !== null
  );
  const restUsers = leaderboard.slice(3, 10);
  const onboardingSlide = ONBOARDING_SLIDES[onboardingStep];
  const isFirstWaterActionDone = completedTaskCodes.includes("water_wakeup");

  return (
    <main
      className={`app-shell theme-${appTheme} min-h-screen bg-black p-5 pb-28 text-white`}
    >
      {rewardToast && (
        <div className="reward-toast fixed inset-x-8 top-4 z-[60] mx-auto max-w-xs rounded-xl border border-green-400/40 bg-green-500 px-4 py-3 text-center text-sm font-black text-white shadow-xl shadow-green-500/30">
          {rewardToast}
        </div>
      )}

      {isStreakInfoOpen && (
        <div
          className="fixed inset-0 z-[65] grid place-items-center bg-black/70 p-5"
          onClick={() => setIsStreakInfoOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="streak-info-title"
            className="w-full max-w-xs rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-orange-300">
                  Серія днів
                </p>
                <h2 id="streak-info-title" className="mt-1 text-xl font-black">
                  Що таке streak?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsStreakInfoOpen(false)}
                aria-label="Закрити пояснення"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-800 text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Це кількість днів поспіль, коли ти виконав хоча б одне завдання.
              Продовжуй щодня, щоб серія не обнулилася.
            </p>
          </div>
        </div>
      )}

      {avatarCropSource && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/85 px-4 pb-4">
          <section className="mx-auto w-full max-w-md rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black">Обрізати фото</h2>
              <button
                type="button"
                onClick={closeAvatarCrop}
                disabled={isAvatarSaving}
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-xl disabled:opacity-50"
                aria-label="Закрити"
              >
                ×
              </button>
            </div>

            <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-2xl bg-black">
              <Cropper
                image={avatarCropSource}
                crop={avatarCrop}
                zoom={avatarZoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setAvatarCrop}
                onZoomChange={setAvatarZoom}
                onCropComplete={(_, croppedAreaPixels) =>
                  setAvatarCropPixels(croppedAreaPixels)
                }
              />
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-bold text-zinc-400">Масштаб</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={avatarZoom}
                onChange={(event) => setAvatarZoom(Number(event.target.value))}
                className="mt-2 w-full accent-red-500"
              />
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeAvatarCrop}
                disabled={isAvatarSaving}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 p-3 font-black text-zinc-300 disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => void saveCroppedAvatar()}
                disabled={!avatarCropPixels || isAvatarSaving}
                className="rounded-2xl bg-red-600 p-3 font-black text-white disabled:opacity-50"
              >
                {isAvatarSaving ? "Зберігаємо..." : "Зберегти"}
              </button>
            </div>
          </section>
        </div>
      )}

      {isFirstActionOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/80 px-4 pb-4">
          <section className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-cyan-400/30 bg-zinc-950 shadow-2xl shadow-cyan-950/30">
            <div className="bg-gradient-to-br from-cyan-500/20 via-zinc-950 to-green-500/20 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  Як це працює
                </p>
                <div className="rounded-full border border-green-400/40 bg-green-500/10 px-3 py-1 text-sm font-black text-green-300">
                  +1 бал
                </div>
              </div>

              <div className="mt-5 flex items-end gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.5rem] bg-cyan-400/15 text-5xl shadow-inner shadow-cyan-950/40">
                  💧
                </div>
                <div>
                  <h2 className="text-3xl font-black leading-tight">
                    Система проста: дія → бали → прогрес.
                  </h2>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                Щодня ти відмічаєш воду, харчування, рух і сон. Не треба бути
                ідеальним — треба робити маленькі кроки і збирати бали.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["1", "Випий"],
                  ["2", "Натисни"],
                  ["3", "Погнали"],
                ].map(([step, label], index) => (
                  <div
                    key={step}
                    className={`rounded-2xl border p-3 text-center ${
                      index === 0
                        ? "border-cyan-400/50 bg-cyan-400/10"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <p className="text-lg font-black">{step}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-green-500/25 bg-green-950/25 p-4">
                <p className="text-sm font-black text-green-300">
                  Перше завдання прямо зараз
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                  Випий склянку води. Ми зарахуємо пункт “Після пробудження”
                  і додамо перший бал до твого дня.
                </p>
              </div>

              {isFirstWaterActionDone && (
                <div className="rounded-2xl border border-cyan-400/25 bg-cyan-950/25 p-4 text-sm font-bold text-cyan-200">
                  Перший бал уже зараховано сьогодні. Можеш продовжувати день
                  з головного екрану.
                </div>
              )}

              <button
                onClick={completeFirstWaterAction}
                disabled={isFirstActionSaving}
                className="w-full rounded-2xl bg-green-600 p-4 text-base font-black shadow-lg shadow-green-950/40 disabled:opacity-50"
              >
                {isFirstActionSaving
                  ? "Зараховуємо..."
                  : isFirstWaterActionDone
                    ? "Показати головну"
                    : "Погнали: випив воду +1"}
              </button>

              <button
                onClick={() => {
                  window.localStorage.setItem(
                    FIRST_ACTION_PROMPT_STORAGE_KEY,
                    today()
                  );
                  setIsFirstActionOpen(false);
                }}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm font-bold text-zinc-300"
              >
                Зроблю це пізніше
              </button>
            </div>
          </section>
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
          <div className="space-y-3">
            <header className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">
                  Power of
                </p>
                <h1 className="text-3xl font-black sm:text-4xl">NEZLAMNI</h1>
              </div>

              <button
                onClick={openOnboarding}
                className="help-pulse mb-0.5 shrink-0 rounded-full border border-red-500/35 bg-red-950/30 px-3 py-2 text-[10px] font-black text-red-300 sm:text-xs"
              >
                Як все працює?
              </button>

              <button
                onClick={toggleAppTheme}
                role="switch"
                aria-checked={appTheme === "light"}
                aria-label={
                  appTheme === "dark"
                    ? "Увімкнути світлу тему"
                    : "Увімкнути темну тему"
                }
                className="theme-toggle relative h-11 w-20 shrink-0 rounded-full border border-zinc-800 bg-zinc-900 p-1 shadow-lg"
              >
                <span
                  className={`absolute left-1 top-1 h-9 w-9 rounded-full bg-green-500 shadow-lg shadow-green-950/30 transition-transform ${
                    appTheme === "light" ? "translate-x-9" : "translate-x-0"
                  }`}
                />
                <span className="relative z-10 grid h-full grid-cols-2 place-items-center text-[#D4AF3C]">
                  <span
                    className="grid place-items-center"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-[18px] w-[18px]"
                    >
                      <path
                        d="M18.8 3.2C11.2 4.1 8.1 13.8 14 18.8c2 1.7 4.7 2.2 7 1.3-2 2.1-4.9 3.4-8 3.1C6.8 22.6 2.2 17.1 2.8 10.9 3.4 4.7 8.9.1 15.1.8c1.4.2 2.6 1 3.7 2.4Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span
                    className="grid place-items-center"
                  >
                    <Sun
                      size={18}
                      strokeWidth={1.6}
                      fill="currentColor"
                    />
                  </span>
                </span>
              </button>
            </header>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)_auto] gap-x-4 gap-y-3">
                <div className="relative h-20 w-20 shrink-0">
                  <div className="metallic-gold-ring rounded-full p-[2px]">
                    <ProfileAvatar
                      name={profile.first_name}
                      avatarUrl={profile.avatar_url}
                      className="h-[76px] w-[76px] !border-0"
                      textClassName="text-3xl"
                    />
                  </div>
                  <label
                    title={
                      profile.avatar_url ? "Замінити фото" : "Додати фото"
                    }
                    aria-label={
                      profile.avatar_url ? "Замінити фото" : "Додати фото"
                    }
                    className={`metallic-gold-ring absolute bottom-1 right-0 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full p-px ${
                      isAvatarSaving ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <Image
                      src="/icons/camera-profile-v3.svg"
                      alt=""
                      width={16}
                      height={16}
                      className="block h-4 w-4 object-contain"
                    />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={isAvatarSaving}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) selectAvatarFile(file);
                      }}
                    />
                  </label>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-400">Вітаємо,</p>
                  <h2 className="truncate text-2xl font-black">
                    {profile.first_name || "друже"}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-green-400">
                    {getLevel()}
                  </p>
                </div>

                <div className="row-span-2 self-stretch overflow-hidden rounded-2xl border border-zinc-800 bg-black/20 text-center">
                  <div className="px-3 py-2">
                    <p className="text-2xl font-black">
                      {profile.streak_current || 0}
                    </p>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <p className="text-xs font-bold text-orange-300">
                        streak
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsStreakInfoOpen(true)}
                        aria-label="Що таке streak?"
                        className="grid h-4 w-4 place-items-center rounded-full text-orange-300 transition hover:text-orange-200"
                      >
                        <CircleHelp size={13} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-zinc-800 px-3 py-2">
                    <p className="text-xs font-bold uppercase text-green-400">
                      Загальні
                    </p>
                    <p className="text-2xl font-black">
                      {profile.points_total || 0}
                    </p>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-400">
                      Прогрес дня
                    </span>
                    <span className="text-xs font-black text-orange-300">
                      {dayPoints}/{DAILY_POINTS_MAX}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${dayProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-end justify-between">
                <h2 className="min-w-0 whitespace-nowrap text-sm font-black">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-orange-300">
                    Основні
                  </span>
                  <span className="text-zinc-600"> · </span>
                  <span>Завдання на сьогодні</span>
                </h2>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-bold text-zinc-300"
                >
                  {completedCount}/{tasks.length}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                  const earnedPoints = isWaterTask
                    ? waterCompletedCount
                    : isFoodTask
                      ? foodPointsEarned
                      : isActivityTask
                        ? activityPointsEarned
                        : isNightTask
                          ? nightPointsEarned
                          : isCompleted
                            ? task.points
                            : 0;
                  const maxPoints = isWaterTask
                    ? 5
                    : isFoodTask
                      ? 8
                      : isActivityTask
                        ? 8
                        : isNightTask
                          ? 4
                          : task.points;
                  const progressPercent = isWaterTask
                    ? (waterCompletedCount / 5) * 100
                    : isFoodTask
                      ? (foodPointsEarned / 8) * 100
                      : isActivityTask
                        ? (activityPointsEarned / 8) * 100
                        : isNightTask
                          ? (nightPointsEarned / 4) * 100
                          : isCompleted
                            ? 100
                            : 0;
                  return (
                    <button
                      key={task.id}
                      onClick={() => completeTask(task)}
                      className={`relative flex min-h-[78px] w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-2.5 text-left shadow-lg transition active:scale-[0.98] ${meta.glow} ${
                        isCompleted ? "text-white ring-1 ring-white/20" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${meta.accent} text-base shadow-lg`}
                        >
                          {isCompleted ? "✓" : meta.emoji}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black leading-none text-orange-300">
                            {earnedPoints}/{maxPoints}
                          </p>
                          <p className="text-[10px] text-zinc-400">балів</p>
                        </div>
                      </div>

                      <div className="mt-1.5 min-w-0">
                        <h3 className="truncate text-sm font-black leading-tight">
                          {meta.title}
                        </h3>
                      </div>

                      <div className="mt-auto pt-1.5">
                        <div className="h-1 overflow-hidden rounded-full bg-black/30">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${meta.accent}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <div className="mb-2">
                  <h3 className="min-w-0 whitespace-nowrap text-sm font-black">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-orange-300">
                      Додаткові можливості
                    </span>
                    <span className="text-zinc-600"> · </span>
                    <span>Бонусні завдання</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {dailyBonusTasks.map((bonus) => {
                    const isCompleted = completedTaskCodes.includes(bonus.code);
                    const label =
                      bonus.slot === "daily"
                        ? "Food квест"
                        : "Sport челендж";
                    const meta =
                      bonus.slot === "daily"
                        ? TASK_META.food
                        : TASK_META.activity;

                    return (
                      <button
                        type="button"
                        key={bonus.code}
                        onClick={() => setSelectedBonusTask(bonus)}
                        className={`relative min-h-[82px] overflow-hidden rounded-2xl border p-2.5 text-left transition active:scale-[0.98] ${
                          isCompleted
                            ? "border-[#D4AF3C]/50 bg-[#D4AF3C]/10"
                            : "border-zinc-800 bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${meta.accent} text-base shadow-lg`}
                          >
                            {isCompleted ? "✓" : meta.emoji}
                          </span>
                          <span className="text-right">
                            <span className="block text-xl font-black leading-none text-orange-300">
                              {isCompleted ? bonus.points : 0}/{bonus.points}
                            </span>
                            <span className="block text-[10px] text-zinc-400">
                              балів
                            </span>
                          </span>
                        </div>
                        <p className="mt-2 truncate text-xs font-black">
                          {label}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                          {isCompleted ? "Виконано" : bonus.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-green-950 p-3">
              <p className="text-xs font-bold text-orange-300">
                Мотивація дня
              </p>
              <h2 className="mt-1 text-lg font-black">
                {dailyMotivation.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-300">
                {dailyMotivation.text}
              </p>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">Що покращити?</h2>
                <p className="shrink-0 text-right text-xs font-bold text-red-400">
                  Коментар розробникам
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Напиши, якщо щось незручно, незрозуміло або зламалось.
              </p>

              <textarea
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Наприклад: не зрозумів, як зарахувати воду..."
                className="mt-3 w-full resize-none rounded-2xl border border-zinc-800 bg-black/40 p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-green-500"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">
                  {feedbackText.trim().length}/1000
                </span>
                <button
                  onClick={submitFeedback}
                  disabled={isFeedbackSaving || feedbackText.trim().length < 3}
                  className="feedback-submit rounded-full bg-green-600 px-5 py-2.5 text-sm font-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                  {isFeedbackSaving ? "Зберігаю..." : "Надіслати"}
                </button>
              </div>
            </section>
          </div>
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
              <span />
            </header>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="grid grid-cols-2 rounded-2xl bg-zinc-950 p-1 text-sm font-black">
                <button
                  onClick={() => setLeaderboardMode("month")}
                  className={`rounded-xl px-3 py-2 ${
                    leaderboardMode === "month"
                      ? "bg-green-500 text-zinc-950"
                      : "text-zinc-400"
                  }`}
                >
                  Місяць
                </button>
                <button
                  onClick={() => setLeaderboardMode("newcomers")}
                  className={`rounded-xl px-3 py-2 ${
                    leaderboardMode === "newcomers"
                      ? "bg-green-500 text-zinc-950"
                      : "text-zinc-400"
                  }`}
                >
                  Перші 30 днів
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() =>
                    setLeaderboardMonth((currentMonth) =>
                      shiftMonth(currentMonth, -1)
                    )
                  }
                  className="grid h-10 w-10 place-items-center rounded-full bg-zinc-800 text-xl"
                >
                  ‹
                </button>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase text-green-400">
                    {leaderboardMode === "month"
                      ? "Рейтинг місяця"
                      : "Перші 30 днів"}
                  </p>
                  <p className="text-lg font-black capitalize">
                    {getMonthLabel(leaderboardMonth)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setLeaderboardMonth((currentMonth) =>
                      shiftMonth(currentMonth, 1)
                    )
                  }
                  className="grid h-10 w-10 place-items-center rounded-full bg-zinc-800 text-xl"
                >
                  ›
                </button>
              </div>

              <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
                {leaderboardMode === "month"
                  ? "Місця рахуються за календарний місяць."
                  : "Тут учасники, у яких у цьому місяці завершуються перші 30 днів."}
              </p>
            </section>

            {topUsers.length > 0 && (
              <section className="grid grid-cols-3 items-end gap-2 px-1 pt-4">
                {podiumUsers.map(({ user, rank }) => {
                  const isWinner = rank === 1;
                  const rankStyles =
                    rank === 1
                      ? {
                          ring:
                            "linear-gradient(135deg, #704500 0%, #D4AF3C 26%, #FFF4B0 48%, #D4AF3C 68%, #7A4A00 100%)",
                          badge:
                            "linear-gradient(135deg, #704500 0%, #D4AF3C 28%, #FFF4B0 48%, #D4AF3C 65%, #7A4A00 100%)",
                          points: "text-[#D4AF3C]",
                        }
                      : rank === 2
                        ? {
                            ring:
                              "linear-gradient(135deg, #62626B 0%, #D4D4D8 26%, #FFFFFF 48%, #C4C4C9 68%, #6B6B73 100%)",
                            badge:
                              "linear-gradient(135deg, #62626B 0%, #D4D4D8 28%, #FFFFFF 48%, #C4C4C9 65%, #6B6B73 100%)",
                            points: "text-[#D4D4D8]",
                          }
                        : {
                            ring:
                              "linear-gradient(135deg, #70270E 0%, #D95A24 26%, #FFB07C 48%, #D95A24 68%, #76290F 100%)",
                            badge:
                              "linear-gradient(135deg, #70270E 0%, #D95A24 28%, #FFB07C 48%, #D95A24 65%, #76290F 100%)",
                            points: "text-[#D95A24]",
                          };

                  return (
                    <button
                      key={user.profile_id}
                      onClick={() => setSelectedPublicProfile(user)}
                      className={`min-w-0 text-center ${
                        isWinner && topUsers.length === 1 ? "col-start-2" : ""
                      } ${
                        isWinner ? "pb-5" : "pb-1"
                      }`}
                    >
                      <MetallicCrown
                        rank={rank}
                        className={`mx-auto mb-1 ${
                          isWinner ? "h-9 w-12" : "h-7 w-10"
                        }`}
                      />
                      <div className="relative mx-auto w-fit">
                        <div
                          className={`rounded-full ${
                            isWinner ? "p-[3px]" : "p-0.5"
                          }`}
                          style={{
                            background: rankStyles.ring,
                            boxShadow: "0 0 16px rgb(255 255 255 / 0.08)",
                          }}
                        >
                          <ProfileAvatar
                            name={user.name}
                            avatarUrl={user.avatarUrl}
                            className={`${
                              isWinner ? "h-24 w-24" : "h-20 w-20"
                            } !border-0`}
                            textClassName={isWinner ? "text-3xl" : "text-2xl"}
                          />
                        </div>
                        <span
                          className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-zinc-950 text-xs font-black text-white shadow-lg"
                          style={{
                            background: rankStyles.badge,
                            textShadow: "0 1px 2px rgb(0 0 0 / 0.75)",
                          }}
                        >
                          {rank}
                        </span>
                      </div>
                      <p className="mt-3 truncate text-sm font-bold">
                        {user.name}
                      </p>
                      <p className={`text-lg font-black ${rankStyles.points}`}>
                        {user.points}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500">
                        {user.status.icon} {user.status.title}
                      </p>
                    </button>
                  );
                })}
              </section>
            )}

            {leaderboard.length === 0 ? (
              <p className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-400">
                {leaderboardMode === "month"
                  ? "Поки немає учасників у цьому місяці."
                  : "Поки немає учасників, у яких перші 30 днів завершуються в цьому місяці."}
              </p>
            ) : (
              <div className="space-y-2 rounded-3xl border border-zinc-800 bg-zinc-900 p-3">
                {restUsers.map((user, index) => (
                  <button
                    key={user.profile_id}
                    onClick={() => setSelectedPublicProfile(user)}
                    className="flex w-full items-center justify-between rounded-2xl bg-zinc-800/70 p-3 text-left"
                  >
                    <span className="text-zinc-400">{index + 4}</span>
                    <ProfileAvatar
                      name={user.name}
                      avatarUrl={user.avatarUrl}
                      className="ml-3 h-10 w-10"
                      textClassName="text-sm"
                    />
                    <span className="min-w-0 flex-1 px-3">
                      <span className="block font-bold">{user.name}</span>
                      <span className="block text-xs text-zinc-400">
                        {user.status.icon} {user.status.title}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold">{user.points}</span>
                      <span className="block text-xs text-zinc-500">
                        🔥 {user.supportCount}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <section className="rounded-3xl border border-green-500/30 bg-green-950/25 p-5">
              <p className="text-sm font-bold text-green-400">
                Твій наступний статус
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">
                    {currentProfileStatus.icon} {currentProfileStatus.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                    {currentProfileStatus.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">
                    {profile.points_total || 0}
                  </p>
                  <p className="text-xs text-zinc-400">всього</p>
                </div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${profileStatusProgress}%` }}
                />
              </div>

              {nextProfileStatus ? (
                <div className="mt-4 rounded-2xl bg-zinc-950/60 p-4">
                  <p className="text-sm font-bold text-zinc-300">
                    Далі: {nextProfileStatus.icon} {nextProfileStatus.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {nextProfileStatus.description}
                  </p>
                  <p className="mt-2 text-xs font-bold text-green-300">
                    Потрібно ще{" "}
                    {Math.max(
                      0,
                      nextProfileStatus.points - (profile.points_total || 0)
                    )}{" "}
                    балів
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-green-300">
                  Максимальний статус відкрито.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black">Усі статуси</h2>
              {PROFILE_STATUSES.map((status) => {
                const isUnlocked = (profile.points_total || 0) >= status.points;
                const isCurrent = status.title === currentProfileStatus.title;

                return (
                  <div
                    key={status.title}
                    className={`flex items-start gap-3 rounded-2xl border p-4 ${
                      isCurrent
                        ? "border-green-500/40 bg-green-950/30"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${
                        isUnlocked ? "bg-green-500/15" : "bg-zinc-800"
                      }`}
                    >
                      {status.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black">{status.title}</p>
                        <span className="text-xs font-bold text-zinc-400">
                          {status.points} балів
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {status.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </section>
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
              <div className="mx-auto mb-3 w-fit">
                <ProfileAvatar
                  name={profile.first_name}
                  avatarUrl={profile.avatar_url}
                  className="h-24 w-24 !border-zinc-700"
                  textClassName="text-4xl"
                />
              </div>
              {isNameEditing ? (
                <form
                  className="mx-auto flex max-w-xs items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveProfileName();
                  }}
                >
                  <input
                    autoFocus
                    value={profileNameDraft}
                    onChange={(event) =>
                      setProfileNameDraft(event.target.value.slice(0, 40))
                    }
                    aria-label="Нове ім’я"
                    className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-center text-lg font-black outline-none focus:border-green-500"
                  />
                  <button
                    type="submit"
                    disabled={isNameSaving}
                    aria-label="Зберегти ім’я"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green-600 text-white disabled:opacity-50"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={isNameSaving}
                    onClick={() => setIsNameEditing(false)}
                    aria-label="Скасувати редагування"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-800 text-zinc-300 disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h2 className="min-w-0 truncate text-3xl font-black">
                    {profile.first_name || "User"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileNameDraft(profile.first_name || "");
                      setIsNameEditing(true);
                    }}
                    aria-label="Змінити ім’я"
                    title="Змінити ім’я"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-800 text-zinc-300"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                JPG, PNG або WebP · до 5 МБ
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <label
                  title={
                    profile.avatar_url ? "Замінити фото" : "Додати фото"
                  }
                  aria-label={
                    profile.avatar_url ? "Замінити фото" : "Додати фото"
                  }
                  className={`relative grid h-[42px] w-[42px] cursor-pointer place-items-center rounded-full border border-zinc-700 bg-zinc-800 ${
                    isAvatarSaving ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {isAvatarSaving ? (
                    "…"
                  ) : (
                    <Image
                      src="/icons/camera-profile-v3.svg"
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={isAvatarSaving}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) selectAvatarFile(file);
                    }}
                  />
                </label>
                {profile.avatar_url && (
                  <button
                    type="button"
                    onClick={() => void deleteProfileAvatar()}
                    disabled={isAvatarSaving}
                    title="Видалити фото"
                    aria-label="Видалити фото"
                    className="grid h-[42px] w-[42px] place-items-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300 disabled:opacity-60"
                  >
                    <Trash2 size={19} />
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-400">
                Учасник з {profile.registration_date || today()} ·{" "}
                {getDaysWithUs()} днів з нами
              </p>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-green-400">
                    Публічний профіль
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Telegram-контакт
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    За замовчуванням посилання приховане. Відкривай його тільки
                    якщо хочеш, щоб інші учасники могли написати тобі.
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {profile.telegram_username
                      ? `@${profile.telegram_username}`
                      : "Telegram username поки не знайдено"}
                  </p>
                </div>

                <button
                  onClick={() =>
                    updateTelegramContactVisibility(
                      !(profile.show_telegram_contact ?? false)
                    )
                  }
                  disabled={!profile.telegram_username}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-black disabled:opacity-50 ${
                    profile.show_telegram_contact
                      ? "bg-green-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {profile.show_telegram_contact ? "ON" : "OFF"}
                </button>
              </div>
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
              <div className="text-center">
                <h1 className="text-2xl font-black">Завдання</h1>
                <p className="text-xs text-zinc-500">Детальний прогрес</p>
              </div>
              <span className="text-sm text-zinc-400">
                {completedCount}/{tasks.length}
              </span>
            </header>

            <section className="flex h-28 items-center justify-between gap-3 rounded-3xl border border-green-500/30 bg-green-950/25 p-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#D4AF3C]">
                  Фокус сьогодні
                </p>
                <h2 className="mt-1 truncate text-lg font-black">
                  {todayFocus.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-300">
                  {todayFocus.description}
                </p>
              </div>
              <button
                onClick={todayFocus.onClick}
                className="shrink-0 rounded-full bg-green-600 px-4 py-2 text-xs font-black"
              >
                {todayFocus.action}
              </button>
            </section>

            <section className="flex h-28 flex-col justify-center rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-green-400">
                    Почни з малого
                  </p>
                  <h2 className="text-lg font-black">{dayStatus.title}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">
                    {dayPoints}/{DAILY_POINTS_MAX}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400">балів</p>
                </div>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${dayProgress}%` }}
                />
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-orange-300">
                    Основні
                  </span>
                  <span className="text-zinc-600"> · </span>
                  <span>Завдання на сьогодні</span>
                </h2>
              </div>

              <div className="space-y-2">
                {taskSummaries.map((task) => {
                  const progressPercent = (task.points / task.maxPoints) * 100;

                  return (
                    <button
                      key={task.code}
                      onClick={task.onClick}
                      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left shadow-lg transition active:scale-[0.99] ${
                        task.isCompleted
                          ? "border-green-500/40 bg-green-950/40 text-white ring-1 ring-white/20"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${task.meta.accent} text-xl shadow-lg`}
                      >
                        {task.isCompleted ? "✓" : task.meta.emoji}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black leading-tight">
                          {task.meta.title}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400">
                          {task.progress}/{task.total} пунктів
                        </p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/30">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${task.meta.accent}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xl font-black text-orange-300">
                          {task.points}/{task.maxPoints}
                        </p>
                        <p className="text-[10px] text-zinc-500">балів</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mb-3 mt-5">
                <h2 className="text-sm font-black">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-orange-300">
                    Додаткові можливості
                  </span>
                  <span className="text-zinc-600"> · </span>
                  <span>Бонусні завдання</span>
                </h2>
              </div>

              <div className="space-y-2">
                {dailyBonusTasks.map((bonus) => {
                  const isCompleted = completedTaskCodes.includes(bonus.code);
                  const label =
                    bonus.slot === "daily"
                      ? "Food квест"
                      : "Sport челендж";
                  const meta =
                    bonus.slot === "daily"
                      ? TASK_META.food
                      : TASK_META.activity;

                  return (
                    <button
                      type="button"
                      key={bonus.code}
                      onClick={() => setSelectedBonusTask(bonus)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                        isCompleted
                          ? "border-[#D4AF3C]/50 bg-[#D4AF3C]/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${meta.accent} text-xl shadow-lg`}
                      >
                        {isCompleted ? "✓" : meta.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {isCompleted
                            ? "Виконано сьогодні"
                            : `${bonus.title}: ${bonus.description}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xl font-black text-orange-300">
                          {isCompleted ? bonus.points : 0}/{bonus.points}
                        </span>
                        <span className="block text-[10px] text-zinc-500">
                          балів
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
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
              <h1 className="text-2xl font-black">Статуси</h1>
              <span />
            </header>

            <section className="rounded-3xl border border-green-500/30 bg-green-950/25 p-5">
              <p className="text-sm font-bold text-green-400">
                Твій статус профілю
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black">
                    {currentProfileStatus.icon} {currentProfileStatus.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                    {currentProfileStatus.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black">
                    {profile.points_total || 0}
                  </p>
                  <p className="text-xs font-bold text-zinc-400">балів</p>
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${profileStatusProgress}%` }}
                />
              </div>
              {nextProfileStatus ? (
                <p className="mt-3 text-sm text-zinc-400">
                  До статусу {nextProfileStatus.icon} {nextProfileStatus.title}:{" "}
                  {Math.max(
                    0,
                    nextProfileStatus.points - (profile.points_total || 0)
                  )}{" "}
                  балів
                </p>
              ) : (
                <p className="mt-3 text-sm text-green-300">
                  Максимальний статус відкрито. Це рівень легенди.
                </p>
              )}
            </section>

            <section className="space-y-3">
              {PROFILE_STATUSES.map((status) => {
                const isUnlocked = (profile.points_total || 0) >= status.points;
                const isCurrent = status.title === currentProfileStatus.title;

                return (
                <div
                  key={status.title}
                  className={`rounded-2xl border p-4 ${
                    isCurrent
                      ? "border-green-500/40 bg-green-950/30"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${
                        isUnlocked ? "bg-green-500/15" : "bg-zinc-800"
                      }`}
                    >
                      {status.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black">{status.title}</p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${
                            isUnlocked
                              ? "bg-green-500/15 text-green-300"
                              : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {isUnlocked ? "відкрито" : `${status.points} балів`}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-zinc-400">
                        {status.description}
                      </p>
                      <p className="mt-2 text-xs font-bold text-green-300">
                        Бонус: {status.bonus}
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}
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
                Тут зʼявляться корисні продукти для учасників: доступи,
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

      {selectedPublicProfile && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/80 px-3 pb-3">
          <div className="w-full max-w-md rounded-t-[2rem] border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-700" />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar
                  name={selectedPublicProfile.name}
                  avatarUrl={selectedPublicProfile.avatarUrl}
                  className="h-16 w-16"
                  textClassName="text-xl"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-green-400">
                    Публічний профіль
                  </p>
                  <h2 className="mt-1 truncate text-3xl font-black">
                    {selectedPublicProfile.name}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-green-300">
                    {selectedPublicProfile.status.icon}{" "}
                    {selectedPublicProfile.status.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPublicProfile(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-xl"
              >
                ×
              </button>
            </div>

            <section className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-400">Рейтинг</p>
                <p className="text-xl font-black">
                  {selectedPublicProfile.points}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-400">Всього</p>
                <p className="text-xl font-black">
                  {selectedPublicProfile.totalPoints}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-400">Підтримка</p>
                <p className="text-xl font-black">
                  🔥 {selectedPublicProfile.supportCount}
                </p>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm leading-relaxed text-zinc-300">
                {selectedPublicProfile.status.description}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Старт: {selectedPublicProfile.registrationDate || "не вказано"}
              </p>
            </section>

            <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="font-bold">Фото прогресу</p>
              <p className="mt-1 text-sm text-zinc-400">
                Фото будуть видимі тут тільки після окремої згоди учасника.
              </p>
            </section>

            <div className="mt-4 grid gap-3">
              {selectedPublicProfile.showTelegramContact &&
                selectedPublicProfile.telegramUsername && (
                  <a
                    href={`https://t.me/${selectedPublicProfile.telegramUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl bg-zinc-800 p-4 text-center font-black"
                  >
                    Написати в Telegram
                  </a>
                )}

              {profile?.id !== selectedPublicProfile.profile_id ? (
                <button
                  onClick={() => toggleProfileSupport(selectedPublicProfile)}
                  disabled={isSupportSaving}
                  className={`rounded-2xl p-4 font-black disabled:opacity-50 ${
                    selectedPublicProfile.isSupportedByMe
                      ? "bg-zinc-800 text-green-300"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {selectedPublicProfile.isSupportedByMe
                    ? "Підтримано"
                    : "Підтримати"}
                </button>
              ) : (
                <p className="rounded-2xl bg-zinc-900 p-4 text-center text-sm text-zinc-400">
                  Це твій профіль у рейтингу.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedBonusTask && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-5"
          onClick={() => {
            if (!isBonusTaskSaving) setSelectedBonusTask(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bonus-task-title"
            className="w-full max-w-md rounded-3xl border border-[#D4AF3C]/40 bg-zinc-950 p-5 shadow-2xl shadow-amber-950/30"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">
                  День {selectedBonusTask.cycleDay} із 30 ·{" "}
                  {selectedBonusTask.slot === "daily"
                    ? "Food квест"
                    : "Sport челендж"}
                </p>
                <h2
                  id="bonus-task-title"
                  className="mt-2 text-2xl font-black"
                >
                  {selectedBonusTask.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBonusTask(null)}
                disabled={isBonusTaskSaving}
                aria-label="Закрити"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-zinc-300 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={`my-5 grid h-24 place-items-center rounded-2xl bg-gradient-to-br text-5xl shadow-lg ${
                selectedBonusTask.slot === "daily"
                  ? TASK_META.food.accent
                  : TASK_META.activity.accent
              }`}
            >
              {selectedBonusTask.slot === "daily"
                ? TASK_META.food.emoji
                : TASK_META.activity.emoji}
            </div>

            <p className="text-sm leading-relaxed text-zinc-300">
              {selectedBonusTask.description}
            </p>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3">
              <span className="text-sm font-bold text-zinc-400">
                Додаткові бали
              </span>
              <span className="text-2xl font-black text-orange-300">
                +{selectedBonusTask.points}
              </span>
            </div>

            <button
              type="button"
              onClick={() => completeBonusTask(selectedBonusTask)}
              disabled={
                isBonusTaskSaving ||
                completedTaskCodes.includes(selectedBonusTask.code)
              }
              className="mt-4 w-full rounded-2xl bg-[#CB161C] p-4 font-black text-white transition active:scale-[0.99] disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {completedTaskCodes.includes(selectedBonusTask.code)
                ? "Виконано сьогодні"
                : isBonusTaskSaving
                  ? "Зберігаємо..."
                  : "Завдання виконано"}
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
              Після 30-го дня бонусний цикл почнеться знову з першого дня.
            </p>
          </div>
        </div>
      )}

      {isWaterModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/75 px-3 pb-3">
          <div className="flex h-[80vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="overflow-y-auto p-5 pb-4">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-700" />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-green-400">
                  Твоя персональна денна норма:{" "}
                  {getDailyWaterNorm()} л 
                </p>
                <h2 className="text-3xl font-black">Вода</h2>
              </div>
              <button
                onClick={() => setIsWaterModalOpen(false)}
                className="grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-500/25 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-300">
                Можна повертатися протягом дня
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Відмічай воду поступово протягом дня. Натиснув випадково — натисни ще раз,
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
                <p className="text-sm text-zinc-400">Завдання на сьогодні</p>
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
                className="grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-500/25 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-300">
                Можна повертатися протягом дня
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Відмічай харчування ввечері. Натиснув випадково — натисни ще
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
                <p className="text-sm text-zinc-400">Завдання на сьогодні</p>
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
                className="grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-500/25 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-300">
                Можна повертатися протягом дня
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Відмічай рух після прогулянки або тренування. Натиснув
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
                <p className="text-sm text-zinc-400">Завдання на сьогодні</p>
                <p className="text-2xl font-black">
                  {activityCompletedCount}/{ACTIVITY_GOAL_COUNT}
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
                className="grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-500/25 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-300">
                Ранковий check за попередню ніч
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                Відмічай сон і також ніч без їжі, вранці. Натиснув випадково —
                натисни ще раз, щоб скасувати пункт.
              </p>
            </div>

            <div className="mb-4 rounded-3xl bg-zinc-900 p-4">
              <div className="mb-3 grid h-28 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 text-6xl">
                🌙
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                Це завдання ти рахуєш вранці за попередню ніч: як ти спав і чи
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
                <p className="text-sm text-zinc-400">Завдання на сьогодні</p>
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

      {message && (
        <div className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-2xl border border-zinc-700 bg-zinc-800/95 px-4 py-3 text-center text-sm font-bold text-white shadow-2xl backdrop-blur">
          {message}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950/95 px-2 pb-4 pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 text-center">
          {[
            { tab: "home", icon: House, label: "Головна" },
            { tab: "tasks", icon: ListChecks, label: "Завдання" },
            { tab: "leaderboard", icon: Trophy, label: "Рейтинг" },
            { tab: "profile", icon: UserRound, label: "Профіль" },
            { tab: "shop", icon: Gift, label: "Нагороди" },
          ].map((item) => {
            const isActive =
              activeTab === item.tab ||
              (item.tab === "profile" && activeTab === "photo");
            const Icon = item.icon;

            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`nav-gold-item relative px-1 py-2 text-[11px] font-bold transition ${
                  isActive ? "is-active" : ""
                }`}
              >
                <span className="flex h-7 items-center justify-center">
                  <Icon
                    size={27}
                    strokeWidth={1.8}
                    fill={
                      isActive && item.tab === "leaderboard"
                        ? "currentColor"
                        : "none"
                    }
                  />
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
