/**
 * ThreatLogViewer
 *
 * A real-time, animated log panel that displays threats detected by the
 * Adversarial Immune System. Each entry shows the threat type, severity,
 * confidence score, action taken, and a "Neutralize" button.
 *
 * Designed to be embedded in the ImmuneSystemPage or any other page that
 * uses the `useThreatScanner` hook.
 *
 * Beginner note: This component is "controlled" — it doesn't manage its own
 * threat list. Instead it receives `threatLog` and `securityState` as props,
 * which come from the `useThreatScanner` hook in the parent component.
 * This pattern is called "lifting state up."
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  ShieldOff,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';
import { ThreatEntry, SecurityState, ThreatSeverity } from '../hooks/useThreatScanner';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ThreatLogViewerProps {
  /** The list of detected threats, newest first (from useThreatScanner) */
  threatLog: ThreatEntry[];
  /** Current security health (from useThreatScanner) */
  securityState: SecurityState;
  /** Callback to neutralize a threat by its id */
  onNeutralize: (threatId: string) => void;
  /** Callback to wipe the entire log */
  onClearLog: () => void;
  /** Optional max height for the scrollable list (CSS value, e.g. '400px') */
  maxHeight?: string;
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

/** Maps a severity level to Tailwind colour classes for badge and border */
const SEVERITY_STYLES: Record<
  ThreatSeverity,
  { badge: string; border: string; icon: string; label: string }
> = {
  low: {
    badge: 'bg-blue-900/60 text-blue-300 border-blue-700',
    border: 'border-l-blue-500',
    icon: 'text-blue-400',
    label: 'Low',
  },
  medium: {
    badge: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
    border: 'border-l-yellow-500',
    icon: 'text-yellow-400',
    label: 'Medium',
  },
  high: {
    badge: 'bg-orange-900/60 text-orange-300 border-orange-700',
    border: 'border-l-orange-500',
    icon: 'text-orange-400',
    label: 'High',
  },
  critical: {
    badge: 'bg-red-900/60 text-red-300 border-red-700',
    border: 'border-l-red-500',
    icon: 'text-red-400',
    label: 'Critical',
  },
};

/** Maps immunity level (0-100) to a Tailwind colour class for the gauge bar */
function immunityBarColor(level: number): string {
  if (level >= 80) return 'bg-green-500';
  if (level >= 55) return 'bg-yellow-500';
  if (level >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

/** Maps health status to an icon + text colour */
function healthStyles(health: SecurityState['systemHealth']): {
  color: string;
  label: string;
} {
  switch (health) {
    case 'healthy':
      return { color: 'text-green-400', label: 'Healthy' };
    case 'recovering':
      return { color: 'text-blue-400', label: 'Recovering' };
    case 'degraded':
      return { color: 'text-yellow-400', label: 'Degraded' };
    case 'compromised':
      return { color: 'text-red-400', label: 'Compromised' };
  }
}

/** Format a Unix timestamp as "HH:MM:SS" */
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Make threat type keys look nicer (e.g. "prompt_injection" → "Prompt Injection") */
function formatThreatType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * SecurityStatusBar
 *
 * The header panel showing immunity level gauge and key counters.
 */
const SecurityStatusBar: React.FC<{ state: SecurityState }> = ({ state }) => {
  const { color, label } = healthStyles(state.systemHealth);

  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 mb-4">
      {/* Row 1: title + scanning indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold text-sm">Immune System Status</span>
        </div>

        {/* Pulse dot that animates while scanning */}
        {state.isScanning && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="text-cyan-400 text-xs font-medium">Scanning…</span>
          </div>
        )}
      </div>

      {/* Immunity level gauge */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400 text-xs">Immunity Level</span>
          <span className="text-white text-xs font-bold">{state.immunityLevel}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-2 rounded-full ${immunityBarColor(state.immunityLevel)}`}
            initial={{ width: 0 }}
            animate={{ width: `${state.immunityLevel}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Counters row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-gray-700/50 rounded-lg py-2">
          <div className="text-red-400 font-bold text-lg leading-none mb-0.5">
            {state.activeThreats}
          </div>
          <div className="text-gray-400">Active</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg py-2">
          <div className="text-green-400 font-bold text-lg leading-none mb-0.5">
            {state.neutralizedThreats}
          </div>
          <div className="text-gray-400">Neutralized</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg py-2">
          <div className={`font-bold text-sm leading-none mb-0.5 ${color}`}>{label}</div>
          <div className="text-gray-400">Health</div>
        </div>
      </div>
    </div>
  );
};

/**
 * ThreatCard
 *
 * Renders a single threat entry from the log with animated entrance,
 * colour-coded severity, and a "Neutralize" button.
 */
const ThreatCard: React.FC<{
  threat: ThreatEntry;
  onNeutralize: (id: string) => void;
}> = ({ threat, onNeutralize }) => {
  const styles = SEVERITY_STYLES[threat.severity];

  return (
    <motion.div
      layout                               // Framer Motion animates reflow when items are removed
      initial={{ opacity: 0, x: -20 }}    // Slide in from left when first rendered
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}         // Slide out to the right when removed
      transition={{ duration: 0.25 }}
      className={`
        border-l-4 ${styles.border}
        bg-gray-800/70 border border-gray-700/50 rounded-lg p-3 mb-2
        ${threat.neutralized ? 'opacity-50' : ''}
      `}
    >
      {/* Top row: type badge + action + timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Threat type */}
          <span className="text-white text-xs font-semibold">
            {formatThreatType(threat.threatType)}
          </span>

          {/* Severity badge */}
          <span
            className={`px-1.5 py-0.5 text-xs rounded border font-medium ${styles.badge}`}
          >
            {styles.label}
          </span>

          {/* Neutralized checkmark */}
          {threat.neutralized && (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle className="w-3 h-3" />
              Neutralized
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-gray-500 text-xs">{formatTime(threat.detectedAt)}</span>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-xs mb-2 leading-relaxed">{threat.description}</p>

      {/* Source snippet */}
      <div className="bg-gray-900/60 rounded px-2 py-1 mb-2">
        <span className="text-gray-500 text-xs mr-1">Input:</span>
        <span className="text-gray-400 text-xs italic break-all">"{threat.sourceInput}"</span>
      </div>

      {/* Bottom row: confidence + action taken + neutralize button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs">
          {/* Confidence score */}
          <span className="text-gray-400">
            Confidence:{' '}
            <span className="text-white font-medium">
              {(threat.confidence * 100).toFixed(0)}%
            </span>
          </span>

          {/* Action taken */}
          <span className="flex items-center gap-1">
            {threat.action === 'blocked' && <XCircle className="w-3 h-3 text-red-400" />}
            {threat.action === 'quarantined' && <ShieldOff className="w-3 h-3 text-orange-400" />}
            {threat.action === 'sanitized' && <CheckCircle className="w-3 h-3 text-yellow-400" />}
            {threat.action === 'monitoring' && <Eye className="w-3 h-3 text-blue-400" />}
            <span className="text-gray-400 capitalize">{threat.action}</span>
          </span>
        </div>

        {/* Neutralize button — only shown for active (not yet neutralized) threats */}
        {!threat.neutralized && (
          <button
            onClick={() => onNeutralize(threat.id)}
            className="
              px-2 py-1 text-xs rounded bg-green-700/50 text-green-300
              border border-green-700 hover:bg-green-700 hover:text-white
              transition-colors font-medium
            "
          >
            Neutralize
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * ThreatLogViewer
 *
 * Displays a live, scrollable log of threats detected by the Adversarial
 * Immune System. Meant to be used alongside `useThreatScanner`.
 *
 * @example
 * ```tsx
 * const { threatLog, securityState, neutralizeThreat, clearLog } = useThreatScanner();
 *
 * return (
 *   <ThreatLogViewer
 *     threatLog={threatLog}
 *     securityState={securityState}
 *     onNeutralize={neutralizeThreat}
 *     onClearLog={clearLog}
 *   />
 * );
 * ```
 */
const ThreatLogViewer: React.FC<ThreatLogViewerProps> = ({
  threatLog,
  securityState,
  onNeutralize,
  onClearLog,
  maxHeight = '480px',
}) => {
  return (
    <div className="w-full">
      {/* Security status header */}
      <SecurityStatusBar state={securityState} />

      {/* Log header with clear button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-semibold text-sm">Threat Log</h3>
          {threatLog.length > 0 && (
            <span className="bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded-full">
              {threatLog.length}
            </span>
          )}
        </div>

        {threatLog.length > 0 && (
          <button
            onClick={onClearLog}
            className="
              flex items-center gap-1 px-2 py-1 text-xs rounded
              bg-gray-700/50 text-gray-400 border border-gray-600
              hover:bg-gray-700 hover:text-white transition-colors
            "
          >
            <Trash2 className="w-3 h-3" />
            Clear log
          </button>
        )}
      </div>

      {/* Scrollable threat list */}
      <div
        className="overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        <AnimatePresence mode="popLayout">
          {threatLog.length === 0 ? (
            /* Empty state */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10"
            >
              <Shield className="w-10 h-10 mx-auto text-green-500 mb-3" />
              <p className="text-green-400 font-medium text-sm">No threats detected</p>
              <p className="text-gray-500 text-xs mt-1">
                Enter an input above and click "Scan" to test the immune system.
              </p>
            </motion.div>
          ) : (
            /* Threat cards */
            threatLog.map((threat) => (
              <ThreatCard
                key={threat.id}
                threat={threat}
                onNeutralize={onNeutralize}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ThreatLogViewer;
