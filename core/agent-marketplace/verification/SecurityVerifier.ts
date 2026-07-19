import { MarketplaceAgent, VerificationReport } from '../types';
import { AgentValidator } from '../validators/AgentValidator';

export class SecurityVerifier {
  private static readonly PROTOCOL_VERSION = '1.0.0';

  /**
   * Performs an exhaustive security verification on an agent before installation
   */
  public static verify(
    agent: MarketplaceAgent,
    versionToInstall: string,
    existingInstalledAgents: string[]
  ): VerificationReport {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Find the version details
    const versionDetails = agent.versionsHistory.find(v => v.version === versionToInstall);
    if (!versionDetails) {
      errors.push(`Version ${versionToInstall} does not exist in the agent's release history.`);
      return {
        isValidSignature: false,
        isValidChecksum: false,
        isCompatible: false,
        dependenciesResolved: false,
        riskScore: 100,
        riskLevel: 'high',
        warnings,
        errors
      };
    }

    // 1. Digital Signature Check
    const isValidSignature = this.validateSignature(agent.publisher.name, versionDetails.digitalSignature);
    if (!isValidSignature) {
      errors.push(`Invalid digital signature for version ${versionToInstall} by publisher ${agent.publisher.name}.`);
    }

    // 2. Checksum validation
    const isValidChecksum = this.validateChecksum(versionDetails.entry, versionDetails.checksum);
    if (!isValidChecksum) {
      errors.push(`Checksum mismatch. The download file is corrupt or has been tampered with.`);
    }

    // 3. Publisher Trust
    if (!agent.publisher.verified) {
      warnings.push(`Publisher '${agent.publisher.name}' is unverified.`);
    }
    if (agent.publisher.reputationScore < 50) {
      warnings.push(`Publisher '${agent.publisher.name}' has a low reputation score (${agent.publisher.reputationScore}/100).`);
    }

    // 4. Compatibility check
    const isCompatible = AgentValidator.satisfies(this.PROTOCOL_VERSION, agent.compatibility);
    if (!isCompatible) {
      errors.push(`Agent compatibility requirements '${agent.compatibility}' do not support Protocol Version '${this.PROTOCOL_VERSION}'.`);
    }

    // 5. Dependency check
    let dependenciesResolved = true;
    if (agent.dependencies) {
      for (const [depId, depVersionRange] of Object.entries(agent.dependencies)) {
        if (!existingInstalledAgents.includes(depId)) {
          errors.push(`Missing dependency: '${depId}' (${depVersionRange}) is required but not installed.`);
          dependenciesResolved = false;
        }
      }
    }

    // 6. Risk analysis & scoring
    const riskScore = this.calculateRiskScore(agent);
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore >= 70) {
      riskLevel = 'high';
      warnings.push(`This agent requests highly sensitive permissions and has a HIGH risk score (${riskScore}/100).`);
    } else if (riskScore >= 35) {
      riskLevel = 'medium';
    }

    return {
      isValidSignature,
      isValidChecksum,
      isCompatible,
      dependenciesResolved,
      riskScore,
      riskLevel,
      warnings,
      errors
    };
  }

  /**
   * Cryptographically simulates digital signature checks.
   */
  public static validateSignature(publisherName: string, signature: string): boolean {
    if (!signature) return false;
    return signature.startsWith('sig_') && signature.toLowerCase().includes(publisherName.replace(/\s+/g, '').toLowerCase());
  }

  /**
   * Validates code content string checksum
   */
  public static validateChecksum(content: string, checksum: string): boolean {
    if (!content || !checksum) return false;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const computedChecksum = 'sha256_' + Math.abs(hash).toString(16);
    return computedChecksum === checksum;
  }

  /**
   * Calculates a risk score based on permission requirements and publisher credentials.
   */
  public static calculateRiskScore(agent: MarketplaceAgent): number {
    let score = 10; // base risk

    agent.permissions.forEach(perm => {
      switch (perm) {
        case 'network.access':
          score += 30;
          break;
        case 'persona.write':
          score += 25;
          break;
        case 'graph.write':
          score += 20;
          break;
        case 'persona.read':
          score += 15;
          break;
        case 'graph.read':
          score += 10;
          break;
        case 'storage.write':
          score += 10;
          break;
        case 'storage.read':
          score += 5;
          break;
        default:
          score += 5;
      }
    });

    if (!agent.publisher.verified) {
      score += 15;
    }
    const reputationPenalty = Math.max(0, 100 - agent.publisher.reputationScore) / 4;
    score += reputationPenalty;

    return Math.min(100, Math.max(0, Math.round(score)));
  }
}
