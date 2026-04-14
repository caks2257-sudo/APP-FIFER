import { z } from 'zod';

export const OrchestratorDecisionSchema = z.object({
  intent: z.enum([
    'NAVIGATE',
    'STREAM_UI',
    'GUIDED_OVERLAY',
    'SYSTEM_WAR_ROOM',
    'DISAMBIGUATE',
    'TEXT_ONLY',
    'ERROR',
    'CREATE_APP_FROM_URL',
  ]),
  targetModuleId: z
    .string()
    .nullable()
    .describe(
      'ID del módulo FIFER cuando el intent enruta a un módulo concreto (p. ej. NAVIGATE, STREAM_UI, GUIDED_OVERLAY). ' +
        'Debe ser null para TEXT_ONLY, ERROR, DISAMBIGUATE, CREATE_APP_FROM_URL y cuando no haya módulo destino.',
    ),
  sourceUrl: z
    .string()
    .nullable()
    .describe('URL extraída del prompt para crear la app. Null si no aplica.'),
  scaffoldBusinessName: z
    .string()
    .nullable()
    .describe('Nombre inferido del negocio. Null si no aplica.'),
  scaffoldProposedModules: z
    .array(
      z.object({
        moduleId: z.string(),
        moduleName: z.string(),
        justification: z.string(),
      }),
    )
    .nullable()
    .describe('Módulos propuestos para la nueva app. Null si no aplica.'),
  visualWidgets: z
    .array(z.string())
    .nullable()
    .describe(
      'IDs de los widgets a invocar. Si no aplica, debes devolver null explícitamente.',
    ),
  reasoning: z.string().describe(
    'Mensaje directo y amigable para el usuario (en primera persona). Si el intent es DISAMBIGUATE, formula la pregunta aclaratoria aquí (ej. \'Veo que quieres una campaña. ¿Será para redes sociales o para afiliados?\').',
  ),
});

export type OrchestratorDecision = z.infer<typeof OrchestratorDecisionSchema>;
