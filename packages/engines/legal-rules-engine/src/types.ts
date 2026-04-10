export interface PropertyContext {
  landArea: number; // m2
  builtArea: number; // m2
  zone: string; // ej: "URBANO", "RURAL", "CHICUREO_Z1"
  yearBuilt?: number;
}

export interface RegulationRule {
  id: string;
  description: string;
  source: 'OGUC' | 'LGUC' | 'LOCAL';
  evaluate: (context: PropertyContext) => RuleResult;
}

export interface RuleResult {
  passed: boolean;
  observations: string[];
  requiredActions: string[];
}
