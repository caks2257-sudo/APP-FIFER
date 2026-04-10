import React from "react";
import { FileSignature, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { BoxProps } from "@/types/fifer-box";

interface RuleResult {
  passed: boolean;
  observations: string[];
  requiredActions: string[];
}

interface DOMBoxProps {
  data?: {
    property: { landArea: number; builtArea: number; zone: string; yearBuilt: number };
    rules: Record<string, RuleResult>;
  };
  isLoading?: boolean;
  error?: Error | null;
}

export function FiferDOMEvaluator({ data, isLoading, error }: DOMBoxProps) {
  if (isLoading)
    return (
      <div className="flex h-48 w-full animate-pulse items-center justify-center rounded-xl border border-slate-700 bg-[#0A0F1E]">
        <span className="text-slate-500">Analizando normativas...</span>
      </div>
    );
  if (error || !data)
    return (
      <div className="w-full rounded-xl border border-red-900/50 bg-[#0A0F1E] p-6">
        <span className="text-red-400">Ghost Mode: Fallo en motor legal.</span>
      </div>
    );

  const rules = Object.entries(data.rules);
  const allPassed = rules.every(([, result]) => result.passed);

  return (
    <div className="w-full overflow-hidden rounded-[0.75rem] border border-slate-700 bg-[#0A0F1E] font-sans shadow-2xl">
      {/* Cabecera Técnica */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-200">
            Matriz Normativa
          </h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            allPassed
              ? "border-emerald-800 bg-emerald-900/50 text-emerald-400"
              : "border-slate-700 bg-slate-800 text-slate-400"
          }`}
        >
          {allPassed ? "VIABLE" : "REQUIERE ATENCIÓN"}
        </span>
      </div>

      {/* Resumen Propiedad */}
      <div className="grid grid-cols-4 gap-px border-b border-slate-700 bg-slate-800">
        {[
          { label: "ZONA", value: data.property.zone },
          { label: "TERRENO", value: `${data.property.landArea} m²` },
          { label: "EDIFICADO", value: `${data.property.builtArea} m²` },
          { label: "AÑO", value: data.property.yearBuilt },
        ].map((item, i) => (
          <div key={i} className="bg-[#0A0F1E] p-3 text-center">
            <div className="text-[10px] uppercase text-slate-500">{item.label}</div>
            <div className="text-sm font-medium text-slate-300">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Lista de Reglas */}
      <div className="space-y-3 p-4">
        {rules.map(([ruleId, result]) => (
          <div
            key={ruleId}
            className={`rounded-lg border p-4 ${
              result.passed ? "border-slate-800 bg-slate-900/50" : "border-slate-700 bg-slate-900"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.passed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              )}
              <div>
                <h4 className="text-sm font-bold text-slate-300">{ruleId}</h4>
                <p className="mt-1 text-xs text-slate-500">{result.observations[0]}</p>

                {!result.passed && result.requiredActions.length > 0 && (
                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Acciones Requeridas
                      </span>
                    </div>
                    <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                      {result.requiredActions.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Carga dinámica v0 / orquestador — contrato `BoxProps`. */
export default function FiferDOMEvaluatorBox({ data, isLoading, error }: BoxProps) {
  return <FiferDOMEvaluator data={data} isLoading={isLoading} error={error} />;
}
