/**
 * useThreatScanner - Custom React hook for the Adversarial Immune System
 *
 * This hook simulates real-time threat detection by wrapping the logic of
 * AdversarialImmuneSystem in a React-friendly interface. It lets any component
 * easily scan inputs for threats, neutralize them, and read live security state.
 *
 * Beginner note: A "custom hook" is just a function whose name starts with "use"
 * and can call other React hooks (like useState, useEffect). You can reuse it
 * across many components without copy-pasting logic.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Type Definitions ─────────────────────────────────────────────────────────

/** The severity levels a detected threat can have */
export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

/** What kind of attack was detected */
export type ThreatType =
  | 'prompt_injection'
  | 'agent_hijacking'
  | 'data_poisoning'
  | 'model_extraction'
  | 'denial_of_service';

/** A single detected threat entry stored in the log */
export interface ThreatEntry {
  /** Unique ID so React can efficiently update lists (used as `key` prop) */
  id: string;
  /** Category of attack */
  threatType: ThreatType;
  /** How dangerous the threat is */
  severity: ThreatSeverity;
  /** How certain the system is (0–1, where 1 = 100% confident) */
  confidence: number;
  /** A human-readable description of the attack */
  description: string;
  /** What action was taken to stop the threat */
  action: 'blocked' | 'quarantined' | 'sanitized' | 'monitoring';
  /** Unix timestamp (milliseconds) when the threat was detected */
  detectedAt: number;
  /** Was the threat successfully stopped? */
  neutralized: boolean;
  /** The original input text that triggered the detection */
  sourceInput: string;
}

/** Overall security health of the system */
export interface SecurityState {
  /** 0–100 score: higher = more protected */
  immunityLevel: number;
  /** Threats currently active (not yet neutralized) */
  activeThreats: number;
  /** Threats that have been resolved */
  neutralizedThreats: number;
  /** Current health description */
  systemHealth: 'healthy' | 'degraded' | 'compromised' | 'recovering';
  /** True while a scan is running */
  isScanning: boolean;
}

/** What the hook returns to any component that calls it */
export interface UseThreatScannerReturn {
  /** Full log of all detected threats (newest first) */
  threatLog: ThreatEntry[];
  /** Current overall security state */
  securityState: SecurityState;
  /**
   * Scan an input string for threats.
   * Returns an array of any detected ThreatEntry objects.
   * Beginner note: `async` means it returns a Promise — use `await` when calling it.
   */
  scanInput: (input: string) => Promise<ThreatEntry[]>;
  /**
   * Mark a specific threat (by id) as neutralized.
   * This updates the threat log and security state accordingly.
   */
  neutralizeThreat: (threatId: string) => void;
  /** Remove all entries from the threat log */
  clearLog: () => void;
}

// ─── Threat Pattern Database ──────────────────────────────────────────────────

/**
 * Simple keyword-based patterns used to detect threats in text.
 * Each pattern specifies what words to look for, what kind of threat
 * those words indicate, and how severe it is.
 *
 * In a real system this would use ML-based semantic analysis.
 */
const THREAT_PATTERNS: Array<{
  keywords: string[];
  threatType: ThreatType;
  severity: ThreatSeverity;
  description: string;
}> = [
  {
    keywords: ['ignore previous', 'ignore your instructions', 'disregard', 'forget your rules', 'jailbreak', 'developer mode'],
    threatType: 'prompt_injection',
    severity: 'high',
    description: 'Attempt to override the system\'s instructions or ethical constraints.',
  },
  {
    keywords: ['you are now', 'act as', 'pretend you are', 'roleplay as', 'simulate being'],
    threatType: 'prompt_injection',
    severity: 'medium',
    description: 'Persona hijacking attempt — trying to make the AI adopt a different identity.',
  },
  {
    keywords: ['take control', 'override', 'execute command', 'run script', 'sudo', 'admin mode'],
    threatType: 'agent_hijacking',
    severity: 'critical',
    description: 'Attempt to seize control of the AI agent and issue unauthorized commands.',
  },
  {
    keywords: ['inject data', 'corrupt training', 'poisoned sample', 'backdoor', 'trojan'],
    threatType: 'data_poisoning',
    severity: 'high',
    description: 'Attempt to corrupt the model\'s training data or introduce a backdoor.',
  },
  {
    keywords: ['extract model', 'steal weights', 'copy architecture', 'reverse engineer', 'replicate model'],
    threatType: 'model_extraction',
    severity: 'medium',
    description: 'Attempt to extract or replicate the model\'s parameters for unauthorized use.',
  },
  {
    keywords: ['flood requests', 'ddos', 'overload', 'spam requests', 'resource exhaustion'],
    threatType: 'denial_of_service',
    severity: 'high',
    description: 'Attempt to exhaust system resources and render the service unavailable.',
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Scan a text string against known threat patterns.
 * Returns an array of detected threats (may be empty if safe).
 */
function detectThreats(input: string): ThreatEntry[] {
  const normalizedInput = input.toLowerCase();
  const detected: ThreatEntry[] = [];

  for (const pattern of THREAT_PATTERNS) {
    const matchedKeyword = pattern.keywords.find((kw) =>
      normalizedInput.includes(kw.toLowerCase())
    );

    if (matchedKeyword) {
      // Calculate confidence: starts at base value then slightly varies
      // to simulate a real ML scoring system
      const baseConfidence = pattern.severity === 'critical' ? 0.92
        : pattern.severity === 'high' ? 0.82
        : pattern.severity === 'medium' ? 0.70
        : 0.55;

      // Add small random variance (±0.05) to feel more realistic
      const confidence = Math.min(0.99, baseConfidence + (Math.random() - 0.5) * 0.1);

      // Decide what action to take based on severity
      const action: ThreatEntry['action'] =
        pattern.severity === 'critical' ? 'quarantined'
        : pattern.severity === 'high' ? 'blocked'
        : pattern.severity === 'medium' ? 'sanitized'
        : 'monitoring';

      detected.push({
        id: `threat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        threatType: pattern.threatType,
        severity: pattern.severity,
        confidence,
        description: pattern.description,
        action,
        detectedAt: Date.now(),
        neutralized: false,
        sourceInput: input.slice(0, 120) + (input.length > 120 ? '…' : ''),
      });
    }
  }

  return detected;
}

/**
 * Derive overall security state from the current threat log.
 * Called every time the threat log changes.
 */
function deriveSecurityState(
  log: ThreatEntry[],
  isScanning: boolean
): SecurityState {
  const activeThreats = log.filter((t) => !t.neutralized).length;
  const neutralizedThreats = log.filter((t) => t.neutralized).length;

  // Immunity level: starts at 100, drops for each active threat based on severity
  const severityPenalty: Record<ThreatSeverity, number> = {
    low: 2,
    medium: 5,
    high: 12,
    critical: 25,
  };

  const totalPenalty = log
    .filter((t) => !t.neutralized)
    .reduce((sum, t) => sum + severityPenalty[t.severity], 0);

  const immunityLevel = Math.max(0, 100 - totalPenalty);

  // Determine health label
  const systemHealth: SecurityState['systemHealth'] =
    immunityLevel < 40 ? 'compromised'
    : immunityLevel < 65 ? 'degraded'
    : neutralizedThreats > 0 && activeThreats === 0 ? 'recovering'
    : 'healthy';

  return {
    immunityLevel,
    activeThreats,
    neutralizedThreats,
    systemHealth,
    isScanning,
  };
}

// ─── The Hook ─────────────────────────────────────────────────────────────────

/**
 * useThreatScanner
 *
 * A custom hook that provides a simulated real-time threat scanning interface.
 * Internally uses pattern matching on text inputs to identify known attack types
 * (prompt injection, agent hijacking, data poisoning, etc.).
 *
 * @returns {UseThreatScannerReturn} threatLog, securityState, scanInput, neutralizeThreat, clearLog
 *
 * @example
 * ```tsx
 * const { threatLog, securityState, scanInput } = useThreatScanner();
 *
 * const handleUserInput = async (text: string) => {
 *   const threats = await scanInput(text);
 *   if (threats.length > 0) {
 *     console.log('Threats detected!', threats);
 *   }
 * };
 * ```
 */
export function useThreatScanner(): UseThreatScannerReturn {
  // The full list of threats that have been detected
  const [threatLog, setThreatLog] = useState<ThreatEntry[]>([]);

  // Whether a scan is currently in progress
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Derived security state — computed from the threat log
  const [securityState, setSecurityState] = useState<SecurityState>(() =>
    deriveSecurityState([], false)
  );

  // useRef lets us read the latest threatLog inside callbacks without
  // making them re-create on every render (avoids stale closure bugs)
  const threatLogRef = useRef<ThreatEntry[]>([]);
  threatLogRef.current = threatLog;

  // Recalculate security state whenever the threat log or scanning flag changes
  useEffect(() => {
    setSecurityState(deriveSecurityState(threatLog, isScanning));
  }, [threatLog, isScanning]);

  /**
   * Scan an input string for threats.
   * Simulates a brief async delay to feel like real network analysis.
   */
  const scanInput = useCallback(async (input: string): Promise<ThreatEntry[]> => {
    if (!input.trim()) return [];

    setIsScanning(true);

    // Simulate the time it takes to analyze the input (100–350ms)
    const analysisDelay = 100 + Math.random() * 250;
    await new Promise<void>((resolve) => setTimeout(resolve, analysisDelay));

    const detected = detectThreats(input);

    if (detected.length > 0) {
      // Add new threats to the front of the log (newest first)
      setThreatLog((prev) => [...detected, ...prev]);
    }

    setIsScanning(false);
    return detected;
  }, []);

  /**
   * Mark a single threat as neutralized by its id.
   * Neutralized threats stay in the log for auditing but are visually distinct.
   */
  const neutralizeThreat = useCallback((threatId: string): void => {
    setThreatLog((prev) =>
      prev.map((threat) =>
        threat.id === threatId ? { ...threat, neutralized: true } : threat
      )
    );
  }, []);

  /** Wipe the entire threat log */
  const clearLog = useCallback((): void => {
    setThreatLog([]);
  }, []);

  return {
    threatLog,
    securityState,
    scanInput,
    neutralizeThreat,
    clearLog,
  };
}
