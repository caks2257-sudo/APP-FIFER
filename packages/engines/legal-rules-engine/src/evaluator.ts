import { PropertyContext, RegulationRule, RuleResult } from './types';

export class LegalRulesEngine {
  private rules: RegulationRule[] = [];

  registerRule(rule: RegulationRule) {
    this.rules.push(rule);
  }

  evaluateProperty(context: PropertyContext): Record<string, RuleResult> {
    const report: Record<string, RuleResult> = {};
    for (const rule of this.rules) {
      report[rule.id] = rule.evaluate(context);
    }
    return report;
  }
}
