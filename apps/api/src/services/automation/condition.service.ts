import type { AutomationCondition, ConditionOperator } from '@socialforge/shared';

export class ConditionService {
  /**
   * Resolves nested property from object using dot notation (e.g. 'order.total.amount').
   */
  public getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object' || !path) return undefined;
    const parts = path.replace(/^payload\./, '').split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Evaluates a single condition against a payload.
   */
  public evaluateSingle(condition: AutomationCondition, payload: any): boolean {
    const actual = this.getNestedValue(payload, condition.field);
    const expected = condition.value;

    switch (condition.operator) {
      case 'equals':
        return String(actual).toLowerCase() === String(expected).toLowerCase();

      case 'not_equals':
        return String(actual).toLowerCase() !== String(expected).toLowerCase();

      case 'contains':
        if (Array.isArray(actual)) {
          return actual.some((item) => String(item).toLowerCase().includes(String(expected).toLowerCase()));
        }
        return String(actual ?? '').toLowerCase().includes(String(expected).toLowerCase());

      case 'not_contains':
        if (Array.isArray(actual)) {
          return !actual.some((item) => String(item).toLowerCase().includes(String(expected).toLowerCase()));
        }
        return !String(actual ?? '').toLowerCase().includes(String(expected).toLowerCase());

      case 'greater_than': {
        const numActual = Number(actual);
        const numExpected = Number(expected);
        return !isNaN(numActual) && !isNaN(numExpected) && numActual > numExpected;
      }

      case 'less_than': {
        const numActual = Number(actual);
        const numExpected = Number(expected);
        return !isNaN(numActual) && !isNaN(numExpected) && numActual < numExpected;
      }

      case 'in':
        if (Array.isArray(expected)) {
          return expected.map((v) => String(v).toLowerCase()).includes(String(actual).toLowerCase());
        }
        return String(expected).toLowerCase().split(',').map((s) => s.trim()).includes(String(actual).toLowerCase());

      case 'not_in':
        if (Array.isArray(expected)) {
          return !expected.map((v) => String(v).toLowerCase()).includes(String(actual).toLowerCase());
        }
        return !String(expected).toLowerCase().split(',').map((s) => s.trim()).includes(String(actual).toLowerCase());

      case 'matches':
        try {
          const regex = new RegExp(String(expected), 'i');
          return regex.test(String(actual ?? ''));
        } catch {
          return false;
        }

      default:
        return true;
    }
  }

  /**
   * Evaluates a collection of conditions.
   * If conditions are empty or null, returns true (unconditional).
   */
  public evaluateConditions(
    conditions?: AutomationCondition[] | null,
    payload?: any,
    matchMode: 'ALL' | 'ANY' = 'ALL'
  ): boolean {
    const condList = Array.isArray(conditions)
      ? conditions
      : (conditions as any)?.conditions || [];

    if (!condList || condList.length === 0) return true;
    const safePayload = payload || {};

    if (matchMode === 'ANY') {
      return condList.some((cond: any) => this.evaluateSingle(cond, safePayload));
    }

    // Default ALL (AND logic)
    return condList.every((cond: any) => this.evaluateSingle(cond, safePayload));
  }
}

export const conditionService = new ConditionService();
