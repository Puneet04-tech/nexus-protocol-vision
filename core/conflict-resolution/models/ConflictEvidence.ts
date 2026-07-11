/**
 * Model representing a single piece of evidence associated with a knowledge conflict
 */
export interface ConflictEvidence {
  id: string;
  conflictId: string;
  source: string;
  reliability: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  timestamp: number;
  usageFrequency?: number;
  supportingCount: number;
  contradictingCount: number;
  acceptanceRate?: number; // Historical acceptance rate (0.0 to 1.0)
  details: string;
}
