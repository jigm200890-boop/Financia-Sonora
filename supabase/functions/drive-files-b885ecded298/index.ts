const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-id",
};

const GATEWAY = "https://api.enter.pro/code/api/v1/edge-function/connectors/operations";
const OP_FIND = "ddf010bf-5b43-4683-b97f-e000b8991caf";
const OP_ABOUT = "dfbe0873-d142-4482-93b4-e16b0434a173";
const PROJECT_ID = "b885ecded2984585bf8fd1af79255be1";
const FALLBACK_URL = "https://spb-t4n79jd9zs5d500d.supabase.opentrust.net";
const FALLBACK_ANON =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsInJlZiI6InNwYi10NG43OWpkOXpzNWQ1MDBkIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3OTMwOTgwNjEsImV4cCI6MjEwODY3NDA2MX0.2DrVaZS1793EHfgmhHHGGm9xOV7dB0NY7ZCNUvniqWM";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function subjectFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return typeof decoded?.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
}

async function isPortalAdmin(authHeader: string, token: string) {
  const sub = subjectFromToken(token);
  if (!sub) return false;

  const url = Deno.env.get("SUPABASE_URL") ?? FALLBACK_URL;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? FALLBACK_ANON;

  const response = await fetch(
    `${url}/rest/v1/portal_profiles?select=role&id=eq.${sub}`,
    { headers: { apikey: anon, Authorization: authHeader } },
  );
  if (!response.ok) return false;
  const rows = (await response.json()) as Array<{ role?: string }>;
  return rows?.[0]?.role === "admin";
}

async function callOperation(operationId: string, token: string, input: unknown) {
  const response = await fetch(`${GATEWAY}/${operationId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Enter-Project-ID": PROJECT_ID,
    },
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(30000),
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // texto plano
  }
  return { ok: response.ok, status: response.status, payload };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("CONNECTOR_RUNTIME_TOKEN_b885ecded298_1043");
    if (!token) {
      return json({ error: "El conector de Drive no está configurado." }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!(await isPortalAdmin(authHeader, authHeader.replace(/^Bearer\s+/i, "")))) {
      return json({ error: "Solo el administrador del portal puede consultar Drive." }, 403);
    }

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "list";

    if (action === "about") {
      const result = await callOperation(OP_ABOUT, token, {});
      if (!result.ok) {
        return json({ error: "Drive no respondió.", detail: result.payload }, 502);
      }
      return json({ ok: true, data: result.payload });
    }

    if (action === "list") {
      const query =
        typeof body?.query === "string" && body.query.trim()
          ? body.query.trim()
          : "trashed = false";
      const pageSize = Math.min(Math.max(Number(body?.pageSize) || 25, 1), 50);
      const orderBy =
        typeof body?.orderBy === "string" && body.orderBy.trim()
          ? body.orderBy.trim()
          : "modifiedTime desc";

      const result = await callOperation(OP_FIND, token, {
        q: query,
        pageSize,
        orderBy,
        corpora: "allDrives",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      if (!result.ok) {
        return json({ error: "Drive no respondió.", detail: result.payload }, 502);
      }

      const raw = result.payload as {
        data?: { files?: Array<Record<string, unknown>> };
        files?: Array<Record<string, unknown>>;
      };
      const files = raw?.data?.files ?? raw?.files ?? [];

      return json({
        ok: true,
        files: files.map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          size: file.size,
          webViewLink: file.webViewLink,
          parents: file.parents,
        })),
      });
    }

    return json({ error: "Acción no válida." }, 400);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "Drive tardó demasiado en responder."
          : error.message
        : "Error al consultar Drive.";
    console.error("drive-files error", message);
    return json({ error: message }, 502);
  }
});
