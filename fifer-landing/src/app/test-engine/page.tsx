"use client";

import { useState } from "react";
import {
  UrbanismEngine,
  CHICUREO_ZU3,
  type ValidationResult,
} from "@fifer/legal-rules-engine";

const engine = new UrbanismEngine(CHICUREO_ZU3);

export default function TestEnginePage() {
  const [superficieTerreno, setSuperficieTerreno] = useState("");
  const [superficieEdificada, setSuperficieEdificada] = useState("");
  const [altura, setAltura] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);

  function handleValidate() {
    const terreno = parseFloat(superficieTerreno);
    const edificada = parseFloat(superficieEdificada);
    const alt = parseFloat(altura);

    if (isNaN(terreno) || isNaN(edificada) || isNaN(alt)) {
      setResult({
        success: false,
        zona: CHICUREO_ZU3.nombre,
        errors: ["Todos los campos deben ser valores numéricos válidos."],
      });
      return;
    }

    const ocupacion = terreno > 0 ? edificada / terreno : 1;

    const validation = engine.validateZone({
      superficieTerreno: terreno,
      ocupacionSuelo: ocupacion,
      distanciamientoFrontal: CHICUREO_ZU3.distanciamientoFrontalMinimo,
      distanciamientoLateral: CHICUREO_ZU3.distanciamientoLateralMinimo,
      distanciamientoPosterior: CHICUREO_ZU3.distanciamientoPosteriorMinimo,
      alturaMaxima: alt,
      coeficienteConstructibilidad: CHICUREO_ZU3.coeficienteConstructibilidad,
    });

    setResult(validation);
  }

  return (
    <section className="max-w-2xl mx-auto px-6 pt-32 pb-20">
      <h1 className="text-3xl font-bold text-foreground">
        Validador Urbanístico — Chicureo ZU-3
      </h1>
      <p className="mt-2 text-foreground-accent">
        Ingresa los parámetros del proyecto para verificar cumplimiento
        normativo en la zona {CHICUREO_ZU3.nombre}.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="superficieTerreno"
            className="block text-sm font-semibold text-foreground"
          >
            Superficie Terreno (m²)
          </label>
          <input
            id="superficieTerreno"
            type="number"
            min="0"
            step="any"
            placeholder="Ej: 6000"
            value={superficieTerreno}
            onChange={(e) => setSuperficieTerreno(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-foreground shadow-sm focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="superficieEdificada"
            className="block text-sm font-semibold text-foreground"
          >
            Superficie Edificada (m²)
          </label>
          <input
            id="superficieEdificada"
            type="number"
            min="0"
            step="any"
            placeholder="Ej: 800"
            value={superficieEdificada}
            onChange={(e) => setSuperficieEdificada(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-foreground shadow-sm focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="altura"
            className="block text-sm font-semibold text-foreground"
          >
            Altura (m)
          </label>
          <input
            id="altura"
            type="number"
            min="0"
            step="any"
            placeholder="Ej: 9"
            value={altura}
            onChange={(e) => setAltura(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-foreground shadow-sm focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none"
          />
        </div>

        <button
          onClick={handleValidate}
          className="w-full rounded-lg bg-[var(--secondary)] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
        >
          Validar Proyecto
        </button>
      </div>

      {result && (
        <div
          className={`mt-8 rounded-lg p-5 ${
            result.success
              ? "border border-green-300 bg-green-50 text-green-800"
              : "border border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {result.success ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-lg font-bold">Proyecto Factible</p>
                <p className="text-sm opacity-80">
                  Cumple con todos los parámetros normativos de{" "}
                  {result.zona}.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold mb-3">
                ❌ Proyecto No Factible
              </p>
              <ul className="space-y-1.5">
                {result.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 rounded-lg bg-gray-50 border border-gray-200 p-5 text-sm text-foreground-accent">
        <p className="font-semibold text-foreground mb-2">
          Parámetros Zona {CHICUREO_ZU3.nombre}
        </p>
        <ul className="space-y-1">
          <li>
            Superficie mínima terreno:{" "}
            <strong>{CHICUREO_ZU3.superficieMinimaTerreno.toLocaleString()} m²</strong>
          </li>
          <li>
            Ocupación máxima suelo:{" "}
            <strong>{(CHICUREO_ZU3.ocupacionMaximaSuelo * 100).toFixed(0)}%</strong>
          </li>
          <li>
            Altura máxima: <strong>{CHICUREO_ZU3.alturaMaxima} m</strong>
          </li>
          <li>
            Coef. constructibilidad:{" "}
            <strong>{CHICUREO_ZU3.coeficienteConstructibilidad}</strong>
          </li>
        </ul>
      </div>
    </section>
  );
}
