/**
 * Semilla de catálogo IA — bootstrap cuando `fifer_ai_meta` está vacío o sin Supabase.
 * @see `engine-manifest.ts` — runtime reactivo desde DB.
 */

import type { IAiEngine } from "@/lib/ai/ai-engine-types";

export const ENGINE_MANIFEST_SEED: readonly IAiEngine[] = [
  {
    id: "openai-gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description:
      "Modelo multimodal principal: razonamiento, código y análisis con baja latencia relativa a la familia o-series.",
    specialty: "Lógica matemática y orquestación de tareas complejas",
    costPerUnit: 0.005,
    unitType: "tokens",
    ranking: {
      general: 9.2,
      taskSpecific: {
        matematicas: 9.6,
        codigo: 9.4,
        razonamiento: 9.5,
        finanzas: 9.3,
        chicureo: 9.0,
      },
    },
  },
  {
    id: "openai-gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "OpenAI",
    description: "Variante económica para clasificación, borradores y pipelines de alto volumen.",
    specialty: "Alto volumen y clasificación ligera",
    costPerUnit: 0.00015,
    unitType: "tokens",
    ranking: {
      general: 8.0,
      taskSpecific: {
        clasificacion: 8.5,
        borradores: 8.4,
        resumenes: 8.2,
        costo: 9.5,
      },
    },
  },
  {
    id: "google-gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    description: "Gran ventana de contexto para documentos largos, contratos y briefs multi-página.",
    specialty: "Contexto largo y síntesis documental",
    costPerUnit: 0.0035,
    unitType: "tokens",
    ranking: {
      general: 8.9,
      taskSpecific: {
        documentos: 9.5,
        sintesis: 9.2,
        legal: 8.8,
        contexto_largo: 9.6,
      },
    },
  },
  {
    id: "google-gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "Google",
    description: "Refinamiento de prompts y respuestas rápidas en el Dual-Stage (Etapa 1).",
    specialty: "Velocidad y refinamiento de instrucciones",
    costPerUnit: 0.000075,
    unitType: "tokens",
    ranking: {
      general: 8.3,
      taskSpecific: {
        refinamiento: 9.2,
        latencia: 9.4,
        prompts: 9.0,
        creatividad: 7.8,
      },
    },
  },
  {
    id: "anthropic-claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Editorial técnica, redacción de catálogo ABKupfer y generación de código legible.",
    specialty: "Redacción editorial técnica y código",
    costPerUnit: 0.003,
    unitType: "tokens",
    ranking: {
      general: 8.8,
      taskSpecific: {
        editorial: 9.5,
        codigo: 9.2,
        abkupfer: 9.3,
        madera: 8.9,
        creatividad: 8.7,
      },
    },
  },
  {
    id: "leonardo-ai-generations",
    name: "Leonardo.ai",
    provider: "Leonardo.ai",
    description: "Renders de arquitectura, texturas de madera y acabados para visualización inmobiliaria.",
    specialty: "Texturas de madera y renders arquitectónicos",
    costPerUnit: 0.04,
    unitType: "images",
    ranking: {
      general: 8.9,
      taskSpecific: {
        texturas: 9.7,
        madera: 9.8,
        arquitectura: 9.4,
        abkupfer: 9.2,
        producto: 8.8,
      },
    },
  },
  {
    id: "openai-dall-e-3",
    name: "DALL·E 3",
    provider: "OpenAI",
    description: "Imágenes con texto legible e infografías para campañas y fichas comerciales.",
    specialty: "Texto dentro de imagen e infografías",
    costPerUnit: 0.08,
    unitType: "images",
    ranking: {
      general: 8.5,
      taskSpecific: {
        infografias: 9.3,
        texto_en_imagen: 9.6,
        marketing: 8.9,
        creatividad: 8.6,
      },
    },
  },
  {
    id: "elevenlabs-tts",
    name: "ElevenLabs",
    provider: "ElevenLabs",
    description: "Voz sintética de marca para mini-series, narración y feedback en modo Live.",
    specialty: "Voz natural y narración",
    costPerUnit: 0.00003,
    unitType: "characters",
    ranking: {
      general: 8.7,
      taskSpecific: {
        voz: 9.5,
        narracion: 9.4,
        audio: 9.2,
        live: 9.0,
      },
    },
  },
  {
    id: "runway-gen-3",
    name: "Runway Gen-3 Alpha",
    provider: "Runway",
    description: "Imagen a vídeo cinemático para revestimientos, fachadas y mood boards en movimiento.",
    specialty: "Video realista desde imagen",
    costPerUnit: 0.12,
    unitType: "seconds",
    ranking: {
      general: 8.8,
      taskSpecific: {
        video: 9.5,
        cinematico: 9.4,
        revestimiento: 9.2,
        fachada: 9.1,
        movimiento: 9.0,
      },
    },
  },
  {
    id: "luma-dream-machine",
    name: "Luma Dream Machine",
    provider: "Luma",
    description: "Generación y continuación de vídeo con fuerte sensación de cámara y espacio 3D.",
    specialty: "Video fluido y continuidad de escena",
    costPerUnit: 0.1,
    unitType: "seconds",
    ranking: {
      general: 8.6,
      taskSpecific: {
        video: 9.2,
        continuidad: 9.3,
        espacio: 9.0,
        recorrido: 8.9,
      },
    },
  },
];
