import type { BoxManifest } from "@/schema/registry.schema";
import type { V0BoxModuleLoader } from "@/components/v0-ingestion/registry";
import { buildUserSpaceBoxId } from "@/user_space/user-space-box-ids";

/** Mock fijo del sandbox (carpeta literal `[user_id_mock]`). */
export const USER_SPACE_MOCK_USER_ID = "user_id_mock" as const;

export const USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID = buildUserSpaceBoxId(
  USER_SPACE_MOCK_USER_ID,
  "sample-scraper"
);

export const USER_SPACE_FIFER_MANIFESTS: ReadonlyArray<BoxManifest> = [
  {
    boxId: USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID,
    sourceModule: "user-space",
    targetSlot: "slot-main",
    layout: { minWidth: 4, minHeight: 2, isResizable: true },
    themeOverrides: {
      primary: "#EAB308",
      accent: "#EAB308",
      surface: "#0A0F1E",
      onPrimary: "#0A0F1E",
    },
    permissions: ["user-space:run"],
  },
];

/** Metadatos UI — se fusionan en `BOX_CATALOG` (tipado allí). */
export const USER_SPACE_BOX_CATALOG_ENTRIES = {
  [USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID]: {
    id: USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID,
    variant: "Standard" as const,
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
} as const;

/**
 * Loaders JIT para Boxes declarados bajo `src/user_space/<userId>/apps/`.
 * Ampliar este mapa al añadir motores/artefactos por usuario.
 */
export const USER_SPACE_V0_BOX_LOADERS: Partial<Record<string, V0BoxModuleLoader>> = {
  [USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID]: () =>
    import("@/user_space/[user_id_mock]/apps/sample-scraper-box"),
};
