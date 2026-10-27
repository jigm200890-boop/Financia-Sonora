const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-id",
};

const LOGIN_HINTS = [
  'type="password"',
  "sign in",
  "log in",
  "login",
  "iniciar sesión",
  "iniciar sesion",
  "acceder",
  "continue with google",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const checkedAt = new Date().toISOString();

  try {
    const body = await req.json().catch(() => null);
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";

    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "Falta la URL a verificar." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return new Response(JSON.stringify({ error: "La URL no es válida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Solo se permiten enlaces http o https." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const started = Date.now();

    try {
      const response = await fetch(target.toString(), {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "FinanciaSonora-Portal/1.0" },
        signal: AbortSignal.timeout(9000),
      });

      const durationMs = Date.now() - started;
      const finalUrl = response.url || target.toString();
      let result = "reachable";
      let detail = `HTTP ${response.status} · el sistema responde`;

      if (response.status === 401 || response.status === 403) {
        result = "auth_required";
        detail = `HTTP ${response.status} · requiere autenticación`;
      } else if (response.status >= 400) {
        result = "unavailable";
        detail = `HTTP ${response.status} · el sistema respondió con error`;
      } else {
        const text = (await response.text()).slice(0, 250000).toLowerCase();
        const pathHint = /login|signin|sign-in|auth|acceder|entrar/i.test(
          new URL(finalUrl).pathname,
        );
        if (pathHint || LOGIN_HINTS.some((hint) => text.includes(hint))) {
          result = "auth_required";
          detail = "Responde correctamente, pero pide iniciar sesión";
        }
      }

      return new Response(
        JSON.stringify({
          result,
          detail,
          httpStatus: response.status,
          finalUrl,
          durationMs,
          checkedAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === "TimeoutError"
            ? "Sin respuesta en 9 segundos"
            : error.message
          : "No se pudo conectar";
      console.error("check-endpoint unreachable", target.toString(), message);
      return new Response(
        JSON.stringify({
          result: "unavailable",
          detail: message,
          httpStatus: null,
          finalUrl: target.toString(),
          durationMs: Date.now() - started,
          checkedAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("check-endpoint error", error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: "No se pudo verificar el enlace." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
