import { ModelRegistryAPI } from '../api/ModelRegistryAPI';
import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { VersionManager } from '../versioning/VersionManager';
import { CompatibilityService } from '../compatibility/CompatibilityService';
import { SecurityService } from '../services/SecurityService';
import { ValidationEngine } from '../validation/ValidationEngine';
import { ModelMetadata, ModelVersion, DeploymentInfo, DeploymentHistoryEntry } from '../types';

export interface TestCaseResult {
  suite: string;
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface SuiteResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestCaseResult[];
}

export class ModelRegistryTestSuite {
  public static async runTests(): Promise<SuiteResults> {
    const start = Date.now();
    const tests: TestCaseResult[] = [];

    const api = ModelRegistryAPI.getInstance();
    const repository = ModelRegistryRepository.getInstance();
    const versionManager = VersionManager.getInstance();
    const compatibilityService = CompatibilityService.getInstance();
    const securityService = SecurityService.getInstance();
    const validationEngine = ValidationEngine.getInstance();

    const runTest = async (suite: string, name: string, fn: () => void | Promise<void>) => {
      const tStart = Date.now();
      try {
        await fn();
        tests.push({
          suite,
          name,
          passed: true,
          duration: Date.now() - tStart
        });
      } catch (err: any) {
        tests.push({
          suite,
          name,
          passed: false,
          duration: Date.now() - tStart,
          error: err.message || String(err)
        });
      }
    };

    // Reset database to seed baseline before running tests
    repository.clearAll();

    // ==========================================
    // 1. SEMANTIC VERSION CONTROL TESTS
    // ==========================================
    await runTest('Version Manager', 'validates correct SemVer formats', () => {
      if (!versionManager.isValidSemVer('1.0.0')) throw new Error('Expected 1.0.0 to be valid');
      if (!versionManager.isValidSemVer('2.5.3-alpha.1')) throw new Error('Expected 2.5.3-alpha.1 to be valid');
      if (versionManager.isValidSemVer('1.0')) throw new Error('Expected 1.0 to be invalid');
      if (versionManager.isValidSemVer('v1.0.0')) throw new Error('Expected v1.0.0 to be invalid (no leading v)');
    });

    await runTest('Version Manager', 'compares versions correctly', () => {
      if (versionManager.compareSemVer('1.2.0', '1.1.0') <= 0) throw new Error('1.2.0 should be greater than 1.1.0');
      if (versionManager.compareSemVer('1.0.0-alpha', '1.0.0') >= 0) throw new Error('1.0.0-alpha should be less than 1.0.0');
      if (versionManager.compareSemVer('2.0.0', '2.0.0') !== 0) throw new Error('Versions should be equal');
    });

    // ==========================================
    // 2. DEPENDENCY COMPATIBILITY TESTS
    // ==========================================
    await runTest('Compatibility Service', 'evaluates version constraints correctly', () => {
      // Caret Range (^-checks)
      if (!compatibilityService.satisfies('1.2.5', '^1.2.0')) throw new Error('Expected 1.2.5 to satisfy ^1.2.0');
      if (compatibilityService.satisfies('2.0.0', '^1.2.0')) throw new Error('Expected 2.0.0 to NOT satisfy ^1.2.0');

      // Tilde Range (~-checks)
      if (!compatibilityService.satisfies('1.2.5', '~1.2.0')) throw new Error('Expected 1.2.5 to satisfy ~1.2.0');
      if (compatibilityService.satisfies('1.3.0', '~1.2.0')) throw new Error('Expected 1.3.0 to NOT satisfy ~1.2.0');

      // Inequality range
      if (!compatibilityService.satisfies('3.0.0', '>=2.0.0')) throw new Error('Expected 3.0.0 to satisfy >=2.0.0');
      if (compatibilityService.satisfies('1.5.0', '<1.2.0')) throw new Error('Expected 1.5.0 to NOT satisfy <1.2.0');
    });

    // ==========================================
    // 3. SEARCH & DISCOVERY TESTS
    // ==========================================
    await runTest('Search Engine', 'filters registered models correctly', async () => {
      const results1 = await api.searchModels({ query: 'Gemini' });
      if (results1.length === 0) throw new Error('Expected to find Gemini model');
      if (results1[0].id !== 'gemini-3.5-flash') throw new Error('Expected Gemini 3.5 Flash to be returned');

      const results2 = await api.searchModels({ framework: 'GGUF' });
      if (results2.length === 0) throw new Error('Expected to find Llama model via GGUF framework');
      if (results2[0].id !== 'llama-3-8b-instruct') throw new Error('Expected Llama 3 8B to be returned');
    });

    // ==========================================
    // 4. INTEGRITY & SCHEMA VALIDATION TESTS
    // ==========================================
    await runTest('Validation Engine', 'detects schema integrity warnings', () => {
      const badVersion: ModelVersion = {
        version: '1.0.0',
        modelId: 'test-model',
        releaseNotes: 'Valid notes',
        releaseDate: Date.now(),
        checksum: 'bad_checksum', // Missing sha256_
        sizeBytes: -10, // Negative size
        inputSchema: { fields: [] },
        outputSchema: { fields: [] },
        status: 'active',
        dependencies: {},
        hyperparameterSchema: {},
        parametersCount: '1B'
      };

      const integrityReport = validationEngine.validateIntegrity(badVersion);
      if (integrityReport.isValid) throw new Error('Expected integrity validation to fail due to negative size and format checksum.');

      const schemaReport = validationEngine.validateSchema(badVersion);
      if (schemaReport.issues.length < 2) throw new Error('Expected warnings for empty schemas.');
    });

    // ==========================================
    // 5. SECURITY & AUTHORIZATION TESTS
    // ==========================================
    await runTest('Security Service', 'blocks unauthorized user roles', async () => {
      const newModel: ModelMetadata = {
        id: 'hack-model',
        name: 'Hacked weights',
        description: 'Unauthorized model upload attempt',
        publisher: {
          name: 'Anonymous',
          verified: false,
          reputationScore: 0,
          supportEmail: 'anon@hack.com',
          website: ''
        },
        category: 'Custom',
        tags: [],
        framework: 'PyTorch',
        license: 'GPL-3.0',
        documentationUrl: '',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      try {
        // Try registering with Auditor role (should throw)
        await api.registerModel(newModel, 'Auditor');
        throw new Error('Should have failed to register model as Auditor.');
      } catch (e: any) {
        if (!e.message.includes('Authorization failed')) {
          throw e;
        }
      }

      // Successful registration with Architect role
      await api.registerModel(newModel, 'Architect');
      const registered = repository.getModel('hack-model');
      if (!registered) throw new Error('Expected model to be successfully registered by Architect.');
    });

    // ==========================================
    // 6. DEPLOYMENT & CANARY SCHEDULER TESTS
    // ==========================================
    await runTest('Deployment Manager', 'triggers staging deployments and executes canary promotion', async () => {
      // Clear duplicate mock deployments to have a clean testing slate
      repository.clearAll();

      const newVersion: ModelVersion = {
        version: '1.0.0',
        modelId: 'gemini-3.5-flash',
        releaseNotes: 'Valid release notes',
        releaseDate: Date.now(),
        checksum: 'sha256_abcdef1234567890',
        sizeBytes: 0,
        inputSchema: { fields: [{ name: 'in', type: 'string', description: 'desc', required: true }] },
        outputSchema: { fields: [{ name: 'out', type: 'string', description: 'desc', required: true }] },
        status: 'active',
        dependencies: {},
        hyperparameterSchema: {},
        parametersCount: 'unknown'
      };
      repository.saveVersion(newVersion);

      // Deploy Canary version
      const dep = await api.triggerDeployment({
        modelId: 'gemini-3.5-flash',
        version: '1.0.0',
        environment: 'production',
        strategy: 'canary',
        role: 'Operator'
      });

      if (dep.status !== 'deploying') throw new Error('Expected status to be deploying initially');
      if (dep.currentTrafficWeight !== 10) throw new Error('Expected Canary traffic weight to start at 10%');

      // Setup a stable version deployment to act as Canary baseline sibling
      const stableDep: DeploymentInfo = {
        id: 'dep-stable-sibling',
        modelId: 'gemini-3.5-flash',
        version: '1.1.0',
        environment: 'production',
        status: 'active',
        strategy: 'standard',
        currentTrafficWeight: 90,
        activeReplicas: 2,
        targetReplicas: 2,
        launchedAt: Date.now() - 100000,
        updatedAt: Date.now(),
        clusterConfig: { gpuType: 'API', minGpus: 0, maxGpus: 0, memoryPerReplicaGb: 0 }
      };
      repository.saveDeployment(stableDep);

      // Simulate ticking from scheduler to boot containers and shift traffic
      const scheduler = await import('../scheduler/DeploymentScheduler').then(m => m.DeploymentScheduler.getInstance());
      
      // Force startup container simulation
      scheduler.tick(); // Boots replica to target
      
      const activeDep = repository.getDeployment(dep.id)!;
      if (activeDep.status !== 'active') throw new Error('Expected container status to be promoted to active.');

      // Escalation check
      scheduler.tick(); // Auto-shifts Canary weight from 10% to 20%
      const promotedDep = repository.getDeployment(dep.id)!;
      if (promotedDep.currentTrafficWeight !== 20) throw new Error(`Expected Canary traffic to shift to 20%, got ${promotedDep.currentTrafficWeight}%`);

      const affectedStable = repository.getDeployment('dep-stable-sibling')!;
      if (affectedStable.currentTrafficWeight !== 80) throw new Error(`Expected baseline stable version weight to drop to 80%, got ${affectedStable.currentTrafficWeight}%`);
    });

    // ==========================================
    // 7. HISTORICAL ROLLBACK TOPOLOGY TESTS
    // ==========================================
    await runTest('Rollback Service', 'reverts deployment to predecessor stable version', async () => {
      // Configure deployment history
      repository.clearAll();

      const dep: DeploymentInfo = {
        id: 'dep-rollback-target',
        modelId: 'gemini-3.5-flash',
        version: '1.2.0', // Current (bad) version
        environment: 'production',
        status: 'active',
        strategy: 'standard',
        currentTrafficWeight: 100,
        activeReplicas: 10,
        targetReplicas: 10,
        launchedAt: Date.now(),
        updatedAt: Date.now(),
        clusterConfig: { gpuType: 'API Proxy', minGpus: 0, maxGpus: 0, memoryPerReplicaGb: 0 }
      };
      repository.saveDeployment(dep);

      // Seed previous stable deploy logs
      const historyEntry1: DeploymentHistoryEntry = {
        id: 'dh-rb-1',
        deploymentId: 'dep-rollback-target',
        modelId: 'gemini-3.5-flash',
        version: '1.1.0', // Old stable version
        environment: 'production',
        eventType: 'complete',
        timestamp: Date.now() - 500000,
        message: 'Successfully deployed version 1.1.0 to production.',
        trafficWeight: 100,
        user: 'operator'
      };
      repository.saveHistoryEntry(historyEntry1);

      // Perform rollback via API
      const rolledBackVersion = await api.rollbackDeployment('dep-rollback-target', 'Operator');
      if (rolledBackVersion !== '1.1.0') throw new Error(`Expected rollback version 1.1.0, got ${rolledBackVersion}`);

      const revertedDeployment = repository.getDeployment('dep-rollback-target')!;
      if (revertedDeployment.version !== '1.1.0') throw new Error(`Expected reverted version 1.1.0, got ${revertedDeployment.version}`);
    });

    const end = Date.now();
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests
    };
  }
}
export default ModelRegistryTestSuite;
