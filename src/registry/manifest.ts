export type FiferModuleAccessLevel = 'admin' | 'user';

export type FiferModulePreferredUI =
  | 'DASHBOARD_WIDGET'
  | 'GUIDED_OVERLAY'
  | 'SYSTEM_WAR_ROOM'
  | 'FULL_APP_REDIRECT';

export interface FiferModuleManifest {
  /** Identificador unico e inmutable del modulo. */
  moduleId: string;
  /** Nombre legible para humanos. */
  name: string;
  /** Contexto funcional para el entendimiento del LLM. */
  description: string;
  /** Palabras clave semanticas para disparar el modulo. */
  keywords: string[];
  /** Nivel de acceso requerido para activar el modulo. */
  accessLevel: FiferModuleAccessLevel;
  /** Modo de presentacion sugerido por el modulo. */
  preferredUI: FiferModulePreferredUI;
  /** Pregunta sugerida cuando el prompt coincide con varios modulos. */
  disambiguationPrompt?: string;
  /** Widgets visuales opcionales que el modulo puede inyectar. */
  visualWidgets?: string[];
}
