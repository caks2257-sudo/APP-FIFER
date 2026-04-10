/** Contrato resultado del validador X-Ray (compartido servidor / cliente). */

export interface XRayModuleIssue {
  module: string;
  relativePath: string;
  reason: "missing_on_disk";
}

export interface XRayValidatorResult {
  ok: boolean;
  repoRoot: string;
  reportPath: string;
  declared: string[];
  issues: XRayModuleIssue[];
}
