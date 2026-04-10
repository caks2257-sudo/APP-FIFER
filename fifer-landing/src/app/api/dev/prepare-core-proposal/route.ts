import { cp, mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { buildFusionMasterPrompt } from "@/core/evolution-auditor";
import { discoverUserEngineReports, resolveFiferLandingRoot, USER_SPACE_MOCK_DIRNAME } from "@/core/user-engine-discovery";
import type { UserEngineReport } from "@/schemas/engine-report.schema";

export const runtime = "nodejs";

function sanitizeSlug(s: string): string {
  return s.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

/**
 * POST { memberSlugs: string[], targetSlug?: string } — copia engines del user_space a
 * `src/registry/proposals/[targetSlug]/` y genera `FUSION_MASTER_PROMPT.md`.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "prepare-core-proposal deshabilitado en producción." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const rawSlugs =
    typeof body === "object" && body !== null && "memberSlugs" in body && Array.isArray((body as { memberSlugs: unknown }).memberSlugs)
      ? (body as { memberSlugs: unknown[] }).memberSlugs.map((s) => sanitizeSlug(String(s))).filter(Boolean)
      : [];
  const memberSlugs = Array.from(new Set(rawSlugs));

  let targetSlug =
    typeof body === "object" && body !== null && "targetSlug" in body
      ? sanitizeSlug(String((body as { targetSlug?: unknown }).targetSlug ?? ""))
      : "";

  if (memberSlugs.length === 0) {
    return NextResponse.json({ ok: false, error: "memberSlugs debe incluir al menos un slug." }, { status: 400 });
  }

  if (!targetSlug) {
    targetSlug = sanitizeSlug(`fusion-${memberSlugs.sort().join("-").slice(0, 48)}`);
  }

  const root = resolveFiferLandingRoot();
  const { reports } = await discoverUserEngineReports(undefined, root);
  const byEngineId = new Map<string, UserEngineReport>();
  for (const r of Object.values(reports)) {
    if (r) byEngineId.set(r.id, r);
  }

  const orderedReports: UserEngineReport[] = [];
  for (const slug of memberSlugs) {
    const rep = byEngineId.get(slug);
    if (!rep) {
      return NextResponse.json({ ok: false, error: `Motor no encontrado o sin reporte válido: ${slug}` }, { status: 400 });
    }
    orderedReports.push(rep);
  }

  const enginesRoot = path.join(root, "src", "user_space", USER_SPACE_MOCK_DIRNAME, "engines");
  const proposalRoot = path.join(root, "src", "registry", "proposals", targetSlug);

  try {
    await mkdir(path.join(proposalRoot, "sources"), { recursive: true });
    for (const slug of memberSlugs) {
      const src = path.join(enginesRoot, slug);
      const dest = path.join(proposalRoot, "sources", slug);
      await cp(src, dest, { recursive: true });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: `Error al copiar archivos: ${msg}` }, { status: 500 });
  }

  const masterPrompt = buildFusionMasterPrompt({
    targetSlug,
    memberSlugs,
    reports: orderedReports,
  });
  const masterPromptPath = path.join(proposalRoot, "FUSION_MASTER_PROMPT.md");
  try {
    await writeFile(masterPromptPath, masterPrompt, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: `Error al escribir Master Prompt: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    targetSlug,
    proposalDir: path.relative(root, proposalRoot).replace(/\\/g, "/"),
    masterPromptPath: path.relative(root, masterPromptPath).replace(/\\/g, "/"),
    masterPrompt,
    memberSlugs,
  });
}
