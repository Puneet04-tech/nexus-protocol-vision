/**
 * Secure JSON utility class to guard against prototype pollution and malformed inputs.
 */
export class SafeJson {
  /**
   * Parses JSON string safely, removing __proto__ and constructor keys to block pollution attacks.
   */
  public static parse(jsonStr: string): any {
    if (!jsonStr) return null;

    try {
      return JSON.parse(jsonStr, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
    } catch (e: any) {
      throw new Error(`Unsafe or malformed JSON parsing blocked: ${e.message}`);
    }
  }

  /**
   * Deep merges target with source securely, preventing pollution.
   */
  public static secureMerge(target: any, source: any): any {
    if (!target || typeof target !== 'object') return source;
    if (!source || typeof source !== 'object') return target;

    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.secureMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
