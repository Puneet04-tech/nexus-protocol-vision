import { PluginManifestValidator, ValidationResult } from './PluginManifest';

export class PluginValidator {
  /**
   * Complete validation of a plugin (manifest schema and code syntax check).
   */
  public static validate(manifest: any): ValidationResult {
    // 1. Validate manifest structure
    const manifestResult = PluginManifestValidator.validate(manifest);
    if (!manifestResult.isValid) {
      return manifestResult;
    }

    // 2. Perform static analysis on script entry points to detect syntax errors before execution
    const errors: string[] = [];
    try {
      // Validate syntax using new Function compile check (without executing)
      new Function(manifest.entry);
    } catch (err: any) {
      errors.push(`JavaScript Compilation Error: ${err.message}`);
    }

    // 3. Optional checks for blacklisted keywords that bypass safety (e.g., trying to access document/window in string representations)
    const dangerousPatterns = [
      /\bwindow\s*\[/i,
      /\bdocument\s*\[/i,
      /localStorage\.clear\(\)/i,
      /sessionStorage\.clear\(\)/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(manifest.entry)) {
        errors.push(`Security Advisory: Code contains discouraged syntax matching ${pattern.toString()}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
