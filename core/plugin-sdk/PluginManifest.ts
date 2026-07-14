import { PluginManifest, PluginPermission } from './PluginTypes';

export const VALID_PERMISSIONS: PluginPermission[] = [
  'persona.read',
  'persona.write',
  'graph.read',
  'graph.write',
  'events.subscribe',
  'events.publish',
  'storage.read',
  'storage.write',
  'network.access'
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PluginManifestValidator {
  /**
   * Validates a plugin manifest object against the required schema constraints.
   */
  public static validate(manifest: any): ValidationResult {
    const errors: string[] = [];

    if (!manifest || typeof manifest !== 'object') {
      return { isValid: false, errors: ['Manifest must be a valid JSON object.'] };
    }

    // Required fields check
    const requiredFields = [
      'id',
      'name',
      'version',
      'author',
      'description',
      'entry',
      'permissions',
      'supportedProtocolVersion'
    ];

    for (const field of requiredFields) {
      if (manifest[field] === undefined || manifest[field] === null) {
        errors.push(`Missing required field: '${field}'`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Type validation
    if (typeof manifest.id !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(manifest.id)) {
      errors.push("Field 'id' must be an alphanumeric string (may contain periods, hyphens, and underscores).");
    }

    if (typeof manifest.name !== 'string' || manifest.name.trim() === '') {
      errors.push("Field 'name' must be a non-empty string.");
    }

    if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push("Field 'version' must follow semantic versioning format (e.g. '1.0.0').");
    }

    if (typeof manifest.author !== 'string') {
      errors.push("Field 'author' must be a string.");
    }

    if (typeof manifest.description !== 'string') {
      errors.push("Field 'description' must be a string.");
    }

    if (typeof manifest.entry !== 'string' || manifest.entry.trim() === '') {
      errors.push("Field 'entry' must contain the plugin's JavaScript source code.");
    }

    if (!Array.isArray(manifest.permissions)) {
      errors.push("Field 'permissions' must be an array.");
    } else {
      for (const perm of manifest.permissions) {
        if (!VALID_PERMISSIONS.includes(perm)) {
          errors.push(`Invalid permission requested: '${perm}'. Valid permissions are: ${VALID_PERMISSIONS.join(', ')}`);
        }
      }
    }

    if (typeof manifest.supportedProtocolVersion !== 'string') {
      errors.push("Field 'supportedProtocolVersion' must be a string.");
    }

    // Optional fields checks
    if (manifest.dependencies !== undefined && (typeof manifest.dependencies !== 'object' || Array.isArray(manifest.dependencies))) {
      errors.push("Field 'dependencies' must be a key-value record map.");
    }

    if (manifest.keywords !== undefined && !Array.isArray(manifest.keywords)) {
      errors.push("Field 'keywords' must be an array of strings.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
