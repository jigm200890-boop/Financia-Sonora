const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-id",
};

const BASE = "https://superagent-6620a3dd.base44.app/functions";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callLinea(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // Se devuelve como texto si no es JSON.
  }

  return { ok: response.ok, status: response.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clave = (Deno.env.get("LINEA_FS_CLAVE") ?? "").trim();
    if (!clave) {
      return json({ error: "La línea compartida no tiene clave configurada." }, 500);
    }

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "read") {
      const result = await callLinea("lineaLeer", { clave });
      return json({ action, ...result });
    }

    if (action === "write") {
      const asunto = typeof body?.asunto === "string" ? body.asunto.trim() : "";
      const resumen = typeof body?.resumen === "string" ? body.resumen.trim() : "";
      const etiquetas = typeof body?.etiquetas === "string" ? body.etiquetas.trim() : "";

      if (!asunto || !resumen) {
        return json({ error: "Asunto y resumen son obligatorios." }, 400);
      }

      const result = await callLinea("lineaAgregar", {
        clave,
        agente: "Atlas (ENTER)",
        asunto,
        resumen,
        etiquetas,
        fuente: "API",
      });
      return json({ action, ...result });
    }

    return json({ error: "Acción no válida." }, 400);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "La línea compartida no respondió a tiempo."
          : error.message
        : "Error al contactar la línea compartida.";
    console.error("linea-fs error", message);
    return json({ error: message }, 502);
  }
});
