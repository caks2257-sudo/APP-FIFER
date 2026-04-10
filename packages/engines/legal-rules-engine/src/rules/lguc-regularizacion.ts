import { RegulationRule, PropertyContext, RuleResult } from '../types';

export const lgucRegularizacionRule: RegulationRule = {
  id: 'LGUC-REG-ANTIGUEDAD',
  description: 'Evalúa si la propiedad califica para regularización simplificada por antigüedad (ej. Ley del Mono o corte normativo 2016).',
  source: 'LGUC',
  evaluate: (context: PropertyContext): RuleResult => {
    if (!context.yearBuilt) {
      return { 
        passed: false, 
        observations: ['Año de construcción desconocido.'], 
        requiredActions: ['Aportar certificado de antigüedad o tasación referencial'] 
      };
    }

    const passed = context.yearBuilt <= 2016; // Año de corte de ejemplo
    return {
      passed,
      observations: passed
        ? [`Construcción del año ${context.yearBuilt} califica para evaluación simplificada.`]
        : [`Construcción del año ${context.yearBuilt} es posterior a la fecha de corte (2016).`],
      requiredActions: passed ? ['Preparar expediente simplificado'] : ['Tramitar como obra nueva normal', 'Revisar multas por construcción sin permiso']
    };
  }
};
