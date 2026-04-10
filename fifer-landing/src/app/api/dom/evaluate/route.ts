import { NextResponse } from "next/server";
import {
  LegalRulesEngine,
  ogucCoefConstructibilidadRule,
  lgucRegularizacionRule,
} from "@fifer/legal-rules-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const engine = new LegalRulesEngine();
    engine.registerRule(ogucCoefConstructibilidadRule);
    engine.registerRule(lgucRegularizacionRule);

    // Contexto mockeado simulando un levantamiento para un galpón o local en Chicureo
    const propertyContext = {
      landArea: 5000,
      builtArea: 850,
      zone: "CHICUREO_Z1",
      yearBuilt: 2012,
    };

    const evaluation = engine.evaluateProperty(propertyContext);

    const fiferBoxPayload = {
      boxId: "fifer-dom-evaluator",
      meta: { timestamp: new Date().toISOString(), ghostMode: false },
      data: { property: propertyContext, rules: evaluation },
    };

    return NextResponse.json(fiferBoxPayload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Error procesando motor normativo",
        details: message,
        meta: { ghostMode: true },
      },
      { status: 500 },
    );
  }
}
