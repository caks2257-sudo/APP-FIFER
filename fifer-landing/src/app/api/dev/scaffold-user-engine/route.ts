import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { defaultEngineReportForSlug, parseEngineReportJson } from "@/schemas/engine-report.schema";

export const runtime = "nodejs";

function resolveFiferLandingRoot(): string {
  const cwd = process.cwd();
  return path.basename(cwd) === "fifer-landing" ? cwd : path.join(cwd, "fifer-landing");
}

/**
 * POST { slug, content, engineReport? } — escribe `.scaffold.tmp` y `engine_report.json` (solo desarrollo).
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "scaffold-user-engine deshabilitado en producción." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }
  const slug =
    typeof body === "object" && body !== null && "slug" in body
      ? String((body as { slug: unknown }).slug).replace(/[^a-z0-9-]/gi, "-").slice(0, 64)
      : "";
  const content =
    typeof body === "object" && body !== null && "content" in body
      ? String((body as { content: unknown }).content)
      : "";
  if (!slug || !content) {
    return NextResponse.json({ ok: false, error: "slug y content son obligatorios." }, { status: 400 });
  }

  let report = defaultEngineReportForSlug(slug);
  if (typeof body === "object" && body !== null && "engineReport" in body) {
    const raw = (body as { engineReport?: unknown }).engineReport;
    if (raw !== undefined) {
      try {
        report = parseEngineReportJson(raw);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ ok: false, error: `engineReport inválido: ${msg}` }, { status: 400 });
      }
      if (report.id !== slug) {
        return NextResponse.json(
          { ok: false, error: `engineReport.id debe coincidir con slug (${slug}).` },
          { status: 400 }
        );
      }
    }
  }

  const root = resolveFiferLandingRoot();
  const enginesDir = path.join(root, "src", "user_space", "[user_id_mock]", "engines", slug);
  const outTmp = path.join(enginesDir, ".scaffold.tmp");
  const outReport = path.join(enginesDir, "engine_report.json");

  try {
    await mkdir(enginesDir, { recursive: true });
    await writeFile(outTmp, content, "utf8");
    await writeFile(outReport, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return NextResponse.json({
      ok: true,
      path: outTmp,
      engineReportPath: outReport,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
