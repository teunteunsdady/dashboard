import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const NOTIFY_TZ = "Asia/Seoul";
const CACHE_TTL_MS = Math.floor((24 * 60 * 60 * 1000) / 1000);
const SEOUL_BUS_BASE =
  "http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid";

interface BusStopConfig {
  id: string;
  arsId: string;
  name: string;
  routeNumber: string;
  travelDirection: string;
  apiDirection: string;
}

const BUS_STOPS: BusStopConfig[] = [
  {
    id: "1131-wolgye",
    arsId: "11323",
    name: "월계삼호4차 아파트",
    routeNumber: "1131",
    travelDirection: "쩐",
    apiDirection: "중계본동",
  },
  {
    id: "1131-hagye",
    arsId: "11367",
    name: "노원구민의 전당",
    routeNumber: "1131",
    travelDirection: "집",
    apiDirection: "석계역",
  },
  {
    id: "147-deer",
    arsId: "11339",
    name: "월계보건지소",
    routeNumber: "147",
    travelDirection: "집",
    apiDirection: "월계동",
  },
];

interface BusAlarmRow {
  user_id: string;
  enabled: boolean;
  days: number[];
  threshold_minutes: number;
  auto_stop: boolean;
  stop_id: string;
  morning_start: number;
  morning_end: number;
  evening_start: number;
  evening_end: number;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

interface CacheRow {
  stop_id: string;
  arrival1: string;
  stop_name: string;
  route_number: string;
  travel_direction: string;
  fetched_at: string;
}

interface SeoulRouteItem {
  rtNm?: string;
  busRouteAbrv?: string;
  adirection?: string;
  arrmsg1?: string;
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

function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) return false;
  if (req.headers.get("Authorization") === `Bearer ${cronSecret}`) return true;
  return req.headers.get("x-cron-secret") === cronSecret;
}

function getKstDayAndHour(now = new Date()): { day: number; hour: number } {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: NOTIFY_TZ,
    weekday: "short",
  }).format(now);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: NOTIFY_TZ,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  return { day: dayMap[weekday] ?? 0, hour };
}

function isScheduleActive(row: BusAlarmRow, now = new Date()): boolean {
  if (!row.enabled) return false;
  const { day, hour } = getKstDayAndHour(now);
  if (!row.days.includes(day)) return false;
  const inMorning = hour >= row.morning_start && hour < row.morning_end;
  const inEvening = hour >= row.evening_start && hour < row.evening_end;
  return inMorning || inEvening;
}

function resolveStopId(row: BusAlarmRow, now = new Date()): string | null {
  if (!isScheduleActive(row, now)) return null;
  if (!row.auto_stop) return row.stop_id;
  const { hour } = getKstDayAndHour(now);
  if (hour >= row.morning_start && hour < row.morning_end) {
    return "1131-wolgye";
  }
  if (hour >= row.evening_start && hour < row.evening_end) {
    return "1131-hagye";
  }
  return null;
}

function parseBusArrivalMinutes(message: string): number | null {
  const text = message.trim();
  if (!text || text === "-" || /정보\s*없음|도착\s*정보\s*없음/.test(text)) {
    return null;
  }
  if (/곧\s*도착|잠시\s*후|전\s*역\s*출발|막\s*출발/.test(text)) return 0;
  if (/운행\s*중|출발\s*대기|회차\s*대기/.test(text)) return 1;
  const match = text.match(/(\d+)\s*분/);
  if (!match) return null;
  const minutes = Number.parseInt(match[1], 10);
  return Number.isFinite(minutes) ? minutes : null;
}

function isWithinThreshold(message: string, threshold: number): boolean {
  const minutes = parseBusArrivalMinutes(message);
  if (minutes === null) return false;
  return minutes <= threshold;
}

function getStopConfig(stopId: string): BusStopConfig | undefined {
  return BUS_STOPS.find((stop) => stop.id === stopId);
}

function normalizeItemList(body: Record<string, unknown>): SeoulRouteItem[] {
  const itemList = (body.msgBody as {
    itemList?: SeoulRouteItem | SeoulRouteItem[];
  })?.itemList;
  if (!itemList) return [];
  return Array.isArray(itemList) ? itemList : [itemList];
}

function pickRouteItem(
  items: SeoulRouteItem[],
  stop: BusStopConfig,
): SeoulRouteItem | undefined {
  const routeItems = items.filter((item) => {
    const routeText = `${item.rtNm ?? ""} ${item.busRouteAbrv ?? ""}`;
    return routeText.includes(stop.routeNumber);
  });
  if (routeItems.length === 0) return undefined;
  if (routeItems.length === 1) return routeItems[0];
  return routeItems.find((item) =>
    (item.adirection ?? "").includes(stop.apiDirection)
  );
}

async function fetchArrivalFromApi(
  stop: BusStopConfig,
  serviceKey: string,
): Promise<string> {
  const url = new URL(SEOUL_BUS_BASE);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("arsId", stop.arsId);
  url.searchParams.set("resultType", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`서울시 버스 API 오류 (${response.status})`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const header = data.msgHeader as { headerCd?: string; headerMsg?: string } | undefined;
  if (header?.headerCd && header.headerCd !== "0") {
    throw new Error(header.headerMsg ?? "버스 정보를 가져오지 못했습니다.");
  }

  const matched = pickRouteItem(normalizeItemList(data), stop);
  return matched?.arrmsg1?.trim() || "도착 정보 없음";
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
  const serviceKey = Deno.env.get("SEOUL_BUS_API_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject =
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

  if (!supabaseUrl || !serviceRoleKey || !serviceKey || !vapidPublic || !vapidPrivate) {
    return jsonResponse({ error: "Missing server configuration" }, 500);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: settingsRows, error: settingsError } = await admin
    .from("bus_alarm_settings")
    .select("*")
    .eq("enabled", true);

  if (settingsError) {
    return jsonResponse({ error: settingsError.message }, 500);
  }

  const now = new Date();
  const activeJobs: Array<{ userId: string; stopId: string; row: BusAlarmRow }> = [];

  for (const row of (settingsRows ?? []) as BusAlarmRow[]) {
    const stopId = resolveStopId(row, now);
    if (!stopId) continue;
    activeJobs.push({ userId: row.user_id, stopId, row });
  }

  const uniqueStopIds = [...new Set(activeJobs.map((job) => job.stopId))];
  const arrivalByStop = new Map<string, CacheRow>();

  for (const stopId of uniqueStopIds) {
    const stop = getStopConfig(stopId);
    if (!stop) continue;

    const { data: cached } = await admin
      .from("bus_arrival_cache")
      .select("*")
      .eq("stop_id", stopId)
      .maybeSingle();

    const cacheRow = cached as CacheRow | null;
    const cacheFresh = cacheRow &&
      Date.now() - new Date(cacheRow.fetched_at).getTime() < CACHE_TTL_MS;

    if (cacheFresh && cacheRow) {
      arrivalByStop.set(stopId, cacheRow);
      continue;
    }

    const { data: reserve } = await admin.rpc("reserve_bus_api_calls", {
      p_count: 1,
    });

    if (!reserve?.allowed) {
      if (cacheRow) {
        arrivalByStop.set(stopId, cacheRow);
      }
      continue;
    }

    try {
      const arrival1 = await fetchArrivalFromApi(stop, serviceKey);
      const payload = {
        stop_id: stopId,
        arrival1,
        stop_name: stop.name,
        route_number: stop.routeNumber,
        travel_direction: stop.travelDirection,
        fetched_at: new Date().toISOString(),
      };
      await admin.from("bus_arrival_cache").upsert(payload);
      arrivalByStop.set(stopId, payload);
    } catch {
      if (cacheRow) {
        arrivalByStop.set(stopId, cacheRow);
      }
    }
  }

  let sent = 0;
  let failed = 0;
  let rearmed = 0;
  const expiredEndpoints: string[] = [];

  for (const job of activeJobs) {
    const arrival = arrivalByStop.get(job.stopId);
    if (!arrival) continue;

    const within = isWithinThreshold(
      arrival.arrival1,
      job.row.threshold_minutes,
    );

    const { data: state } = await admin
      .from("bus_alarm_state")
      .select("armed")
      .eq("user_id", job.userId)
      .eq("stop_id", job.stopId)
      .maybeSingle();

    const armed = state?.armed ?? true;

    if (!within) {
      if (!armed) {
        await admin.from("bus_alarm_state").upsert({
          user_id: job.userId,
          stop_id: job.stopId,
          armed: true,
          updated_at: new Date().toISOString(),
        });
        rearmed += 1;
      }
      continue;
    }

    if (!armed) continue;

    const { data: subscriptions, error: subError } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", job.userId);

    if (subError || !subscriptions?.length) continue;

    const title = `${arrival.route_number}번 버스 곧 도착`;
    const body = `${arrival.stop_name.replace(/\s+/g, "")} · ${arrival.arrival1}`;
    const payload = JSON.stringify({
      title,
      body,
      tag: `bus-alarm:${job.stopId}`,
      url: "/bus",
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
      await admin.from("bus_alarm_state").upsert({
        user_id: job.userId,
        stop_id: job.stopId,
        armed: false,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (expiredEndpoints.length > 0) {
    const unique = [...new Set(expiredEndpoints)];
    await admin.from("push_subscriptions").delete().in("endpoint", unique);
  }

  return jsonResponse({
    enabled: settingsRows?.length ?? 0,
    active: activeJobs.length,
    stopsChecked: uniqueStopIds.length,
    sent,
    failed,
    rearmed,
    cleaned: expiredEndpoints.length,
  });
});
