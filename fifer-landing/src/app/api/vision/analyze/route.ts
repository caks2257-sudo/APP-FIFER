import { NextResponse } from "next/server";
import type { VisionAnalyzeResponse } from "@/types/vision-analyze";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

function mockFromFileName(fileName: string): VisionAnalyzeResponse {
  const lower = fileName.toLowerCase();
  if (/factura|invoice|boleta|abkupfer|madera/.test(lower)) {
    return {
      source: "mock",
      extractedText:
        "FACTURA — ABKUPFER / Proveedor\nProveedor: Maderas del Sur\nConcepto: OSB 18mm · 24 m²\nTotal: $450.000 CLP (IVA incl.)",
      suggestedActions: [
        { id: "register_expense", label: "¿Registrar gasto de materiales en finanzas?" },
        { id: "tag_stock", label: "¿Vincular con stock de madera?" },
      ],
    };
  }
  if (/plano|plan|obra|chicureo|lote/.test(lower)) {
    return {
      source: "mock",
      extractedText:
        "PLANO — Lote 12B · Chicureo\nEscala 1:100 · Estructura LOSA\nNotas: murete perímetro 2.4 m",
      suggestedActions: [
        { id: "open_tramites", label: "¿Abrir trámites del proyecto?" },
        { id: "measure_takeoff", label: "¿Extraer m² para presupuesto?" },
      ],
    };
  }
  return {
    source: "mock",
    extractedText:
      "Vista previa (sin OCR en servidor). Sube una imagen o configura GEMINI_API_KEY para OCR real.",
    suggestedActions: [{ id: "save_note", label: "¿Guardar esta imagen en el proyecto?" }],
  };
}

function stripJsonFence(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return t.trim();
}

async function tryGemini(base64: string, mime: string): Promise<VisionAnalyzeResponse | null> {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Eres FIFER (obra Chicureo + ABKupfer). Analiza la imagen (factura, plano, etiqueta).
Responde SOLO un JSON válido con esta forma exacta:
{"extractedText":"string","suggestedActions":[{"id":"string","label":"string"}]}
suggestedActions: 1 a 3 acciones en español, útiles para el usuario (ej. registrar gasto, trámite plano).`,
              },
              { inline_data: { mime_type: mime, data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini vacío");
  const parsed = JSON.parse(stripJsonFence(raw)) as VisionAnalyzeResponse;
  if (!parsed.extractedText || !Array.isArray(parsed.suggestedActions)) {
    throw new Error("JSON inválido");
  }
  return { ...parsed, source: "gemini" };
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }
  const file = form.get("image");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Falta imagen" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx. 4 MB)" }, { status: 400 });
  }
  const mime = file.type || "image/jpeg";
  if (!/^image\//.test(mime)) {
    return NextResponse.json({ error: "Solo imágenes" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const name = file instanceof File ? file.name : "upload";
  const baseMock = mockFromFileName(name);

  try {
    const gemini = await tryGemini(base64, mime);
    if (gemini) return NextResponse.json(gemini);
  } catch {
    /* fallback mock */
  }

  return NextResponse.json(baseMock);
}
