import { Memory, SearchQuery } from '../types';

export class MemoryValidator {
  /**
   * Sanitizes search queries to prevent malicious input like script injections.
   */
  public static sanitizeQueryText(text: string): string {
    if (!text) return '';
    // Strip HTML/Script tags
    let clean = text.replace(/<[^>]*>?/gm, '');
    // Limit search text length to prevent DDoS/resource exhaustion
    if (clean.length > 500) {
      clean = clean.substring(0, 500);
    }
    return clean.trim();
  }

  /**
   * Validates if a Memory object is structurally compliant before ingestion.
   */
  public static validateMemory(memory: Partial<Memory>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!memory.content || memory.content.trim().length === 0) {
      errors.push('Memory content is required and cannot be empty.');
    } else if (memory.content.length > 10000) {
      errors.push('Memory content exceeds the maximum size of 10,000 characters.');
    }

    if (memory.importance === undefined || memory.importance < 0 || memory.importance > 1) {
      errors.push('Memory importance must be a floating point number between 0 and 1.');
    }

    if (memory.recency !== undefined && memory.recency < 0) {
      errors.push('Memory recency timestamp cannot be negative.');
    }

    if (!memory.category) {
      errors.push('Memory category is required.');
    } else {
      const validCategories = ['conversation', 'knowledge', 'interaction', 'system'];
      if (!validCategories.includes(memory.category)) {
        errors.push(`Invalid category: ${memory.category}. Allowed: ${validCategories.join(', ')}`);
      }
    }

    if (!memory.source) {
      errors.push('Memory source is required.');
    } else {
      const validSources = [
        'Sovereign Persona',
        'Cognitive Graph',
        'Workflow Orchestrator',
        'AI Marketplace',
        'Collaboration Studio',
        'System',
        'Privacy Negotiator',
        'Carbon Aware Optimizer'
      ];
      if (!validSources.includes(memory.source)) {
        errors.push(`Invalid source: ${memory.source}. Allowed: ${validSources.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates the structure of a search query object.
   */
  public static validateSearchQuery(query: SearchQuery): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (query.minImportance !== undefined && (query.minImportance < 0 || query.minImportance > 1)) {
      errors.push('minImportance filter must be between 0 and 1.');
    }

    if (query.limit !== undefined && query.limit <= 0) {
      errors.push('limit parameter must be a positive integer.');
    }

    if (query.offset !== undefined && query.offset < 0) {
      errors.push('offset parameter cannot be negative.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check permissions based on a privacy level and caller profile context.
   */
  public static checkAccessPermission(memory: Memory, callerIdentity: string): boolean {
    // Default mock permission logic: 
    // System source memories can always be accessed.
    // If memory privacy is 'private', it can only be accessed by 'owner' or 'system-root'.
    const privacy = memory.metadata.privacyLevel || 'selective';
    if (privacy === 'private') {
      return callerIdentity === 'owner' || callerIdentity === 'system-root';
    }
    
    if (privacy === 'selective') {
      // Selective allows owner, system-root, or verified sandbox agents
      return ['owner', 'system-root', 'sandbox-agent', 'persona-core'].includes(callerIdentity);
    }

    // Public is accessible to any caller
    return true;
  }
}
