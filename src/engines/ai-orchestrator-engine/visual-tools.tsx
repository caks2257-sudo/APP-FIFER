/**
 * Registro de Herramientas Visuales — Generative UI (v10.0)
 * Permite al LLM inyectar componentes React directamente en el flujo del chat.
 */
import { z } from 'zod';

import { BankConnectionWidget } from "@/components/dashboard/widgets/BankConnectionWidget";
import { CampaignWarRoom } from "@/components/dashboard/widgets/CampaignWarRoom";
import { CashFlowWidget } from "@/components/dashboard/widgets/CashFlowWidget";
import { SmartWarRoom } from "@/components/dashboard/widgets/SmartWarRoom";
import BankConnectionWizard from "@/components/integrations/BankConnectionWizard";
import { getFinanceDashboardData } from "@/actions/finance";
import { warRoomConfigSchema, type WarRoomConfig } from "@/types/war-room";

import {
  appBlueprintWarRoomInputSchema,
  buildWarRoomConfigFromBlueprintInput,
  type AppBlueprintWarRoomInput,
} from "./app-blueprint-war-room-config";

export const visualTools = {
  mostrarFlujoCaja: {
    description: 'Muestra un widget detallado con los ingresos y egresos proyectados del mes.',
    inputSchema: z.object({}), // No necesita parámetros para la vista general
    generate: async function* () {
      yield <div>Calculando proyecciones...</div>; // Skeleton inicial
      const data = await getFinanceDashboardData();
      if (!data.ok || !data.hasAccount) {
        return <div>No hay datos de flujo de caja disponibles.</div>;
      }
      return <CashFlowWidget report={data.cashFlowReport} />;
    },
  },
  mostrarEstadoBanco: {
    description: 'Muestra el saldo actual y estado de conexión de la cuenta bancaria principal.',
    inputSchema: z.object({}),
    generate: async function* () {
      yield <div>Conectando con el nodo bancario...</div>;
      const data = await getFinanceDashboardData();
      if (!data.ok || !data.hasAccount) {
        return <div>No hay datos bancarios disponibles.</div>;
      }
      return <BankConnectionWidget account={data.fintocAccount} />;
    },
  },
  configuradorCampana: {
    description:
      'Abre el War Room (panel amplio) para configurar bots de scraping de afiliados y publicación en redes sociales.',
    inputSchema: z.object({}),
    generate: async function* () {
      return <CampaignWarRoom />;
    },
  },
  constructorWarRoom: {
    description:
      'Genera el panel de configuración inicial (War Room) para crear una App, agregar una Sub-App o lanzar un Bot. REGLA DE ORO: NO INVENTES integraciones. Usa SOLO las capacidades que el usuario mencionó y que son lógicas. Si el usuario da una URL, inclúyela como valor por defecto en un campo url con valor inicial vacío y label que refleje esa URL.',
    inputSchema: warRoomConfigSchema.describe(
      'Esquema estricto del formulario dinámico; cada field.id debe ser único.',
    ),
    generate: async function* (input: WarRoomConfig) {
      return <SmartWarRoom config={input} />;
    },
  },
  appBlueprintWarRoom: {
    description:
      'Genera el War Room (overlay amplio) que propone la arquitectura de una nueva sub-app a partir de una URL. Sugiere módulos FIFER lógicos según el tipo de negocio (p. ej. e-commerce: Finanzas y Marketing/redes), usando SOLO moduleIds que existan en manifiestos. No inventes integraciones externas.',
    inputSchema: appBlueprintWarRoomInputSchema,
    generate: async function* (input: AppBlueprintWarRoomInput) {
      // buildWarRoomConfigFromBlueprintInput normaliza y deduplica **todos** los proposedModules (sin filtrar a un solo módulo).
      const config = buildWarRoomConfigFromBlueprintInput(input);
      return <SmartWarRoom config={config} />;
    },
  },
  bankConnectionWizard: {
    description:
      'Abre el asistente de integracion bancaria simulada (Fintoc/Plaid mock) para conectar cuentas por contexto de negocio.',
    inputSchema: z.object({
      appContext: z
        .string()
        .optional()
        .describe('Contexto del negocio, por ejemplo: ab-kupfer o global.'),
    }),
    generate: async function* (input: { appContext?: string }) {
      const context = input.appContext?.trim() || 'global';
      return <BankConnectionWizard appContext={context} />;
    },
  },
};