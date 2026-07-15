import { ModelMetadata, ModelVersion } from '../types';
import { VersionManager } from '../versioning/VersionManager';

export class RegistryValidator {
  private static instance: RegistryValidator | null = null;
  private versionManager = VersionManager.getInstance();

  private constructor() {}

  public static getInstance(): RegistryValidator {
    if (!this.instance) {
      this.instance = new RegistryValidator();
    }
    return this.instance;
  }

  /**
   * Validates model metadata form inputs.
   */
  public validateModelInputs(model: Partial<ModelMetadata>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!model.id || !/^[a-z0-9-]+$/.test(model.id)) {
      errors.push('Model ID must only contain lowercase alphanumeric characters and dashes (e.g. gemini-3-5).');
    }

    if (!model.name || model.name.trim().length < 3) {
      errors.push('Model name must be at least 3 characters.');
    }

    if (model.name && model.name.length > 50) {
      errors.push('Model name cannot exceed 50 characters.');
    }

    if (!model.description || model.description.trim().length < 10) {
      errors.push('Model description is required and must be at least 10 characters.');
    }

    // Publisher validations
    if (!model.publisher) {
      errors.push('Publisher details are required.');
    } else {
      const pub = model.publisher;
      if (!pub.name || pub.name.trim().length < 2) {
        errors.push('Publisher name must be at least 2 characters.');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!pub.supportEmail || !emailRegex.test(pub.supportEmail)) {
        errors.push('A valid support email is required.');
      }

      if (pub.website && !pub.website.startsWith('http://') && !pub.website.startsWith('https://')) {
        errors.push('Publisher website must start with http:// or https://.');
      }
    }

    // Documentation URL check
    if (model.documentationUrl && !model.documentationUrl.startsWith('http://') && !model.documentationUrl.startsWith('https://')) {
      errors.push('Documentation URL must start with http:// or https://.');
    }

    if (!model.license || model.license.trim() === '') {
      errors.push('License information is required.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates version metadata form inputs.
   */
  public validateVersionInputs(version: Partial<ModelVersion>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!version.version || !this.versionManager.isValidSemVer(version.version)) {
      errors.push(`Version code "${version.version}" does not follow valid semantic versioning rules (e.g., 1.0.0).`);
    }

    if (!version.releaseNotes || version.releaseNotes.trim().length < 5) {
      errors.push('Release notes are required and must be at least 5 characters.');
    }

    if (!version.checksum || !version.checksum.startsWith('sha256_') || version.checksum.length < 15) {
      errors.push('Checksum must be a valid SHA256 string starting with "sha256_".');
    }

    if (version.sizeBytes !== undefined && version.sizeBytes < 0) {
      errors.push('Model size in bytes cannot be negative.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
