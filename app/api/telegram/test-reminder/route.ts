import { createClient } from "@supabase/supabase-js";

const REMINDER_SETTINGS_NOTE =
  "Нагадування можна змінити у профілі NEZLAMNI.";

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const appUrl =
    process.env.TELEGRAM_MINI_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (productionUrl ? `https://${productionUrl}` : new URL(request.url).origin);

  if (!botToken) {
    return Response.json(
      { error: "TELEGRAM_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { error: "Supabase environment variables are not configured" },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    profileId?: string;
    telegramId?: string;
  } | null;
  const profileId = body?.profileId?.trim();
  const telegramId = body?.telegramId?.trim();

  if (!profileId || !telegramId) {
    return Response.json(
      { error: "profileId and telegramId are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, telegram_id, first_name")
    .eq("id", profileId)
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (profileError || !profile) {
    return Response.json(
      { error: "Profile was not found for this Telegram user" },
      { status: 403 }
    );
  }

  const firstName = profile.first_name || "Незламний";
  const text = [
    `Привіт, ${firstName}!`,
    "Це тестове нагадування NEZLAMNI.",
    "Бот працює. Скоро він буде мʼяко нагадувати про воду, рух, харчування і сон.",
    REMINDER_SETTINGS_NOTE,
  ].join("\n\n");

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
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
    }
  );

  const telegramData = await telegramResponse.json().catch(() => null);

  if (!telegramResponse.ok) {
    return Response.json(
      {
        error: "Telegram did not send the message",
        details: telegramData,
      },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
