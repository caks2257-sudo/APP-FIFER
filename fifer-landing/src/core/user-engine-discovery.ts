/**
 * Autodescubrimiento de motores en `user_space/.../engines/<slug>/engine_report.json`.
 * El mapa consumido por el Shell se materializa vía el script `discover-user-engines` (build)
 * o puede inspeccionarse en desarrollo con GET api dev user-engine-discovery.
 */

import { readdir, readFile } from "fs/promises";
import path from "path";
import { buildUserSpaceBoxId } from "@/user_space/user-space-box-ids";
import { USER_SPACE_MOCK_USER_ID } from "@/user_space/user-space-manifests";
import { parseEngineReportJson, type UserEngineReport } from "@/schemas/engine-report.schema";

/** Carpeta literal del sandbox en el repo (coincide con imports `@/user_space/[user_id_mock]/...`). */
export const USER_SPACE_MOCK_DIRNAME = "[user_id_mock]" as const;

export type EngineDiscoveryIssue = {
  engineDir: string;
  message: string;
};

export function resolveFiferLandingRoot(cwd: string = process.cwd()): string {
  return path.basename(cwd) === "fifer-landing" ? cwd : path.join(cwd, "fifer-landing");
}

/** Ruta a `src/user_space/<carpetaLiteralUsuario>/engines`. */
export function resolveUserEnginesDir(userFolderSegment: string, root?: string): string {
  const base = root ?? resolveFiferLandingRoot();
  return path.join(base, "src", "user_space", userFolderSegment, "engines");
}

export type UserEngineDiscoveryResult = {
  reports: Partial<Record<string, UserEngineReport>>;
  issues: EngineDiscoveryIssue[];
};

/**
 * Escanea directorios bajo `engines/` (un subdirectorio = un motor), lee y valida `engine_report.json`.
 * `boxId` = `buildUserSpaceBoxId(USER_SPACE_MOCK_USER_ID, slug)` (id lógico, no el nombre de carpeta con corchetes).
 */
export async function discoverUserEngineReports(
  userFolderSegment: string = USER_SPACE_MOCK_DIRNAME,
  root?: string
): Promise<UserEngineDiscoveryResult> {
  const enginesRoot = resolveUserEnginesDir(userFolderSegment, root);
  const reports: Partial<Record<string, UserEngineReport>> = {};
  const issues: EngineDiscoveryIssue[] = [];

  let names: string[];
  try {
    names = await readdir(enginesRoot, { withFileTypes: true })
      .then((entries) => entries.filter((e) => e.isDirectory()).map((e) => e.name));
  } catch (e) {
    issues.push({
      engineDir: enginesRoot,
      message: e instanceof Error ? e.message : String(e),
    });
    return { reports, issues };
  }

  for (const slug of names) {
    const reportPath = path.join(enginesRoot, slug, "engine_report.json");
    try {
      const raw = await readFile(reportPath, "utf8");
      const json = JSON.parse(raw) as unknown;
      const parsed = parseEngineReportJson(json);
      if (parsed.id !== slug) {
        issues.push({
          engineDir: slug,
          message: `engine_report.json id "${parsed.id}" no coincide con carpeta "${slug}".`,
        });
        continue;
      }
      const boxId = buildUserSpaceBoxId(USER_SPACE_MOCK_USER_ID, slug);
      reports[boxId] = parsed;
    } catch (e) {
      issues.push({
        engineDir: slug,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { reports, issues };
}
