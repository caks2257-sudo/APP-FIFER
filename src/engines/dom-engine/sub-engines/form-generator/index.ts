/**
 * Sub-Engine `dom-engine:form-generator` — borradores de formularios municipales (MINVU / DOM Chile).
 */

import { EngineRegistry } from '@/registry/engine-registry';

import {
  generateFormDraft,
  type FormGeneratorFormType,
  type FormGeneratorProjectInput,
} from './mapper';
import type { MinvuForm21Draft } from './templates/minvu_2_1_edificacion';
import { MINVU_FORM_2_1_ID } from './templates/minvu_2_1_edificacion';

const SUB_ENGINE_ID = 'dom-engine:form-generator' as const;
const LOG_PREFIX = `[FIFER SubEngine ${SUB_ENGINE_ID}]`;

export type FormGeneratorSubEngineApi = {
  readonly id: typeof SUB_ENGINE_ID;
  /** Genera borrador JSON (plantilla + datos de proyecto). */
  generateFormDraft: (
    formType: FormGeneratorFormType,
    projectData: FormGeneratorProjectInput,
    options?: { generatedAt?: string },
  ) => MinvuForm21Draft;
  getHealthStatus: () => { ok: boolean; id: string };
};

class FormGeneratorSubEngine implements FormGeneratorSubEngineApi {
  readonly id = SUB_ENGINE_ID;

  generateFormDraft(
    formType: FormGeneratorFormType,
    projectData: FormGeneratorProjectInput,
    options?: { generatedAt?: string },
  ): MinvuForm21Draft {
    return generateFormDraft(formType, projectData, options);
  }

  getHealthStatus(): { ok: boolean; id: string } {
    return { ok: true, id: SUB_ENGINE_ID };
  }
}

try {
  EngineRegistry.register(SUB_ENGINE_ID, new FormGeneratorSubEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}

try {
  void SUB_ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}

export { MINVU_FORM_2_1_ID, generateFormDraft };
export type { FormGeneratorProjectInput, FormGeneratorFormType, MinvuForm21Draft };
