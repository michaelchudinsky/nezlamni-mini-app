import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { verifyTelegramInitData } from "@/lib/telegramAuth";

export const runtime = "nodejs";

const BUCKET = "progress-photos";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProgressPhotoRow = {
  profile_id: string;
  before_path: string;
  before_uploaded_at: string;
  after_path: string | null;
  after_uploaded_at: string | null;
  show_public: boolean;
  storage_consent_at: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getViewer(request: Request) {
  const admin = getAdminClient();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const initData = request.headers.get("x-telegram-init-data") || "";
  const verified = botToken
    ? verifyTelegramInitData(initData, botToken)
    : null;

  if (!admin || !verified) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, telegram_id")
    .eq("telegram_id", verified.telegramId)
    .maybeSingle();

  return profile ? { admin, profile } : null;
}

async function createSignedUrl(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  path: string | null
) {
  if (!path) return null;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

async function serializeRow(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  row: ProgressPhotoRow,
  canSeePhotos: boolean
) {
  const availableAt = new Date(
    new Date(row.before_uploaded_at).getTime() + THIRTY_DAYS_MS
  ).toISOString();

  return {
    beforeUploadedAt: row.before_uploaded_at,
    afterUploadedAt: row.after_uploaded_at,
    afterAvailableAt: availableAt,
    canUploadAfter: Date.now() >= new Date(availableAt).getTime() && !row.after_path,
    showPublic: row.show_public,
    beforeUrl: canSeePhotos ? await createSignedUrl(admin, row.before_path) : null,
    afterUrl: canSeePhotos ? await createSignedUrl(admin, row.after_path) : null,
  };
}

export async function GET(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedProfileId = new URL(request.url).searchParams.get("profileId");
  const targetProfileId = requestedProfileId || viewer.profile.id;
  const isOwner = targetProfileId === viewer.profile.id;
  const { data, error } = await viewer.admin
    .from("progress_photos")
    .select(
      "profile_id, before_path, before_uploaded_at, after_path, after_uploaded_at, show_public, storage_consent_at"
    )
    .eq("profile_id", targetProfileId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Could not load progress photos" }, { status: 500 });
  }
  if (!data) return Response.json({ photos: null });

  const row = data as ProgressPhotoRow;
  if (!isOwner && !row.show_public) return Response.json({ photos: null });

  return Response.json({
    photos: await serializeRow(viewer.admin, row, isOwner || row.show_public),
  });
}

export async function POST(request: Request) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      action?: string;
      showPublic?: boolean;
    } | null;
    if (body?.action !== "visibility" || typeof body.showPublic !== "boolean") {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    if (body.showPublic) {
      const { data: photoPair } = await viewer.admin
        .from("progress_photos")
        .select("after_path")
        .eq("profile_id", viewer.profile.id)
        .maybeSingle();
      if (!photoPair?.after_path) {
        return Response.json(
          { error: "Both photos are required for public visibility" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await viewer.admin
      .from("progress_photos")
      .update({ show_public: body.showPublic })
      .eq("profile_id", viewer.profile.id)
      .select(
        "profile_id, before_path, before_uploaded_at, after_path, after_uploaded_at, show_public, storage_consent_at"
      )
      .single();

    if (error) {
      return Response.json({ error: "Could not update visibility" }, { status: 500 });
    }
    return Response.json({ photos: await serializeRow(viewer.admin, data, true) });
  }

  const form = await request.formData();
  const action = String(form.get("action") || "");
  const consent = form.get("consent") === "true";
  const file = form.get("file");

  if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "Invalid photo" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await viewer.admin
    .from("progress_photos")
    .select(
      "profile_id, before_path, before_uploaded_at, after_path, after_uploaded_at, show_public, storage_consent_at"
    )
    .eq("profile_id", viewer.profile.id)
    .maybeSingle();

  if (existingError) {
    return Response.json({ error: "Could not check progress photos" }, { status: 500 });
  }

  if (action === "before") {
    if (!consent) return Response.json({ error: "Consent is required" }, { status: 400 });
    if (existing) return Response.json({ error: "Before photo already exists" }, { status: 409 });
  } else if (action === "after") {
    if (!existing) return Response.json({ error: "Before photo is required" }, { status: 400 });
    if (existing.after_path) return Response.json({ error: "After photo already exists" }, { status: 409 });
    if (Date.now() < new Date(existing.before_uploaded_at).getTime() + THIRTY_DAYS_MS) {
      return Response.json({ error: "Thirty days have not passed yet" }, { status: 403 });
    }
  } else {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const path = `${viewer.profile.id}/${action}-${randomUUID()}.jpg`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await viewer.admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return Response.json({ error: "Could not upload photo" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const mutation =
    action === "before"
      ? viewer.admin.from("progress_photos").insert({
          profile_id: viewer.profile.id,
          before_path: path,
          before_uploaded_at: now,
          storage_consent_at: now,
        })
      : viewer.admin
          .from("progress_photos")
          .update({ after_path: path, after_uploaded_at: now })
          .eq("profile_id", viewer.profile.id);
  const { data, error } = await mutation
    .select(
      "profile_id, before_path, before_uploaded_at, after_path, after_uploaded_at, show_public, storage_consent_at"
    )
    .single();

  if (error) {
    await viewer.admin.storage.from(BUCKET).remove([path]);
    return Response.json({ error: "Could not save photo" }, { status: 500 });
  }

  return Response.json({ photos: await serializeRow(viewer.admin, data, true) });
}
