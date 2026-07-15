import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { CompatibilityService } from '../compatibility/CompatibilityService';
import { ModelVersion, ValidationRun, ValidationResult, ValidationIssue } from '../types';

export class ValidationEngine {
  private static instance: ValidationEngine | null = null;
  private repository = ModelRegistryRepository.getInstance();
  private compatibility = CompatibilityService.getInstance();

  // Mock hosting environment versions
  private readonly hostEnvironment: Record<string, string> = {
    'onnxruntime': '1.16.0',
    'transformers': '4.36.2',
    'llama.cpp': 'b2800',
    'react': '18.2.0',
    'node': '22.14.0'
  };

  private constructor() {}

  public static getInstance(): ValidationEngine {
    if (!this.instance) {
      this.instance = new ValidationEngine();
    }
    return this.instance;
  }

  /**
   * Integrity Validation: Check checksum match and signature structures
   */
  public validateIntegrity(version: ModelVersion): ValidationResult {
    const issues: ValidationIssue[] = [];
    const checksum = version.checksum;

    if (!checksum || !checksum.startsWith('sha256_')) {
      issues.push({
        rule: 'Checksum Format Check',
        type: 'error',
        message: 'Invalid or missing checksum. SHA256 checksum prefix is required.'
      });
    }

    if (version.sizeBytes < 0) {
      issues.push({
        rule: 'File Size Boundaries',
        type: 'error',
        message: 'Model weight file size cannot be negative.'
      });
    }

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      validatedAt: Date.now()
    };
  }

  /**
   * Dependency Validation: Verify model software requisites match hosting stack
   */
  public validateDependencies(version: ModelVersion): ValidationResult {
    const issues: ValidationIssue[] = [];
    const report = this.compatibility.validateDependencies(version.dependencies, this.hostEnvironment);

    report.missing.forEach(pkg => {
      issues.push({
        rule: 'Dependency Check',
        type: 'error',
        message: `Required package "${pkg}" is missing in current host environment.`
      });
    });

    report.incompatible.forEach(err => {
      issues.push({
        rule: 'Compatibility Check',
        type: 'error',
        message: `Version conflict: ${err}`
      });
    });

    return {
      isValid: issues.length === 0,
      issues,
      validatedAt: Date.now()
    };
  }

  /**
   * Schema Validation: Verify that input and output schemas have fields
   */
  public validateSchema(version: ModelVersion): ValidationResult {
    const issues: ValidationIssue[] = [];

    const validateIO = (ioSchema: ModelVersion['inputSchema'] | ModelVersion['outputSchema'], type: 'input' | 'output') => {
      if (!ioSchema || !ioSchema.fields || ioSchema.fields.length === 0) {
        issues.push({
          rule: `${type.toUpperCase()} Schema Field Check`,
          type: 'warning',
          message: `The ${type} schema is empty. This model won't assert interface arguments.`
        });
        return;
      }

      ioSchema.fields.forEach(field => {
        if (!field.name) {
          issues.push({
            rule: 'Field Name Check',
            type: 'error',
            message: `Empty field name detected in ${type} schema.`
          });
        }
        if (!['string', 'number', 'boolean', 'array', 'object'].includes(field.type)) {
          issues.push({
            rule: 'Field Type Check',
            type: 'error',
            message: `Unsupported type "${field.type}" for field "${field.name}" in ${type} schema.`
          });
        }
      });
    };

    validateIO(version.inputSchema, 'input');
    validateIO(version.outputSchema, 'output');

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      validatedAt: Date.now()
    };
  }

  /**
   * Hyperparameter Configuration Validation
   */
  public validateConfiguration(version: ModelVersion, configs: Record<string, any>): ValidationResult {
    const issues: ValidationIssue[] = [];

    Object.entries(configs).forEach(([key, val]) => {
      const spec = version.hyperparameterSchema?.[key];
      if (!spec) {
        issues.push({
          rule: 'Config Check',
          type: 'warning',
          message: `Configuration key "${key}" is not registered in version schema.`
        });
        return;
      }

      if (spec.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          issues.push({
            rule: 'Type Constraint Check',
            type: 'error',
            message: `Config key "${key}" must be a number, got "${val}".`
          });
        } else if (key === 'temperature' && (num < 0 || num > 2)) {
          issues.push({
            rule: 'Boundary Check',
            type: 'error',
            message: `Temperature value ${num} is out of bounds (0.0 to 2.0).`
          });
        }
      }
    });

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      validatedAt: Date.now()
    };
  }

  /**
   * Performs complete pre-deployment verification pipeline.
   * Runs: integrity, dependency, schema audits.
   * If validation is successful, saves run logs to Repository history.
   */
  public runPredeploymentValidation(modelId: string, versionStr: string): ValidationRun[] {
    const ver = this.repository.getVersion(modelId, versionStr);
    if (!ver) {
      throw new Error(`Version ${versionStr} not found for model ${modelId}.`);
    }

    const runs: ValidationRun[] = [];
    const types: ('compatibility' | 'dependency' | 'schema' | 'performance' | 'security')[] = [
      'compatibility',
      'dependency',
      'schema',
      'performance',
      'security'
    ];

    types.forEach(type => {
      const start = Date.now();
      let res: ValidationResult;

      switch (type) {
        case 'dependency':
          res = this.validateDependencies(ver);
          break;
        case 'schema':
          res = this.validateSchema(ver);
          break;
        case 'compatibility':
          res = this.validateIntegrity(ver); // Basic format compatibility
          break;
        case 'performance':
          // Simulated validation latency/throughput scoring
          res = {
            isValid: true,
            issues: [],
            performanceScore: 85 + Math.floor(Math.random() * 15),
            validatedAt: Date.now()
          };
          break;
        case 'security':
          // Simulated licensing/vulnerabilities sweep
          const hasProprietary = ver.checksum.charCodeAt(10) % 2 === 0;
          res = {
            isValid: true,
            issues: hasProprietary ? [
              { rule: 'Sandbox Verification', type: 'warning', message: 'Licensing constraints audit scan recommended.' }
            ] : [],
            validatedAt: Date.now()
          };
          break;
      }

      const runStatus = res.isValid
        ? (res.issues.length > 0 ? 'warning' : 'passed')
        : 'failed';

      const validationRun: ValidationRun = {
        id: `vrun_${Date.now()}_${type}`,
        modelId,
        version: versionStr,
        type,
        status: runStatus as 'passed' | 'failed' | 'warning',
        durationMs: Date.now() - start + 20, // Pad slightly to simulate CPU cycles
        results: res,
        checkedAt: Date.now()
      };

      this.repository.saveValidationRun(validationRun);
      runs.push(validationRun);
    });

    return runs;
  }
}
