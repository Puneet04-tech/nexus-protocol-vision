import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Heart, AlertOctagon, Terminal } from 'lucide-react';
import { AdversarialImmuneSystem } from '../../core/adversarial-immune/AdversarialImmuneSystem';

interface ThreatMonitorProps {
  immuneSystem: AdversarialImmuneSystem | null;
}

export const ThreatMonitor: React.FC<ThreatMonitorProps> = ({ immuneSystem }) => {
  const [secState, setSecState] = useState({
    immunityLevel: 0.8,
    activeThreats: 0,
    neutralizedThreats: 0,
    systemHealth: 'healthy' as 'healthy' | 'degraded' | 'compromised' | 'recovering'
  });

  const [stats, setStats] = useState({
    totalThreatsDetected: 0,
    uniqueThreatTypes: 0,
    averageDetectionTime: 0,
    immunityStrength: 0.8,
    quarantineSize: 0
  });

  useEffect(() => {
    if (!immuneSystem) return;

    const syncMetrics = () => {
      try {
        const stateVal = immuneSystem.getSecurityState();
        const statsVal = immuneSystem.getImmunityStatistics();

        setSecState({
          immunityLevel: stateVal.immunityLevel,
          activeThreats: stateVal.activeThreats,
          neutralizedThreats: stateVal.neutralizedThreats,
          systemHealth: stateVal.systemHealth as 'healthy' | 'degraded' | 'compromised' | 'recovering'
        });

        setStats({
          totalThreatsDetected: statsVal.totalThreatsDetected,
          uniqueThreatTypes: statsVal.uniqueThreatTypes,
          averageDetectionTime: statsVal.averageDetectionTime,
          immunityStrength: statsVal.immunityStrength,
          quarantineSize: statsVal.quarantineSize
        });
      } catch (e) {
        // Suppress sync exceptions
      }
    };

    syncMetrics();
    const interval = setInterval(syncMetrics, 1000);
    return () => clearInterval(interval);
  }, [immuneSystem]);

  const healthColors = {
    healthy: 'text-green-400 bg-green-950/20 border-green-800/40',
    degraded: 'text-yellow-400 bg-yellow-950/20 border-yellow-800/40',
    compromised: 'text-red-400 bg-red-950/20 border-red-800/40 animate-pulse',
    recovering: 'text-blue-400 bg-blue-950/20 border-blue-800/40'
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
        <Shield className="w-4 h-4 text-red-400" />
        Adversarial Immune Shield
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Shield Status Gauge */}
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Immunity Score</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500/20 animate-pulse" />
          </div>
          <span className="text-2xl font-extrabold text-slate-100 font-mono py-1">
            {(stats.immunityStrength * 100).toFixed(0)}%
          </span>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.immunityStrength * 100}%` }}
            />
          </div>
        </div>

        {/* System Health */}
        <div className={`border p-4 rounded-xl flex flex-col justify-between ${healthColors[secState.systemHealth]}`}>
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Perimeter Health</span>
            {secState.systemHealth === 'healthy' ? (
              <ShieldCheck className="w-4 h-4 text-green-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            )}
          </div>
          <span className="text-sm font-extrabold uppercase py-1 tracking-wider">
            {secState.systemHealth}
          </span>
          <p className="text-[9px] text-slate-500 font-medium">
            Active Threat Scan Status: Online.
          </p>
        </div>
      </div>

      {/* Security Threat stats counters */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Active</span>
          <span className="text-slate-100 font-bold font-mono text-base">{secState.activeThreats}</span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Neutralized</span>
          <span className="text-green-400 font-bold font-mono text-base">{secState.neutralizedThreats}</span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Quarantine</span>
          <span className="text-yellow-400 font-bold font-mono text-base">{stats.quarantineSize}</span>
        </div>
      </div>

      {/* Real-time incident response log */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-start gap-2.5">
        <AlertOctagon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="text-[10px] leading-relaxed">
          <span className="text-red-400 font-bold uppercase tracking-wide mr-1.5 font-mono">Shield Log:</span>
          {secState.activeThreats > 0 ? (
            <span className="text-red-300 font-semibold animate-pulse">
              Jailbreak vector detected in memory buffers. Blocking execution and quarantining thread parameters.
            </span>
          ) : secState.neutralizedThreats > 0 ? (
            <span className="text-slate-300">
              Perimeter threat signatures neutralized. Zero active intrusions detected in sandbox memory spaces.
            </span>
          ) : (
            <span className="text-slate-500">
              No anomalies found. NLP monitoring analyzing input semantic vectors.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
