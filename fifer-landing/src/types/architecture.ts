export type SlotDictionary = Record<string, string[]>;

export interface RouteConfig {
  path: string;
  slots: SlotDictionary;
  /** Roles Supabase / app (Core Registry); vacío = sin capa extra. */
  rolesRequired?: string[];
}

export interface ModuleConfig {
  id: string;
  nombre: string;
  icono: string;
  routes: RouteConfig[];
  /** Bioma canónico (Core Registry / Zod `ModuleConfigSchema`). */
  biome?: Record<string, string>;
  /** Tokens hex para manifiestos / shell (`IFiferBoxManifest.themeOverrides`). */
  themeOverrides?: Record<string, string>;
}
