import { MarketplaceAgent } from '../types';

export class AgentValidator {
  /**
   * Validates if a version string follows semantic versioning major.minor.patch format
   */
  public static isValidSemVer(version: string): boolean {
    const semVerRegex = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
    return semVerRegex.test(version);
  }

  /**
   * Compares two semantic version strings.
   * Returns -1 if v1 < v2, 1 if v1 > v2, 0 if v1 === v2
   */
  public static compare(v1: string, v2: string): number {
    const clean = (v: string) => v.split('-')[0].split('.').map(Number);
    const [maj1, min1, pat1] = clean(v1);
    const [maj2, min2, pat2] = clean(v2);

    if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
    if (min1 !== min2) return min1 > min2 ? 1 : -1;
    if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
    return 0;
  }

  /**
   * Checks if a version satisfies a semver range string (e.g., ">=1.0.0", "^1.0.0", "1.2.0")
   */
  public static satisfies(version: string, range: string): boolean {
    if (!range || range === '*' || range === 'any') return true;
    
    const cleanRange = range.trim();

    if (cleanRange.startsWith('>=')) {
      const target = cleanRange.slice(2).trim();
      return this.compare(version, target) >= 0;
    }
    if (cleanRange.startsWith('<=')) {
      const target = cleanRange.slice(2).trim();
      return this.compare(version, target) <= 0;
    }
    if (cleanRange.startsWith('>')) {
      const target = cleanRange.slice(1).trim();
      return this.compare(version, target) > 0;
    }
    if (cleanRange.startsWith('<')) {
      const target = cleanRange.slice(1).trim();
      return this.compare(version, target) < 0;
    }
    if (cleanRange.startsWith('^')) {
      const target = cleanRange.slice(1).trim();
      const [maj] = target.split('.').map(Number);
      const nextMajor = `${maj + 1}.0.0`;
      return this.compare(version, target) >= 0 && this.compare(version, nextMajor) < 0;
    }
    if (cleanRange.startsWith('~')) {
      const target = cleanRange.slice(1).trim();
      const parts = target.split('.').map(Number);
      const nextMinor = `${parts[0]}.${parts[1] + 1}.0`;
      return this.compare(version, target) >= 0 && this.compare(version, nextMinor) < 0;
    }

    return this.compare(version, cleanRange) === 0;
  }

  /**
   * Validates the configuration of a MarketplaceAgent.
   */
  public static validateAgentConfig(agent: Partial<MarketplaceAgent>): string[] {
    const errors: string[] = [];
    if (!agent.id) {
      errors.push('Agent ID is required.');
    } else if (!/^[a-z0-9.-]+$/.test(agent.id)) {
      errors.push('Agent ID must be lowercase and contain only alphanumeric characters, dots, or dashes.');
    }
    if (!agent.name) {
      errors.push('Agent Name is required.');
    }
    if (!agent.version) {
      errors.push('Agent Version is required.');
    } else if (!this.isValidSemVer(agent.version)) {
      errors.push(`Agent Version '${agent.version}' is not a valid Semantic Version (expected format: major.minor.patch).`);
    }
    if (!agent.publisher || !agent.publisher.name) {
      errors.push('Publisher details with name are required.');
    }
    if (!agent.compatibility) {
      errors.push('Compatibility specification is required.');
    }
    if (!agent.capabilities || agent.capabilities.length === 0) {
      errors.push('Agent must register at least one capability.');
    }
    return errors;
  }
}
