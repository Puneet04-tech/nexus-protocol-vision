import React from 'react';
import { Shield, Flame, Activity, Cpu, Award } from 'lucide-react';
import { PlaygroundParams } from '../PlaygroundTypes';

interface ParameterEditorProps {
  params: PlaygroundParams;
  onParamChange: <K extends keyof PlaygroundParams>(key: K, value: PlaygroundParams[K]) => void;
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({ params, onParamChange }) => {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">
        Interactive Parameter Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Security and Privacy */}
        <div className="space-y-4">
          {/* Privacy level */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Privacy Protection Level
              </span>
              <span className="text-[10px] uppercase font-bold text-blue-400 px-1.5 py-0.5 rounded bg-blue-950/40 font-mono">
                {params.privacyLevel}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['public', 'selective', 'private', 'confidential'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => onParamChange('privacyLevel', lvl)}
                  className={`py-1 rounded text-[10px] font-bold uppercase transition-all border ${
                    params.privacyLevel === lvl
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Threat level */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                Threat System Intensity
              </span>
              <span className="text-[10px] uppercase font-bold text-red-400 px-1.5 py-0.5 rounded bg-red-950/40 font-mono">
                {params.threatIntensity}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['low', 'medium', 'high', 'critical'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => onParamChange('threatIntensity', lvl)}
                  className={`py-1 rounded text-[10px] font-bold uppercase transition-all border ${
                    params.threatIntensity === lvl
                      ? 'bg-red-600 border-red-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Dynamic Learning Rate</span>
              <span className="text-slate-200 font-bold font-mono">{params.learningRate.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.05"
              value={params.learningRate}
              onChange={(e) => onParamChange('learningRate', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Right Column: Computing and Limits */}
        <div className="space-y-4">
          {/* Carbon budget */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-green-400" />
                Carbon Budget Target
              </span>
              <span className="text-slate-200 font-bold font-mono">{params.carbonBudget} kg CO2</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={params.carbonBudget}
              onChange={(e) => onParamChange('carbonBudget', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Federated participants */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Federated Client Nodes</span>
              <span className="text-slate-200 font-bold font-mono">{params.federatedParticipants} Nodes</span>
            </div>
            <input
              type="range"
              min="3"
              max="100"
              step="1"
              value={params.federatedParticipants}
              onChange={(e) => onParamChange('federatedParticipants', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>

          {/* Confidence threshold */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                Mastery Confidence Threshold
              </span>
              <span className="text-slate-200 font-bold font-mono">{(params.confidenceThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={params.confidenceThreshold}
              onChange={(e) => onParamChange('confidenceThreshold', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-700/40 pt-4 text-xs text-slate-400">
        <div className="flex justify-between items-center bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-800">
          <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-slate-500" /> Latency Ceiling</span>
          <span className="font-bold text-slate-200 font-mono">{params.latencyLimit}ms</span>
        </div>
        <div className="flex justify-between items-center bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-800">
          <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-slate-500" /> Memory Sandbox</span>
          <span className="font-bold text-slate-200 font-mono">{params.resourceLimit} MB</span>
        </div>
      </div>
    </div>
  );
};
