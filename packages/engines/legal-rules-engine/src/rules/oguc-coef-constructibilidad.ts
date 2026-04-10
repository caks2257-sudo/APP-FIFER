import { RegulationRule, PropertyContext, RuleResult } from '../types';

// Mock de coeficiente por zona (En la BD real del Data Engine se consultaría el CIP)
const COEF_ZONAS: Record<string, number> = {
  "URBANO": 1.5,
  "CHICUREO_Z1": 0.4, // Zona hipotética restrictiva / parcelación
  "RURAL": 0.2
};

export const ogucCoefConstructibilidadRule: RegulationRule = {
  id: 'OGUC-COEF-01',
  description: 'Valida que la superficie edificada no supere el coeficiente de constructibilidad permitido para la zona.',
  source: 'OGUC',
  evaluate: (context: PropertyContext): RuleResult => {
    const coef = COEF_ZONAS[context.zone] || 1.0;
    const maxArea = context.landArea * coef;
    const passed = context.builtArea <= maxArea;

    return {
      passed,
      observations: passed
        ? [`Superficie edificada (${context.builtArea}m2) dentro del límite permitido (${maxArea}m2).`]
        : [`Superficie edificada (${context.builtArea}m2) excede el máximo permitido (${maxArea}m2) para zona ${context.zone} (Coef: ${coef}).`],
      requiredActions: passed ? [] : ['Modificar proyecto de arquitectura', 'Justificar excepción municipal (ej. DFL2)']
    };
  }
};
