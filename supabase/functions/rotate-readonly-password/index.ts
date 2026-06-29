import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TZ = "Asia/Seoul";

type ReadonlyScope = "full" | "personal_events";

interface ReadonlyAccountSpec {
  action: string;
  emailEnv: string;
  defaultEmail: string;
  scope: ReadonlyScope;
  label: string;
}

const READONLY_ACCOUNTS: ReadonlyAccountSpec[] = [
  {
    action: "setup",
    emailEnv: "READONLY_USER_EMAIL",
    defaultEmail: "readOnly@dashboard.local",
    scope: "full",
    label: "readOnly",
  },
  {
    action: "setup2",
    emailEnv: "READONLY2_USER_EMAIL",
    defaultEmail: "readOnly2@dashboard.local",
    scope: "personal_events",
    label: "readOnly2",
  },
];

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

function resolveAccountEmail(spec: ReadonlyAccountSpec): string {
  return Deno.env.get(spec.emailEnv) ?? spec.defaultEmail;
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

async function setupReadonlyAccount(
  admin: ReturnType<typeof createClient>,
  spec: ReadonlyAccountSpec,
  ownerId: string,
  password: string,
) {
  const email = resolveAccountEmail(spec);

  let readonlyId = await findUserIdByEmail(admin, email);

  if (!readonlyId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`${spec.label}: ${error.message}`);
    readonlyId = data.user.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(readonlyId, {
      password,
    });
    if (error) throw new Error(`${spec.label}: ${error.message}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: readonlyId,
      email,
      app_role: "readonly",
      data_owner_id: ownerId,
      readonly_scope: spec.scope,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(`${spec.label}: ${profileError.message}`);
  }

  return { email, readonlyId, scope: spec.scope };
}

async function rotateReadonlyAccount(
  admin: ReturnType<typeof createClient>,
  spec: ReadonlyAccountSpec,
  password: string,
) {
  const email = resolveAccountEmail(spec);
  const readonlyId = await findUserIdByEmail(admin, email);

  if (!readonlyId) {
    return {
      label: spec.label,
      email,
      skipped: true,
      reason: "user not found",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(readonlyId, {
    password,
  });

  if (error) {
    return {
      label: spec.label,
      email,
      skipped: true,
      reason: error.message,
    };
  }

  return {
    label: spec.label,
    email,
    readonlyUserId: readonlyId,
    appliedPassword: password,
    skipped: false,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!isAuthorized(req)) {
    return jsonResponse(
      {
        error: "Unauthorized",
        hint:
          "Authorization: Bearer <CRON_SECRET> 또는 x-cron-secret 헤더가 필요합니다.",
      },
      401,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const prefix = Deno.env.get("READONLY_PASSWORD_PREFIX") ?? "Qkdzk!";
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

  const setupSpec = READONLY_ACCOUNTS.find((item) => item.action === action);
  if (setupSpec) {
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

    try {
      const result = await setupReadonlyAccount(
        admin,
        setupSpec,
        ownerId,
        initialPassword,
      );

      return jsonResponse({
        action: setupSpec.action,
        label: setupSpec.label,
        ...result,
        ownerEmail,
        ownerUserId: ownerId,
        passwordRule: `${prefix}YYMM (KST)`,
        initialPasswordApplied: true,
        nextMonthlyPassword: monthlyPassword,
        readonlyScope: setupSpec.scope,
      });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : String(error) },
        500,
      );
    }
  }

  if (action === "setup-all") {
    if (!ownerEmail) {
      return jsonResponse(
        { error: "READONLY_OWNER_EMAIL secret is required for setup-all" },
        500,
      );
    }

    const ownerId = await findUserIdByEmail(admin, ownerEmail);
    if (!ownerId) {
      return jsonResponse({ error: `Owner not found: ${ownerEmail}` }, 404);
    }

    const initialPassword =
      Deno.env.get("READONLY_INITIAL_PASSWORD") ?? monthlyPassword;
    const results = [];

    for (const spec of READONLY_ACCOUNTS) {
      try {
        const result = await setupReadonlyAccount(
          admin,
          spec,
          ownerId,
          initialPassword,
        );
        results.push({ label: spec.label, ...result });
      } catch (error) {
        results.push({
          label: spec.label,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return jsonResponse({
      action: "setup-all",
      ownerEmail,
      ownerUserId: ownerId,
      passwordRule: `${prefix}YYMM (KST)`,
      accounts: results,
    });
  }

  if (action === "preview") {
    return jsonResponse({
      action: "preview",
      passwordRule: `${prefix}YYMM (KST)`,
      passwordForCurrentMonth: monthlyPassword,
      isFirstDayKst: isFirstDayOfMonthKst(),
      accounts: READONLY_ACCOUNTS.map((spec) => ({
        label: spec.label,
        email: resolveAccountEmail(spec),
        scope: spec.scope,
      })),
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

  const results = [];
  for (const spec of READONLY_ACCOUNTS) {
    results.push(await rotateReadonlyAccount(admin, spec, monthlyPassword));
  }

  const rotated = results.filter((item) => !item.skipped);

  if (rotated.length === 0) {
    return jsonResponse(
      {
        error:
          "변경할 읽기 전용 계정이 없습니다. action=setup 또는 setup-all 먼저 실행하세요.",
        results,
      },
      404,
    );
  }

  return jsonResponse({
    action: "rotate",
    passwordRule: `${prefix}YYMM (KST)`,
    forced: force,
    accounts: results,
  });
});
