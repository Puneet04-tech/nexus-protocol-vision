import { ModelVersion, VersionDiff } from '../types';

export class VersionManager {
  private static instance: VersionManager | null = null;

  private constructor() {}

  public static getInstance(): VersionManager {
    if (!this.instance) {
      this.instance = new VersionManager();
    }
    return this.instance;
  }

  /**
   * Validates if a version string follows SemVer schema (e.g., 1.0.0, 2.1.3-beta).
   */
  public isValidSemVer(version: string): boolean {
    const semVerRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semVerRegex.test(version);
  }

  /**
   * Compares two SemVer strings. Returns:
   * - 1 if v1 > v2
   * - -1 if v1 < v2
   * - 0 if v1 === v2
   */
  public compareSemVer(v1: string, v2: string): number {
    if (!this.isValidSemVer(v1) || !this.isValidSemVer(v2)) {
      // Fallback to alphabetical if not valid
      return v1.localeCompare(v2);
    }

    const clean = (v: string) => {
      const parts = v.split('-');
      const main = parts[0].split('.').map(Number);
      const pre = parts[1] ? parts[1].split('.') : [];
      return { main, pre };
    };

    const p1 = clean(v1);
    const p2 = clean(v2);

    // Compare main parts: major, minor, patch
    for (let i = 0; i < 3; i++) {
      if (p1.main[i] > p2.main[i]) return 1;
      if (p1.main[i] < p2.main[i]) return -1;
    }

    // Compare pre-release tags
    if (p1.pre.length === 0 && p2.pre.length > 0) return 1; // 1.0.0 > 1.0.0-alpha
    if (p1.pre.length > 0 && p2.pre.length === 0) return -1; // 1.0.0-alpha < 1.0.0

    const len = Math.max(p1.pre.length, p2.pre.length);
    for (let i = 0; i < len; i++) {
      if (p1.pre[i] === undefined) return -1;
      if (p2.pre[i] === undefined) return 1;

      const num1 = Number(p1.pre[i]);
      const num2 = Number(p2.pre[i]);

      if (!isNaN(num1) && !isNaN(num2)) {
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
      } else {
        const str1 = p1.pre[i].toString();
        const str2 = p2.pre[i].toString();
        const cmp = str1.localeCompare(str2);
        if (cmp !== 0) return cmp > 0 ? 1 : -1;
      }
    }

    return 0;
  }

  /**
   * Generates a structural difference breakdown between version A (baseline) and version B (candidate).
   */
  public compareVersions(verA: ModelVersion, verB: ModelVersion): VersionDiff {
    // 1. Parameter size difference
    const sizeA = verA.parametersCount || 'unknown';
    const sizeB = verB.parametersCount || 'unknown';
    const parameterDiff = {
      sizeA,
      sizeB,
      changed: sizeA !== sizeB
    };

    // 2. Dependencies difference
    const depsDiff: VersionDiff['dependenciesDiff'] = [];
    const allDepNames = new Set([
      ...Object.keys(verA.dependencies || {}),
      ...Object.keys(verB.dependencies || {})
    ]);

    allDepNames.forEach(depName => {
      const constraintA = verA.dependencies?.[depName];
      const constraintB = verB.dependencies?.[depName];

      if (constraintA && !constraintB) {
        depsDiff.push({ name: depName, verA: constraintA, changeType: 'removed' });
      } else if (!constraintA && constraintB) {
        depsDiff.push({ name: depName, verB: constraintB, changeType: 'added' });
      } else if (constraintA !== constraintB) {
        depsDiff.push({ name: depName, verA: constraintA, verB: constraintB, changeType: 'changed' });
      } else {
        depsDiff.push({ name: depName, verA: constraintA, verB: constraintB, changeType: 'none' });
      }
    });

    // 3. Schema checks
    const inputChanged = JSON.stringify(verA.inputSchema) !== JSON.stringify(verB.inputSchema);
    const outputChanged = JSON.stringify(verA.outputSchema) !== JSON.stringify(verB.outputSchema);

    let schemaMsg = 'Schemas are identical.';
    if (inputChanged && outputChanged) {
      schemaMsg = 'Both Input and Output schemas have modified interfaces.';
    } else if (inputChanged) {
      schemaMsg = 'Input interface schema has mutated.';
    } else if (outputChanged) {
      schemaMsg = 'Output interface schema has mutated.';
    }

    const schemaDiff = {
      inputChanged,
      outputChanged,
      message: schemaMsg
    };

    // 4. Hyperparameter difference
    const hyperDiff: VersionDiff['hyperparameterDiff'] = [];
    const allHyperKeys = new Set([
      ...Object.keys(verA.hyperparameterSchema || {}),
      ...Object.keys(verB.hyperparameterSchema || {})
    ]);

    allHyperKeys.forEach(key => {
      const defaultA = verA.hyperparameterSchema?.[key]?.default;
      const defaultB = verB.hyperparameterSchema?.[key]?.default;

      if (defaultA !== undefined && defaultB === undefined) {
        hyperDiff.push({ name: key, defaultA, changeType: 'removed' });
      } else if (defaultA === undefined && defaultB !== undefined) {
        hyperDiff.push({ name: key, defaultB, changeType: 'added' });
      } else if (defaultA !== defaultB) {
        hyperDiff.push({ name: key, defaultA, defaultB, changeType: 'changed' });
      }
    });

    return {
      versionA: verA.version,
      versionB: verB.version,
      parameterDiff,
      dependenciesDiff: depsDiff,
      schemaDiff,
      hyperparameterDiff: hyperDiff
    };
  }
}
