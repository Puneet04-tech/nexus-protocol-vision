import { VersionManager } from '../versioning/VersionManager';

export class CompatibilityService {
  private static instance: CompatibilityService | null = null;
  private versionManager = VersionManager.getInstance();

  private constructor() {}

  public static getInstance(): CompatibilityService {
    if (!this.instance) {
      this.instance = new CompatibilityService();
    }
    return this.instance;
  }

  /**
   * Checks if an input version satisfies a constraint string.
   * Supports:
   * - Exact matches: "1.2.0"
   * - Inequality: ">=1.2.0", "<=2.0.0", ">1.0.0", "<3.0.0"
   * - Caret range: "^1.2.3" (allows changes that do not modify the left-most non-zero element)
   * - Tilde range: "~1.2.3" (allows patch-level changes)
   */
  public satisfies(version: string, constraint: string): boolean {
    if (!constraint || constraint === '*' || constraint === 'any') {
      return true;
    }

    const trimmed = constraint.trim();

    // Direct Exact Match
    if (trimmed === version) {
      return true;
    }

    // Caret Check (^1.2.3)
    if (trimmed.startsWith('^')) {
      const target = trimmed.substring(1);
      return this.checkCaret(version, target);
    }

    // Tilde Check (~1.2.3)
    if (trimmed.startsWith('~')) {
      const target = trimmed.substring(1);
      return this.checkTilde(version, target);
    }

    // Inequality Checks (>=, <=, >, <)
    if (trimmed.startsWith('>=')) {
      const target = trimmed.substring(2).trim();
      return this.versionManager.compareSemVer(version, target) >= 0;
    }
    if (trimmed.startsWith('<=')) {
      const target = trimmed.substring(2).trim();
      return this.versionManager.compareSemVer(version, target) <= 0;
    }
    if (trimmed.startsWith('>')) {
      const target = trimmed.substring(1).trim();
      return this.versionManager.compareSemVer(version, target) > 0;
    }
    if (trimmed.startsWith('<')) {
      const target = trimmed.substring(1).trim();
      return this.versionManager.compareSemVer(version, target) < 0;
    }

    // Fallback to exact match
    return version === trimmed;
  }

  private checkCaret(version: string, target: string): boolean {
    if (!this.versionManager.isValidSemVer(version) || !this.versionManager.isValidSemVer(target)) {
      return version.startsWith(target);
    }

    const parse = (v: string) => v.split('-')[0].split('.').map(Number);
    const [vMajor, vMinor, vPatch] = parse(version);
    const [tMajor, tMinor, tPatch] = parse(target);

    // Major version match
    if (tMajor > 0) {
      return vMajor === tMajor && this.versionManager.compareSemVer(version, target) >= 0;
    }

    // Major is 0, Minor version match
    if (tMinor > 0) {
      return vMajor === 0 && vMinor === tMinor && this.versionManager.compareSemVer(version, target) >= 0;
    }

    // Major and Minor are 0, Patch version match
    return vMajor === 0 && vMinor === 0 && vPatch === tPatch;
  }

  private checkTilde(version: string, target: string): boolean {
    if (!this.versionManager.isValidSemVer(version) || !this.versionManager.isValidSemVer(target)) {
      return version.startsWith(target);
    }

    const parse = (v: string) => v.split('-')[0].split('.').map(Number);
    const [vMajor, vMinor] = parse(version);
    const [tMajor, tMinor] = parse(target);

    return vMajor === tMajor && vMinor === tMinor && this.versionManager.compareSemVer(version, target) >= 0;
  }

  /**
   * Validates dependency maps (e.g. { "onnxruntime": ">=1.15.0" }) against actual active versions.
   */
  public validateDependencies(
    dependencies: Record<string, string>,
    environmentRegistry: Record<string, string>
  ): { isValid: boolean; missing: string[]; incompatible: string[] } {
    const missing: string[] = [];
    const incompatible: string[] = [];

    Object.entries(dependencies).forEach(([pkg, constraint]) => {
      const actualVersion = environmentRegistry[pkg];
      if (!actualVersion) {
        missing.push(pkg);
      } else if (!this.satisfies(actualVersion, constraint)) {
        incompatible.push(`${pkg} (Requires: ${constraint}, Found: ${actualVersion})`);
      }
    });

    return {
      isValid: missing.length === 0 && incompatible.length === 0,
      missing,
      incompatible
    };
  }
}
