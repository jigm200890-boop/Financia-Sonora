const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-id",
};

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_CHARS = 150000;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeXml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractPdf(buffer: ArrayBuffer) {
  const mod = await import("https://esm.sh/unpdf@0.12.1");
  const pdf = await mod.getDocumentProxy(new Uint8Array(buffer));
  const result = await mod.extractText(pdf, { mergePages: true });
  const text = typeof result === "string" ? result : (result as { text?: string }).text ?? "";
  return { text, detail: `PDF · ${pdf.numPages ?? "?"} páginas` };
}

async function extractDocx(buffer: ArrayBuffer) {
  const mod = await import("https://esm.sh/jszip@3.10.1");
  const JSZip = ((mod as { default?: unknown }).default ?? mod) as {
    loadAsync: (data: ArrayBuffer) => Promise<{
      file: (path: string) => { async: (type: "string") => Promise<string> } | null;
    }>;
  };
  const zip = await JSZip.loadAsync(buffer);
  const document = zip.file("word/document.xml");
  if (!document) return { text: "", detail: "Word" };
  const xml = await document.async("string");
  const text = xml
    .replace(/<w:tab\/?>/g, "\t")
    .replace(/<w:br\/?>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, detail: "Word" };
}

async function extractXlsx(buffer: ArrayBuffer) {
  const mod = await import("https://esm.sh/xlsx@0.18.5");
  const xlsx = ((mod as { default?: unknown }).default ?? mod) as {
    read: (data: Uint8Array, options: { type: string }) => {
      SheetNames: string[];
      Sheets: Record<string, unknown>;
    };
    utils: { sheet_to_csv: (sheet: unknown) => string };
  };
  const workbook = xlsx.read(new Uint8Array(buffer), { type: "array" });
  const parts = workbook.SheetNames.map(
    (name) => `## ${name}\n${xlsx.utils.sheet_to_csv(workbook.Sheets[name])}`,
  );
  return { text: parts.join("\n\n"), detail: `Excel · ${workbook.SheetNames.length} hojas` };
}

async function extractPptx(buffer: ArrayBuffer) {
  const mod = await import("https://esm.sh/jszip@3.10.1");
  const JSZip = ((mod as { default?: unknown }).default ?? mod) as {
    loadAsync: (data: ArrayBuffer) => Promise<{
      files: Record<string, { name: string }>;
      file: (path: string) => { async: (type: "string") => Promise<string> } | null;
    }>;
  };
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
      return na - nb;
    });

  const parts: string[] = [];
  for (const [index, path] of slides.entries()) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async("string");
    parts.push(`## Diapositiva ${index + 1}\n${decodeXml(xml)}`);
  }
  return { text: parts.join("\n\n"), detail: `PowerPoint · ${slides.length} diapositivas` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";

    if (!url) return json({ error: "Falta la URL del documento." }, 400);

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return json({ error: "La URL no es válida." }, 400);
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      return json({ error: "Solo se permiten enlaces http o https." }, 400);
    }

    const response = await fetch(target.toString(), {
      headers: { "User-Agent": "FinanciaSonora-Portal/1.0" },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      return json({ error: `No se pudo descargar el documento (HTTP ${response.status}).` }, 422);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return json({ error: "El documento supera los 20 MB permitidos." }, 413);
    }

    const extension = (fileName.split(".").pop() ?? "").toLowerCase();
    const kind = mimeType.includes("pdf")
      ? "pdf"
      : mimeType.includes("wordprocessingml") || extension === "docx"
        ? "docx"
        : mimeType.includes("spreadsheetml") || extension === "xlsx"
          ? "xlsx"
          : mimeType.includes("presentationml") || extension === "pptx"
            ? "pptx"
            : extension;

    let result: { text: string; detail: string };

    if (kind === "pdf") {
      result = await extractPdf(buffer);
    } else if (kind === "docx") {
      result = await extractDocx(buffer);
    } else if (kind === "xlsx" || kind === "xls" || kind === "csv") {
      result = await extractXlsx(buffer);
    } else if (kind === "pptx") {
      result = await extractPptx(buffer);
    } else if (kind === "txt" || kind === "md" || kind === "json") {
      result = { text: new TextDecoder().decode(buffer), detail: "Texto plano" };
    } else {
      return json(
        { error: "Formato no soportado para lectura. Usa PDF, Word, Excel, PowerPoint o TXT." },
        415,
      );
    }

    const text = result.text
      .split(String.fromCharCode(0))
      .join("")
      .trim()
      .slice(0, MAX_CHARS);

    if (!text) {
      return json(
        {
          error:
            "No se pudo extraer texto. Puede ser un PDF escaneado (requiere OCR) o un archivo protegido.",
        },
        422,
      );
    }

    return json({ text, chars: text.length, detail: result.detail });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "La lectura tardó demasiado."
          : error.message
        : "No se pudo leer el documento.";
    console.error("extract-document error", message);
    return json({ error: message }, 500);
  }
});
