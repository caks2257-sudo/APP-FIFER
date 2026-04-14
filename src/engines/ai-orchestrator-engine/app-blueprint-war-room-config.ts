import { z } from 'zod';

import { FIFER_MODULE_MANIFESTS } from '@/registry/discovery-registry';
import type { WarRoomConfig } from '@/types/war-room';

export const blueprintProposedModuleSchema = z.object({
  moduleId: z
    .string()
    .describe('ID del módulo FIFER (p. ej. finance-core, social-media-core, affiliates-beauty).'),
  moduleName: z.string(),
  justification: z.string().describe('Por qué este módulo encaja con este negocio.'),
});

export const appBlueprintWarRoomInputSchema = z.object({
  urlScanned: z.string().describe('URL que proporcionó el usuario.'),
  businessName: z.string().describe('Nombre inferido del negocio (p. ej. desde el dominio).'),
  proposedModules: z.array(blueprintProposedModuleSchema),
});

export type AppBlueprintWarRoomInput = z.infer<typeof appBlueprintWarRoomInputSchema>;

export type BlueprintProposedModuleRow = AppBlueprintWarRoomInput['proposedModules'][number];

/**
 * Preserva **todos** los módulos que devuelve el clasificador (sin filtrar por rubro manualmente):
 * deduplica por `moduleId`, rellena nombres/justificación desde manifiesto si vienen vacíos.
 */
export function normalizeClassifierBlueprintModules(
  modules: readonly BlueprintProposedModuleRow[],
): BlueprintProposedModuleRow[] {
  const seen = new Set<string>();
  const out: BlueprintProposedModuleRow[] = [];
  for (const raw of modules) {
    const moduleId = raw.moduleId?.trim();
    if (!moduleId || seen.has(moduleId)) continue;
    seen.add(moduleId);
    const manifest = FIFER_MODULE_MANIFESTS.find((m) => m.moduleId === moduleId);
    const moduleName = raw.moduleName?.trim() || manifest?.name || moduleId;
    const justification =
      raw.justification?.trim() ||
      manifest?.description ||
      'Capacidad declarada en el manifiesto FIFER.';
    out.push({ moduleId, moduleName, justification });
  }
  return out;
}

/** Módulos del manifiesto FIFER como sugerencia conservadora si el clasificador no lista ninguno. */
export function defaultBlueprintProposedModules(): AppBlueprintWarRoomInput['proposedModules'] {
  return [
    {
      moduleId: 'finance-core',
      moduleName: 'Finanzas Core',
      justification:
        'Cobros, conciliación y visibilidad de caja para la operación diaria del negocio.',
    },
    {
      moduleId: 'social-media-core',
      moduleName: 'Redes sociales',
      justification: 'Difusión y captación en canales que suelen acompañar presencia web.',
    },
  ];
}

export function extractUrlFromUserText(text: string): string {
  const m = text.match(
    /\bhttps?:\/\/[^\s<>"'{}|\\^`[\]]+\b|\b(?:www\.)?[a-z0-9][-a-z0-9]*\.[a-z]{2,}(?:\/[^\s<>"'{}|\\^`[\]]*)?\b/i,
  );
  return (m?.[0] ?? '').trim();
}

export function normalizeUrlScanned(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, '')}`;
}

export function inferBusinessNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, '');
    const seg = host.split('.')[0] ?? 'app';
    if (!seg) return 'App';
    return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
  } catch {
    return 'App';
  }
}

export function buildWarRoomConfigFromBlueprintInput(
  params: AppBlueprintWarRoomInput,
): WarRoomConfig {
  const url = normalizeUrlScanned(params.urlScanned.trim()) || 'https://';
  const proposedModules = normalizeClassifierBlueprintModules(params.proposedModules);
  return {
    title: `Blueprint for ${params.businessName} App`,
    description: `Tras un análisis inicial de ${params.urlScanned.trim()}, esta es la arquitectura recomendada para tu sub-app dentro de FIFER. Activa solo los módulos declarados en manifiesto y que quieras provisionar.`,
    targetAction: 'CREATE_MASTER_APP',
    sections: [
      {
        title: 'Recommended Core Modules',
        fields: proposedModules.map((mod) => ({
          id: `enable_${mod.moduleId}`,
          type: 'checkbox' as const,
          label: `${mod.moduleName} — ${mod.justification}`,
        })),
      },
      {
        title: 'Data Sources',
        fields: [
          {
            id: 'primary_url',
            type: 'url' as const,
            label: 'Primary domain',
            defaultValue: url,
          },
        ],
      },
    ],
    actionButtonText: 'Provision Architecture & Initialize App',
  };
}
