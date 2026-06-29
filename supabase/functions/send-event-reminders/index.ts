import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const NOTIFY_TZ = "Asia/Seoul";
const ALL_DAY_NOTIFY_HOUR = 9;
const NOTIFY_MINUTES_BEFORE = 10;
const NOTIFY_OFFSET_MS = NOTIFY_MINUTES_BEFORE * 60 * 1000;

interface EventRow {
  id: string;
  user_id: string;
  title: string;
  starts_at: string;
  all_day: boolean;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

interface DueEvent {
  id: string;
  user_id: string;
  title: string;
  starts_at: string;
  all_day: boolean;
  notify_at: string;
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function computeNotifyAt(startsAtIso: string, allDay: boolean): Date {
  if (!allDay) {
    return new Date(new Date(startsAtIso).getTime() - NOTIFY_OFFSET_MS);
  }

  const startsAt = new Date(startsAtIso);
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: NOTIFY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(startsAt);
  const [year, month, day] = datePart.split("-").map(Number);
  // 09:00 KST = 00:00 UTC (한국은 서머타임 없음)
  const allDayNotify = new Date(
    Date.UTC(year, month - 1, day, ALL_DAY_NOTIFY_HOUR - 9, 0, 0, 0),
  );
  return new Date(allDayNotify.getTime() - NOTIFY_OFFSET_MS);
}

function formatNotificationBody(event: EventRow): string {
  const startsAt = new Date(event.starts_at);

  if (event.all_day) {
    return `오늘 종일 일정 · ${startsAt.toLocaleDateString("ko-KR", { timeZone: NOTIFY_TZ })}`;
  }

  const startLabel = startsAt.toLocaleString("ko-KR", {
    timeZone: NOTIFY_TZ,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${NOTIFY_MINUTES_BEFORE}분 후 시작 · ${startLabel}`;
}

function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) return false;

  const authHeader = req.headers.get("Authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  return req.headers.get("x-cron-secret") === cronSecret;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject =
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

  if (!supabaseUrl || !serviceRoleKey || !vapidPublic || !vapidPrivate) {
    return jsonResponse({ error: "Missing server configuration" }, 500);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = Date.now();

  const { data: events, error: eventsError } = await admin
    .from("events")
    .select("id, user_id, title, starts_at, all_day")
    .eq("notify_enabled", true);

  if (eventsError) {
    return jsonResponse({ error: eventsError.message }, 500);
  }

  const dueEvents: DueEvent[] = [];

  for (const event of (events ?? []) as EventRow[]) {
    const notifyAt = computeNotifyAt(event.starts_at, event.all_day);
    const notifyMs = notifyAt.getTime();
    const startsMs = new Date(event.starts_at).getTime();

    if (notifyMs > now) continue;
    // 알림 시각~시작 전까지 보정 발송 (5분 cron 창을 놓쳐도 시작 시각에 가지 않음)
    if (!event.all_day && now >= startsMs) continue;

    dueEvents.push({
      ...event,
      notify_at: notifyAt.toISOString(),
    });
  }

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  for (const event of dueEvents) {
    const { data: existing } = await admin
      .from("event_push_dispatches")
      .select("event_id")
      .eq("event_id", event.id)
      .eq("notify_at", event.notify_at)
      .maybeSingle();

    if (existing) continue;

    const { data: subscriptions, error: subError } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", event.user_id);

    if (subError || !subscriptions?.length) continue;

    const notifyAtDate = new Date(event.notify_at);
    const payload = JSON.stringify({
      title: event.title,
      body: formatNotificationBody(event),
      tag: `${event.id}:${notifyAtDate.getTime()}`,
      url: "/dashboard",
    });

    let delivered = false;

    for (const sub of subscriptions as PushSubscriptionRow[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload,
        );
        delivered = true;
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    if (delivered) {
      await admin.from("event_push_dispatches").insert({
        event_id: event.id,
        notify_at: event.notify_at,
      });
    }
  }

  if (expiredEndpoints.length > 0) {
    const unique = [...new Set(expiredEndpoints)];
    await admin.from("push_subscriptions").delete().in("endpoint", unique);
  }

  return jsonResponse({
    checked: events?.length ?? 0,
    due: dueEvents.length,
    sent,
    failed,
    cleaned: expiredEndpoints.length,
  });
});
