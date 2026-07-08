import { DecisionTrace } from './ExplainabilityTypes';

export class DecisionSerializer {
  /**
   * Serialize a DecisionTrace to a string, removing deep recursive references if any.
   */
  static serialize(trace: DecisionTrace): string {
    return JSON.stringify(trace);
  }

  /**
   * Deserialize a string back into a DecisionTrace.
   */
  static deserialize(json: string): DecisionTrace {
    const trace = JSON.parse(json) as DecisionTrace;
    // Guarantee correct date formatting
    if (typeof trace.timestamp === 'string') {
      trace.timestamp = new Date(trace.timestamp).getTime();
    }
    return trace;
  }

  /**
   * Deep clones a trace.
   */
  static clone(trace: DecisionTrace): DecisionTrace {
    return this.deserialize(this.serialize(trace));
  }

  /**
   * Sanitize strings to prevent XSS in UI rendering.
   */
  static sanitizeString(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Safely formats and stringifies any decision result.
   */
  static formatResult(result: any): string {
    if (result === undefined || result === null) return 'null';
    if (typeof result === 'string') return result;
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  }
}
