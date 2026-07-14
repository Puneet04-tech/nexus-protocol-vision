import { DecisionTrace, TraceFilters } from './ExplainabilityTypes';

export class DecisionFilters {
  /**
   * Filters an array of DecisionTraces according to the query criteria.
   */
  static filterTraces(traces: DecisionTrace[], filters: TraceFilters): DecisionTrace[] {
    let filtered = [...traces];

    if (!filters) {
      return filtered;
    }

    // 1. Text Search (case-insensitive search in ID, type, summary, context, or results)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => {
        const idMatch = t.id.toLowerCase().includes(searchLower);
        const typeMatch = t.decisionType.toLowerCase().includes(searchLower);
        const summaryMatch = t.inputSummary.toLowerCase().includes(searchLower);
        const warningMatch = t.warnings.some(w => w.toLowerCase().includes(searchLower));
        const initiatorMatch = t.initiator.toLowerCase().includes(searchLower);
        const resultString = typeof t.decisionResult === 'object' ? JSON.stringify(t.decisionResult) : String(t.decisionResult);
        const resultMatch = resultString.toLowerCase().includes(searchLower);

        return idMatch || typeMatch || summaryMatch || warningMatch || initiatorMatch || resultMatch;
      });
    }

    // 2. Decision Type Filter
    if (filters.decisionType && filters.decisionType !== 'all') {
      filtered = filtered.filter(t => t.decisionType.toLowerCase() === filters.decisionType!.toLowerCase());
    }

    // 3. Persona ID Filter
    if (filters.personaId && filters.personaId !== 'all') {
      filtered = filtered.filter(t => t.personaId === filters.personaId);
    }

    // 4. Confidence Score Filter
    if (filters.minConfidence !== undefined) {
      filtered = filtered.filter(t => t.confidenceScore >= filters.minConfidence!);
    }
    if (filters.maxConfidence !== undefined) {
      filtered = filtered.filter(t => t.confidenceScore <= filters.maxConfidence!);
    }

    // 5. Ethical Violations Filter
    if (filters.hasEthicalViolations !== undefined) {
      filtered = filtered.filter(t => {
        const hasViolation = t.ethicalChecks.some(c => c.status === 'failed');
        return filters.hasEthicalViolations ? hasViolation : !hasViolation;
      });
    }

    // 6. Privacy Violations Filter
    if (filters.hasPrivacyViolations !== undefined) {
      filtered = filtered.filter(t => {
        const hasViolation = t.privacyChecks.some(c => c.status === 'failed');
        return filters.hasPrivacyViolations ? hasViolation : !hasViolation;
      });
    }

    // 7. Date Range Filter
    if (filters.startDate !== undefined) {
      filtered = filtered.filter(t => t.timestamp >= filters.startDate!);
    }
    if (filters.endDate !== undefined) {
      filtered = filtered.filter(t => t.timestamp <= filters.endDate!);
    }

    // 8. Sorting
    const sortBy = filters.sortBy || 'timestamp';
    const sortOrder = filters.sortOrder || 'desc';

    filtered.sort((a, b) => {
      const valA = a[sortBy] as any;
      const valB = b[sortBy] as any;

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      // Numbers or timestamps
      return sortOrder === 'asc'
        ? valA - valB
        : valB - valA;
    });

    return filtered;
  }
}
