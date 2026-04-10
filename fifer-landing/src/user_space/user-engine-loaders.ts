import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID } from "@/user_space/user-space-manifests";

/** Contexto opcional: `boxId` para leer Vault; `provisionalApiKey` solo en “Probar conexión”. */
export type UserEngineExecuteContext = {
  boxId: string;
  provisionalApiKey?: string;
};

export type UserEngineModule = {
  execute: (ctx?: UserEngineExecuteContext) => Promise<FiferBoxDataNormalized>;
};

/**
 * Mapa boxId → import dinámico del módulo en `user_space/.../engines/<slug>/`.
 */
export const USER_ENGINE_LOADERS: Partial<Record<string, () => Promise<UserEngineModule>>> = {
  [USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID]: () =>
    import("@/user_space/[user_id_mock]/engines/sample-scraper/index"),
};
