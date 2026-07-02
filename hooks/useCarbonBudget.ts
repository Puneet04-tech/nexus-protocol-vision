/**
 * useCarbonBudget - Custom React hook for carbon budget tracking
 *
 * Provides reactive carbon budget state that any component can subscribe to.
 * Simulates real-time carbon consumption ticking up over time (as if an AI
 * workload is running) and exposes helpers to log operations and check status.
 *
 * Beginner note: This hook is a great example of "lifting state" — instead of
 * every component managing its own copy of the budget, they all share this one
 * hook, keeping everything in sync automatically.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A record of a single AI operation that consumed carbon */
export interface CarbonOperation {
  /** Unique identifier */
  id: string;
  /** Human-readable label (e.g. "Inference request", "Model training") */
  label: string;
  /** CO₂ emitted in kg */
  emissions: number;
  /** When the operation ran (Unix ms) */
  timestamp: number;
  /** Category of work */
  operationType: 'inference' | 'training' | 'optimization' | 'idle';
}

/** The numeric limits for the budget */
export interface BudgetLimits {
  /** Daily CO₂ ceiling in kg */
  dailyLimit: number;
  /** Warning alert threshold as a fraction of dailyLimit (0–1) */
  warningThreshold: number;
  /** Critical alert threshold as a fraction of dailyLimit (0–1) */
  criticalThreshold: number;
}

/** Human-readable budget health */
export type BudgetStatus = 'healthy' | 'warning' | 'critical';

/** Everything exposed by the hook */
export interface UseCarbonBudgetReturn {
  /** Total CO₂ emitted today (kg) */
  dailyUsage: number;
  /** How much budget is left today (kg) */
  remainingBudget: number;
  /** Usage as a percentage of the daily limit (0–100) */
  usagePercent: number;
  /** Current health of the carbon budget */
  budgetStatus: BudgetStatus;
  /** The configured limits (read-only) */
  limits: BudgetLimits;
  /** Full log of operations today, newest first */
  operationLog: CarbonOperation[];
  /** Log a new AI operation, deducting its emissions from the budget */
  logOperation: (label: string, emissions: number, type?: CarbonOperation['operationType']) => void;
  /** Reset usage back to zero (e.g. at start of a new day) */
  resetBudget: () => void;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

/**
 * useCarbonBudget
 *
 * Tracks the carbon footprint of AI operations against a daily limit.
 * Automatically simulates background idle emissions while mounted,
 * and exposes helpers for logging real operations.
 *
 * @param initialLimits - Optional budget configuration (defaults provided)
 * @returns {UseCarbonBudgetReturn} Live budget state and control functions
 *
 * @example
 * ```tsx
 * const { dailyUsage, budgetStatus, logOperation } = useCarbonBudget();
 *
 * const runInference = async () => {
 *   // ... do AI work ...
 *   logOperation('Inference request', 0.05);
 * };
 * ```
 */
export function useCarbonBudget(
  initialLimits: Partial<BudgetLimits> = {}
): UseCarbonBudgetReturn {
  // Merge provided limits with sensible defaults
  const limits: BudgetLimits = {
    dailyLimit: initialLimits.dailyLimit ?? 50,          // 50 kg CO₂ per day
    warningThreshold: initialLimits.warningThreshold ?? 0.7,  // warn at 70%
    criticalThreshold: initialLimits.criticalThreshold ?? 0.9, // critical at 90%
  };

  // The log of all operations that have been recorded today
  const [operationLog, setOperationLog] = useState<CarbonOperation[]>([]);

  // Simulate idle background emissions every 5 seconds
  // (represents always-on model serving, monitoring, etc.)
  useEffect(() => {
    const idleInterval = setInterval(() => {
      // Add a tiny idle emission (0.001–0.003 kg CO₂ per tick)
      const idleEmission = 0.001 + Math.random() * 0.002;

      setOperationLog((prev) => [
        {
          id: `idle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          label: 'Background idle',
          emissions: parseFloat(idleEmission.toFixed(4)),
          timestamp: Date.now(),
          operationType: 'idle',
        },
        ...prev,
      ]);
    }, 5000);

    // Cleanup: stop the interval when the component using this hook unmounts
    return () => clearInterval(idleInterval);
  }, []);

  /**
   * Sum up all emissions from the operation log.
   * useMemo ensures this doesn't recalculate on every render — only when
   * operationLog actually changes.
   */
  const dailyUsage = useMemo(
    () =>
      parseFloat(
        operationLog.reduce((sum, op) => sum + op.emissions, 0).toFixed(4)
      ),
    [operationLog]
  );

  /** How many kg CO₂ are left in today's budget */
  const remainingBudget = useMemo(
    () => parseFloat(Math.max(0, limits.dailyLimit - dailyUsage).toFixed(4)),
    [dailyUsage, limits.dailyLimit]
  );

  /** Usage as a 0–100 percentage */
  const usagePercent = useMemo(
    () => parseFloat(((dailyUsage / limits.dailyLimit) * 100).toFixed(2)),
    [dailyUsage, limits.dailyLimit]
  );

  /** Derive the human-readable status from usage percentage */
  const budgetStatus: BudgetStatus = useMemo(() => {
    const fraction = dailyUsage / limits.dailyLimit;
    if (fraction >= limits.criticalThreshold) return 'critical';
    if (fraction >= limits.warningThreshold) return 'warning';
    return 'healthy';
  }, [dailyUsage, limits]);

  /**
   * Log a new AI operation into the budget.
   * @param label - Friendly name for the operation
   * @param emissions - CO₂ cost in kg (e.g. 0.05 for a single inference)
   * @param type - Category of work (defaults to 'inference')
   */
  const logOperation = useCallback(
    (
      label: string,
      emissions: number,
      type: CarbonOperation['operationType'] = 'inference'
    ): void => {
      const entry: CarbonOperation = {
        id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        label,
        emissions: parseFloat(emissions.toFixed(4)),
        timestamp: Date.now(),
        operationType: type,
      };

      // Prepend so newest operations appear first in the log
      setOperationLog((prev) => [entry, ...prev]);
    },
    []
  );

  /** Reset the budget — clears all logged operations */
  const resetBudget = useCallback((): void => {
    setOperationLog([]);
  }, []);

  return {
    dailyUsage,
    remainingBudget,
    usagePercent,
    budgetStatus,
    limits,
    operationLog,
    logOperation,
    resetBudget,
  };
}
