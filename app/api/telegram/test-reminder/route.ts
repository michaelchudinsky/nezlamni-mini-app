import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  const firstName = profile.first_name || "Незламна";
  const text = [
    `Привіт, ${firstName}!`,
    "Це тестове нагадування NEZLAMNI.",
    "Бот працює. Скоро він буде мʼяко нагадувати про воду, рух, харчування і сон.",
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
