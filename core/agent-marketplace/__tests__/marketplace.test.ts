import { MarketplaceService } from '../services/MarketplaceService';
import { SecurityVerifier } from '../verification/SecurityVerifier';
import { AgentValidator } from '../validators/AgentValidator';

export interface TestCaseResult {
  name: string;
  suite: string;
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

export class MarketplaceTestSuite {
  public static async runTests(): Promise<SuiteResults> {
    const start = Date.now();
    const tests: TestCaseResult[] = [];

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

    const resetWorkspace = () => {
      const service = MarketplaceService.getInstance();
      service.registry.clearRegistry();
      service.permissions.clearConsentData();
      service.cache.clear();
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('nexus_marketplace_capability_registry');
        localStorage.removeItem('nexus_marketplace_permission_consent');
        localStorage.removeItem('nexus_marketplace_installer_history');
      }
      return service;
    };

    // 1. SemVer Validation & Ranges
    await runTest('SemVer Validation', 'validates simple version comparisons correctly', () => {
      if (AgentValidator.compare('1.2.3', '1.2.0') <= 0) throw new Error('1.2.3 should be greater than 1.2.0');
      if (AgentValidator.compare('1.0.0', '1.0.0') !== 0) throw new Error('1.0.0 should equal 1.0.0');
      if (AgentValidator.compare('0.9.0', '1.0.0') >= 0) throw new Error('0.9.0 should be less than 1.0.0');
    });

    await runTest('SemVer Validation', 'satisfies range syntax requirements (~, ^, >=, <=)', () => {
      if (!AgentValidator.satisfies('1.2.3', '>=1.0.0')) throw new Error('1.2.3 should satisfy >=1.0.0');
      if (AgentValidator.satisfies('2.0.0', '^1.2.3')) throw new Error('2.0.0 should not satisfy ^1.2.3');
      if (!AgentValidator.satisfies('1.2.5', '^1.2.3')) throw new Error('1.2.5 should satisfy ^1.2.3');
      if (!AgentValidator.satisfies('1.2.5', '~1.2.3')) throw new Error('1.2.5 should satisfy ~1.2.3');
      if (AgentValidator.satisfies('1.3.0', '~1.2.3')) throw new Error('1.3.0 should not satisfy ~1.2.3');
    });

    // 2. Capability Registry
    await runTest('Capability Registry', 'registers entries and queries by capability keywords', () => {
      const service = resetWorkspace();
      const entry = {
        agentId: 'test.agent.one',
        capabilities: ['vector-search', 'nlp'],
        supportedTasks: [],
        inputs: [],
        outputs: [],
        version: '1.0.0',
        compatibility: '>=1.0.0',
        permissions: [],
        executionMode: 'isolated' as const,
        dependencies: {},
        healthStatus: 'healthy' as const,
        publisher: 'Test Pub',
        digitalSignature: 'sig_test_pub_123',
        installStatus: 'installed' as const,
        updateStatus: 'up-to-date' as const
      };
      
      service.registry.register(entry);
      const fetched = service.registry.get('test.agent.one');
      if (!fetched) throw new Error('Registry failed to fetch entry.');
      
      const queried = service.registry.queryCapabilities(['vector-search']);
      if (queried.length !== 1 || queried[0].agentId !== 'test.agent.one') {
        throw new Error('Query by capability failed.');
      }
    });

    // 3. Security Verification
    await runTest('Security Verifier', 'accurately evaluates risk score based on requested permissions', () => {
      const service = resetWorkspace();
      const agent = service.repository.get('marketplace.rag.searcher');
      if (!agent) throw new Error('Seed agent missing.');

      const score = SecurityVerifier.calculateRiskScore(agent);
      if (score < 40 || score > 80) {
        throw new Error(`Risk score calculated incorrectly: ${score}`);
      }
    });

    await runTest('Security Verifier', 'rejects tampered digital signatures', () => {
      const service = resetWorkspace();
      const agent = service.repository.get('marketplace.rag.searcher');
      if (!agent) throw new Error('Seed agent missing.');

      const verification = SecurityVerifier.verify(agent, '1.2.0', []);
      if (!verification.isValidSignature) {
        throw new Error('Correct signature validation failed.');
      }
      
      const tampered = { 
        ...agent, 
        versionsHistory: agent.versionsHistory.map(v => ({ ...v, digitalSignature: 'sig_tampered' })) 
      };
      const failedVerification = SecurityVerifier.verify(tampered, '1.2.0', []);
      if (failedVerification.isValidSignature) {
        throw new Error('Verification passed with a tampered signature.');
      }
    });

    // 4. Installer
    await runTest('Agent Installer', 'fails installation when permissions are not authorized', async () => {
      const service = resetWorkspace();
      const agent = service.repository.get('marketplace.rag.searcher');
      if (!agent) throw new Error('Seed agent missing.');

      try {
        await service.installer.enqueue(agent.id, '1.2.0', 'install');
        throw new Error('Installation succeeded without user authorization.');
      } catch (err: any) {
        if (!err.message.includes('Permissions not authorized')) {
          throw err;
        }
      }
    });

    await runTest('Agent Installer', 'completes full installation transaction queue upon approval', async () => {
      const service = resetWorkspace();
      const agent = service.repository.get('marketplace.rag.searcher');
      if (!agent) throw new Error('Seed agent missing.');

      service.permissions.grantPermissions(agent.id, agent.permissions);
      await service.installer.enqueue(agent.id, '1.2.0', 'install');

      const installed = service.registry.get(agent.id);
      if (!installed || installed.version !== '1.2.0') {
        throw new Error('Installer failed to update registry with target version.');
      }
    });

    await runTest('Agent Installer', 'supports rolling back to previous version from history log', async () => {
      const service = resetWorkspace();
      const agent = service.repository.get('marketplace.rag.searcher');
      if (!agent) throw new Error('Seed agent missing.');

      service.permissions.grantPermissions(agent.id, agent.permissions);

      await service.installer.enqueue(agent.id, '1.0.0', 'install');
      await service.installer.enqueue(agent.id, '1.2.0', 'version-switch');

      let current = service.registry.get(agent.id);
      if (current?.version !== '1.2.0') throw new Error('Failed upgrade test.');

      await service.installer.enqueue(agent.id, '1.2.0', 'rollback');
      
      current = service.registry.get(agent.id);
      if (current?.version !== '1.0.0') {
        throw new Error(`Rollback failed, expected version 1.0.0, got: ${current?.version}`);
      }
    });

    // 5. Updater
    await runTest('Agent Updater', 'detects remote updates and updates registry status', async () => {
      const service = resetWorkspace();
      const agent = service.repository.get('marketplace.rag.searcher');
      if (!agent) throw new Error('Seed agent missing.');

      service.permissions.grantPermissions(agent.id, agent.permissions);
      await service.installer.enqueue(agent.id, '1.0.0', 'install');

      const updates = await service.updater.checkForUpdates();
      if (!updates[agent.id] || updates[agent.id].latestVersion !== '1.2.0') {
        throw new Error('Updater failed to detect new remote version.');
      }
      
      const local = service.registry.get(agent.id);
      if (local?.updateStatus !== 'update-available') {
        throw new Error('Registry state failed to transition to update-available.');
      }
    });

    const end = Date.now();
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;

    // Reset workspace after testing
    resetWorkspace();

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests
    };
  }
}
