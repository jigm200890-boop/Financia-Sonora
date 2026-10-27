const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-id",
};

const API_BASE = "https://api.enter.pro";
const PROJECT_ID = "b885ecded2984585bf8fd1af79255be1";

// Only models provisioned for this portal may be called from the browser.
const ALLOWED_MODELS: Record<string, string> = {
  "openai/gpt-5.5": "openai_responses",
  "anthropic/claude-sonnet-4.5": "anthropic_messages",
  "z-ai/glm-5.2": "openai_chat_completions",
  "alibaba/qwen-3.7-plus": "openai_chat_completions",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const ERROR_FALLBACKS: Record<string, string> = {
  authentication_error: "La autenticación con el servicio de IA falló.",
  permission_error: "La capacidad de IA está desactivada para este portal.",
  rate_limit_error: "Demasiadas solicitudes. Espera un momento.",
  insufficient_credits: "Se agotaron los créditos de IA del portal.",
  invalid_request_error: "La solicitud no es válida.",
  overloaded_error: "El servicio está saturado. Inténtalo de nuevo.",
  api_error: "El servicio de IA no está disponible.",
};

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractError(payload: unknown, raw: string): string {
  const data = payload as Record<string, unknown> | null;
  const envelope = data?.error as Record<string, unknown> | undefined;
  if (envelope && typeof envelope.message === "string") return envelope.message;
  if (typeof data?.message === "string") return data.message as string;
  const sseMatch = raw.match(/data: (.+)/);
  if (sseMatch) {
    try {
      const parsed = JSON.parse(sseMatch[1]) as Record<string, unknown>;
      const err = parsed.error as Record<string, unknown> | undefined;
      if (typeof err?.message === "string") return err.message;
    } catch {
      // ignore
    }
  }
  return "";
}

async function callAnthropic(
  token: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  sessionId: string,
) {
  const res = await fetch(`${API_BASE}/code/api/v1/ai/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      "X-Enter-Project-ID": PROJECT_ID,
    },
    body: JSON.stringify({ model, system, messages, stream: false, max_tokens: 2048 }),
    signal: AbortSignal.timeout(90000),
  });
  const raw = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    // ignore
  }
  if (!res.ok) {
    const message = extractError(payload, raw);
    const type = (payload as { error?: { type?: string } })?.error?.type ?? "api_error";
    throw new Error(message || ERROR_FALLBACKS[type] || "El servicio de IA no respondió.");
  }
  const blocks = ((payload as { content?: Array<{ type: string; text?: string }> }).content ?? []);
  return blocks
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n")
    .trim();
}

async function callChatCompletions(
  token: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  sessionId: string,
) {
  const res = await fetch(`${API_BASE}/code/api/v1/ai/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      "X-Enter-Project-ID": PROJECT_ID,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      stream: false,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(90000),
  });
  const raw = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    // ignore
  }
  if (!res.ok) {
    const message = extractError(payload, raw);
    const type = (payload as { error?: { type?: string } })?.error?.type ?? "api_error";
    throw new Error(message || ERROR_FALLBACKS[type] || "El servicio de IA no respondió.");
  }
  const content = (payload as {
    choices?: Array<{ message?: { content?: string } }>;
  }).choices?.[0]?.message?.content;
  return (content ?? "").trim();
}

async function callResponses(
  token: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  sessionId: string,
) {
  const res = await fetch(`${API_BASE}/code/api/v1/ai/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      "X-Enter-Project-ID": PROJECT_ID,
    },
    body: JSON.stringify({
      model,
      input: [{ role: "system", content: system }, ...messages],
      stream: false,
      max_output_tokens: 2048,
    }),
    signal: AbortSignal.timeout(90000),
  });
  const raw = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    // ignore
  }
  if (!res.ok) {
    const message = extractError(payload, raw);
    const type = (payload as { error?: { type?: string } })?.error?.type ?? "api_error";
    throw new Error(message || ERROR_FALLBACKS[type] || "El servicio de IA no respondió.");
  }
  const data = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  return (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("AI_API_TOKEN_b885ecded298");
    if (!token) {
      return jsonError("El portal no tiene configurada la capacidad de IA.", 500);
    }

    const body = await req.json().catch(() => null);
    const model = typeof body?.model === "string" ? body.model : "";
    const protocol = ALLOWED_MODELS[model];

    if (!protocol) {
      return jsonError("Ese agente no tiene un modelo autorizado en este portal.", 400);
    }

    const messages: ChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
          .filter(
            (m: unknown) =>
              !!m &&
              typeof (m as ChatMessage).content === "string" &&
              ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant"),
          )
          .slice(-16)
      : [];

    if (messages.length === 0) {
      return jsonError("Falta el mensaje.", 400);
    }

    const agentName = typeof body?.agentName === "string" ? body.agentName : "Asistente";
    const responsibilities =
      typeof body?.responsibilities === "string" ? body.responsibilities : "";
    const knowledge = typeof body?.knowledge === "string" ? body.knowledge : "";

    const system = [
      `Eres ${agentName}, un agente del Portal de Acceso Único de Financia Sonora.`,
      responsibilities ? `Tu función: ${responsibilities}` : "",
      "Respondes en español, con criterio operativo, sin inventar datos.",
      "Si no tienes un dato confirmado, lo dices y propones cómo verificarlo.",
      knowledge
        ? `Contexto autorizado de la base de conocimiento del portal:\n${knowledge.slice(0, 6000)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const sessionId = req.headers.get("X-Session-ID")?.trim() || crypto.randomUUID();

    let text = "";
    if (protocol === "anthropic_messages") {
      text = await callAnthropic(token, model, system, messages, sessionId);
    } else if (protocol === "openai_responses") {
      text = await callResponses(token, model, system, messages, sessionId);
    } else {
      text = await callChatCompletions(token, model, system, messages, sessionId);
    }

    if (!text) {
      return jsonError("El agente no devolvió texto. Inténtalo de nuevo.", 502);
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "El agente tardó demasiado en responder."
          : error.message
        : "Error inesperado del servicio de IA.";
    console.error("ai-matrix error", message);
    return jsonError(message, 502);
  }
});
