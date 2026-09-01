import { createClient } from "@supabase/supabase-js";
import { calculateLegendProgress, type LegendLog } from "@/lib/legendProgress";
import { LEGEND_BY_SLUG, LEGENDS } from "@/lib/legends";
import { verifyTelegramInitData } from "@/lib/telegramAuth";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
}

async function getViewer(request: Request) {
  const admin = getAdminClient();
  const initData = request.headers.get("x-telegram-init-data") || "";
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const verified = token ? verifyTelegramInitData(initData, token) : null;
  if (!admin || !verified) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("id, points_total, active_legend_slug")
    .eq("telegram_id", verified.telegramId)
    .maybeSingle();
  return profile ? { admin, profile } : null;
}

export async function GET(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: logs, error: logsError } = await viewer.admin
    .from("daily_logs")
    .select("task_code, event_day, points")
    .eq("profile_id", viewer.profile.id)
    .order("event_day", { ascending: true });
  if (logsError) return Response.json({ error: "Could not load progress" }, { status: 500 });

  const calculated = calculateLegendProgress((logs || []) as LegendLog[], viewer.profile.points_total || 0);
  const earned = calculated.filter((item) => item.unlocked);
  if (earned.length) {
    const { error } = await viewer.admin.from("user_legends").upsert(
      earned.map((item) => ({
        profile_id: viewer.profile.id,
        legend_slug: item.slug,
        unlocked_at: `${item.achievedAt}T12:00:00.000Z`,
      })),
      { onConflict: "profile_id,legend_slug", ignoreDuplicates: true }
    );
    if (error) return Response.json({ error: "Legends database is not ready" }, { status: 503 });
  }

  const { data: unlocks, error: unlockError } = await viewer.admin
    .from("user_legends")
    .select("legend_slug, unlocked_at, popup_seen_at")
    .eq("profile_id", viewer.profile.id);
  if (unlockError) return Response.json({ error: "Legends database is not ready" }, { status: 503 });

  const unlockMap = new Map((unlocks || []).map((row) => [row.legend_slug, row]));
  const isCollectionComplete = unlockMap.size === LEGENDS.length;
  if (isCollectionComplete) {
    await viewer.admin.from("profiles").update({ legends_collection_complete: true }).eq("id", viewer.profile.id);
  }
  const items = LEGENDS.map((definition) => {
    const progress = calculated.find((item) => item.slug === definition.slug)!;
    const unlock = unlockMap.get(definition.slug);
    return { ...definition, ...progress, unlocked: Boolean(unlock), unlockedAt: unlock?.unlocked_at || null };
  });
  const pendingUnlock = (unlocks || []).find((row) => !row.popup_seen_at)?.legend_slug || null;
  return Response.json({
    items,
    activeLegendSlug: viewer.profile.active_legend_slug || null,
    pendingUnlock,
    isCollectionComplete,
  });
}

export async function POST(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { action?: string; slug?: string } | null;
  const slug = body?.slug || "";
  if (!LEGEND_BY_SLUG.has(slug)) return Response.json({ error: "Invalid legend" }, { status: 400 });

  const { data: unlocked } = await viewer.admin
    .from("user_legends")
    .select("legend_slug")
    .eq("profile_id", viewer.profile.id)
    .eq("legend_slug", slug)
    .maybeSingle();
  if (!unlocked) return Response.json({ error: "Legend is locked" }, { status: 403 });

  if (body?.action === "select") {
    const { error } = await viewer.admin.from("profiles").update({ active_legend_slug: slug }).eq("id", viewer.profile.id);
    return error ? Response.json({ error: "Could not select legend" }, { status: 500 }) : Response.json({ activeLegendSlug: slug });
  }
  if (body?.action === "mark-seen") {
    const { error } = await viewer.admin.from("user_legends").update({ popup_seen_at: new Date().toISOString() }).eq("profile_id", viewer.profile.id).eq("legend_slug", slug);
    return error ? Response.json({ error: "Could not update legend" }, { status: 500 }) : Response.json({ ok: true });
  }
  return Response.json({ error: "Invalid action" }, { status: 400 });
}
