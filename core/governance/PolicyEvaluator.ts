import { GovernancePolicy, PolicyRule, PolicyCondition, ConditionOperator, RuleAction } from './models/GovernancePolicy';
import { PolicyViolation } from './models/PolicyViolation';

export class PolicyEvaluator {
  /**
   * Safely retrieves a property value from a nested object path.
   * Prevents prototype pollution by rejecting access to __proto__, constructor, and prototype.
   */
  public static getSafeValue(obj: any, path: string): any {
    if (!path) return undefined;
    if (obj === null || obj === undefined) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (
        part === '__proto__' ||
        part === 'constructor' ||
        part === 'prototype' ||
        current === null ||
        current === undefined ||
        typeof current !== 'object'
      ) {
        return undefined;
      }
      
      // Use prototype call to safely check own properties or fall back to safe read
      if (Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        // Fallback for general objects (like dynamic map structures)
        current = (current as any)[part];
      }
    }

    return current;
  }

  /**
   * Evaluates all rules of a policy against the provided context.
   * Returns a list of violations detected.
   */
  public evaluate(policy: GovernancePolicy, context: any): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // If the policy is inactive, bypass evaluation
    if (policy.status !== 'active') {
      return violations;
    }

    for (const rule of policy.rules) {
      // Scope matching (wildcard support, e.g. "carbon.*" matches "carbon.emissions")
      if (!this.isScopeMatched(rule.scope, context.scope || '')) {
        continue;
      }

      const conditionMatched = this.evaluateCondition(rule.condition, context);

      if (conditionMatched) {
        // The rule condition evaluates to true. Check the action.
        // If the action is ALLOW, it doesn't cause a violation.
        // If it is DENY, WARN, AUDIT, REQUIRE_APPROVAL, it triggers a violation!
        if (rule.action !== 'ALLOW') {
          const field = rule.condition.field;
          const actualVal = field ? PolicyEvaluator.getSafeValue(context, field) : undefined;
          
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            ruleId: rule.id,
            ruleName: rule.name,
            action: rule.action,
            severity: rule.severity,
            scope: rule.scope,
            condition: {
              field: rule.condition.field,
              operator: rule.condition.operator,
              expected: rule.condition.value,
              actual: actualVal,
            },
            timestamp: Date.now(),
            message: `Policy rule '${rule.name}' triggered on scope '${context.scope}': ${rule.action} action enforced. Reason: condition met.`,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Wildcard scope comparison. Supports matching:
   * - "carbon.*" matches "carbon.emissions", "carbon.budget"
   * - "*" matches everything
   * - exact string matches
   */
  private isScopeMatched(ruleScope: string, contextScope: string): boolean {
    if (ruleScope === '*' || contextScope === '*') return true;
    if (ruleScope === contextScope) return true;

    if (ruleScope.endsWith('.*')) {
      const prefix = ruleScope.slice(0, -2);
      return contextScope.startsWith(prefix);
    }

    return false;
  }

  /**
   * Evaluate a recursive condition against the context object.
   */
  private evaluateCondition(condition: PolicyCondition, context: any): boolean {
    const op = condition.operator;

    switch (op) {
      case 'AND': {
        if (!condition.conditions || condition.conditions.length === 0) return false;
        return condition.conditions.every((cond) => this.evaluateCondition(cond, context));
      }
      case 'OR': {
        if (!condition.conditions || condition.conditions.length === 0) return false;
        return condition.conditions.some((cond) => this.evaluateCondition(cond, context));
      }
      case 'NOT': {
        if (!condition.conditions || condition.conditions.length === 0) return false;
        return !this.evaluateCondition(condition.conditions[0], context);
      }
      default: {
        // Comparison operators
        if (!condition.field) return false;
        const actualValue = PolicyEvaluator.getSafeValue(context, condition.field);
        const expectedValue = condition.value;

        return this.compareValues(op, actualValue, expectedValue);
      }
    }
  }

  /**
   * Compare actual and expected values based on ConditionOperator.
   */
  private compareValues(operator: ConditionOperator, actual: any, expected: any): boolean {
    if (actual === undefined || actual === null) {
      // If actual value is missing, check if operator is NOT_EQUALS (which would be true if expected is defined)
      return operator === 'NOT_EQUALS';
    }

    switch (operator) {
      case 'EQUALS':
        return actual === expected;
      case 'NOT_EQUALS':
        return actual !== expected;
      case 'GREATER_THAN':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'LESS_THAN':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'CONTAINS': {
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        if (typeof actual === 'string') {
          return actual.includes(String(expected));
        }
        return false;
      }
      case 'IN': {
        if (Array.isArray(expected)) {
          return expected.includes(actual);
        }
        return false;
      }
      default:
        return false;
    }
  }
}
