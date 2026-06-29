import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TZ = "Asia/Seoul";

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

  const authHeader = req.headers.get("Authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  return req.headers.get("x-cron-secret") === cronSecret;
}

/** Qkdzk!2607 → 접두어 Qkdzk! + YY(26) + MM(07), KST 기준 */
export function computeReadonlyPassword(
  prefix: string,
  at: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "2-digit",
    month: "2-digit",
  }).formatToParts(at);

  const yy = parts.find((p) => p.type === "year")?.value ?? "00";
  const mm = parts.find((p) => p.type === "month")?.value ?? "01";

  return `${prefix}${yy}${mm}`;
}

function isFirstDayOfMonthKst(at: Date = new Date()): boolean {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    day: "numeric",
  }).format(at);

  return day === "1";
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === normalized,
    );
    if (match) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
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
  const prefix = Deno.env.get("READONLY_PASSWORD_PREFIX") ?? "Qkdzk!";
  const readonlyEmail = Deno.env.get("READONLY_USER_EMAIL") ?? "readOnly@dashboard.local";
  const ownerEmail = Deno.env.get("READONLY_OWNER_EMAIL");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing server configuration" }, 500);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "rotate";
  const force = url.searchParams.get("force") === "1";

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const monthlyPassword = computeReadonlyPassword(prefix);

  if (action === "setup") {
    if (!ownerEmail) {
      return jsonResponse(
        { error: "READONLY_OWNER_EMAIL secret is required for setup" },
        500,
      );
    }

    const ownerId = await findUserIdByEmail(admin, ownerEmail);
    if (!ownerId) {
      return jsonResponse({ error: `Owner not found: ${ownerEmail}` }, 404);
    }

    const initialPassword =
      Deno.env.get("READONLY_INITIAL_PASSWORD") ?? monthlyPassword;

    let readonlyId = await findUserIdByEmail(admin, readonlyEmail);

    if (!readonlyId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: readonlyEmail,
        password: initialPassword,
        email_confirm: true,
      });
      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }
      readonlyId = data.user.id;
    } else {
      const { error } = await admin.auth.admin.updateUserById(readonlyId, {
        password: initialPassword,
      });
      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: readonlyId,
        email: readonlyEmail,
        app_role: "readonly",
        data_owner_id: ownerId,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 500);
    }

    return jsonResponse({
      action: "setup",
      readonlyEmail,
      readonlyUserId: readonlyId,
      ownerEmail,
      ownerUserId: ownerId,
      passwordRule: `${prefix}YYMM (KST)`,
      initialPasswordApplied: true,
      nextMonthlyPassword: monthlyPassword,
      note: "초기 비밀번호는 READONLY_INITIAL_PASSWORD 또는 당월 규칙 비밀번호입니다.",
    });
  }

  if (action === "preview") {
    return jsonResponse({
      action: "preview",
      readonlyEmail,
      passwordRule: `${prefix}YYMM (KST)`,
      passwordForCurrentMonth: monthlyPassword,
      isFirstDayKst: isFirstDayOfMonthKst(),
    });
  }

  if (!force && !isFirstDayOfMonthKst()) {
    return jsonResponse({
      action: "rotate",
      skipped: true,
      reason: "KST 기준 매월 1일이 아닙니다. 테스트는 ?force=1",
      passwordForCurrentMonth: monthlyPassword,
    });
  }

  const readonlyId = await findUserIdByEmail(admin, readonlyEmail);
  if (!readonlyId) {
    return jsonResponse(
      {
        error: `Readonly user not found: ${readonlyEmail}. action=setup 먼저 실행하세요.`,
      },
      404,
    );
  }

  const { error } = await admin.auth.admin.updateUserById(readonlyId, {
    password: monthlyPassword,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    action: "rotate",
    readonlyEmail,
    readonlyUserId: readonlyId,
    passwordRule: `${prefix}YYMM (KST)`,
    appliedPassword: monthlyPassword,
    forced: force,
  });
});
