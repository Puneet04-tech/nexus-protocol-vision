import React, { useState } from 'react';
import { useDiagnosticLogs } from '../../contexts/DiagnosticLogContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';
import { useGraphComplexity } from '../../contexts/GraphComplexityContext';
import { Shield, Sparkles, RefreshCw, Layers, Brain, Loader2 } from 'lucide-react';

/**
 * QuickActions component.
 * Exposes interactive controls to trigger network simulation events, log events,
 * and display toast feedbacks to the user.
 */
const QuickActions: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { addLog } = useDiagnosticLogs();
  const { showToast } = useToast();
  const { complexity, setComplexity } = useGraphComplexity();
  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (actionId: string, label: string, execution: () => void) => {
    if (loadingAction) return;
    setLoadingAction(actionId);
    
    // Simulate slight asynchronous processing for satisfying UI feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      execution();
    } catch (e) {
      showToast(`Error executing ${label}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const actions = [
    {
      id: 'scan-security',
      label: 'Scan Persona Integrity',
      description: 'Audit semantic layers for anomalies',
      icon: Shield,
      onClick: () => handleAction('scan-security', 'Scan Persona Integrity', () => {
        addLog('SHIELD', 'SCAN: Sweeping active semantic pathways. 0 anomalies detected.', 'success', true);
        showToast('Shield Audit complete: No semantic threats found.');
      })
    },
    {
      id: 'tune-morphnet',
      label: 'Tune MorphNet Engine',
      description: 'Recursively prune neural parameters',
      icon: Sparkles,
      onClick: () => handleAction('tune-morphnet', 'Tune MorphNet Engine', () => {
        addLog('CORE', 'MORPHNET: Initiated recursive pruning. Density optimized to 84%.', 'success', true);
        showToast('MorphNet: Parameters pruned. Node efficiency increased.');
      })
    },
    {
      id: 'toggle-complexity',
      label: `Complexity: ${complexity.toUpperCase()}`,
      description: `Switch map view to ${complexity === 'complex' ? 'simple' : 'complex'}`,
      icon: Layers,
      onClick: () => handleAction('toggle-complexity', 'Toggle Complexity', () => {
        const nextComplexity = complexity === 'complex' ? 'simple' : 'complex';
        setComplexity(nextComplexity);
        addLog('CORE', `MAP: Cognitive graph resolution adjusted to ${nextComplexity.toUpperCase()}`, 'success', true);
        showToast(`Graph complexity set to ${nextComplexity}`);
      })
    },
    {
      id: 'mpx-handshake',
      label: 'Secure MPC Handshake',
      description: 'Negotiate mock credentials via ZKP',
      icon: Brain,
      onClick: () => handleAction('mpx-handshake', 'Secure MPC Handshake', () => {
        addLog('MPC', 'TUNNEL: Negotiating blind parameters with edge validator...', 'success', true);
        addLog('ZKP', 'PROOF: blind signature generated. Hash verified.', 'success', false);
        showToast('Cryptographic handshake succeeded.');
      })
    }
  ];

  return (
    <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-5 shadow-lg">
      <h3 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
        Quick System Actions
      </h3>

      <div className="space-y-3">
        {actions.map((act) => {
          const Icon = act.icon;
          const isLoading = loadingAction === act.id;

          return (
            <button
              key={act.id}
              onClick={act.onClick}
              disabled={loadingAction !== null}
              className={`w-full text-left p-3 rounded-lg border border-gray-800 bg-gray-950/50 hover:bg-gray-900 hover:border-gray-700/80 transition-all flex items-center justify-between group focus:outline-none focus-visible:ring-1 ${themeClasses.focusRing} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded bg-gray-900 border border-gray-800 text-gray-400 group-hover:text-white transition-colors`}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Icon className={`w-4 h-4 group-hover:${themeClasses.text}`} />
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {act.label}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    {act.description}
                  </span>
                </div>
              </div>
              
              <div className={`text-[10px] font-mono tracking-widest text-gray-500 group-hover:${themeClasses.text} transition-colors uppercase font-semibold pr-1`}>
                {isLoading ? 'Running' : 'Trigger'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
