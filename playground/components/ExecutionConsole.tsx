import React from 'react';
import { Play, Pause, RotateCcw, ArrowRight, ArrowLeft, Zap, Terminal } from 'lucide-react';

interface ExecutionConsoleProps {
  status: 'playing' | 'paused' | 'stopped';
  speed: number;
  mode: 'auto' | 'manual';
  currentStepIndex: number;
  totalSteps: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onModeChange: (mode: 'auto' | 'manual') => void;
  onRunDiagnostics: () => void;
  diagnosticsRunning: boolean;
  diagnosticsPassed: boolean | null;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  status,
  speed,
  mode,
  currentStepIndex,
  totalSteps,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  onSpeedChange,
  onModeChange,
  onRunDiagnostics,
  diagnosticsRunning,
  diagnosticsPassed
}) => {
  const isPlaying = status === 'playing';
  const isStopped = status === 'stopped';
  const hasSteps = totalSteps > 0;
  const isAtStart = currentStepIndex < 0;
  const isAtEnd = currentStepIndex >= totalSteps - 1;

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Simulation Playback controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onStepBackward}
          disabled={isAtStart || isPlaying || !hasSteps}
          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
          title="Step Backward"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {isPlaying ? (
          <button
            onClick={onPause}
            className="p-3.5 rounded-lg bg-yellow-600 hover:bg-yellow-700 border border-yellow-500/50 text-white shadow-lg transition-all"
            title="Pause Simulation"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onPlay}
            disabled={!hasSteps}
            className="p-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-35 disabled:cursor-not-allowed border border-blue-500/50 text-white shadow-lg transition-all"
            title="Play Simulation"
          >
            <Play className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onStepForward}
          disabled={isAtEnd || isPlaying || !hasSteps}
          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
          title="Step Forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onReset}
          disabled={isStopped || !hasSteps}
          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
          title="Reset Simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Speed & Mode controls */}
      <div className="flex items-center gap-3">
        {/* Speed multiplier selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Speed</span>
          <select
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="1">1.0x Speed</option>
            <option value="2">2.0x Speed</option>
            <option value="5">5.0x Speed</option>
          </select>
        </div>

        {/* Mode selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Execution Mode</span>
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => onModeChange('auto')}
              className={`px-3 py-1 rounded text-xs transition-all ${
                mode === 'auto'
                  ? 'bg-blue-600/30 text-blue-400 font-bold'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => onModeChange('manual')}
              className={`px-3 py-1 rounded text-xs transition-all ${
                mode === 'manual'
                  ? 'bg-blue-600/30 text-blue-400 font-bold'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics tests triggers */}
      <div className="flex items-center gap-2 border-l border-slate-700/60 pl-4">
        <button
          onClick={onRunDiagnostics}
          disabled={diagnosticsRunning}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
            diagnosticsRunning
              ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600/20 hover:bg-indigo-600/35 border-indigo-500/30 text-indigo-400'
          }`}
        >
          {diagnosticsRunning ? (
            <>
              <Terminal className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Diagnostics Tests
            </>
          )}
        </button>

        {diagnosticsPassed !== null && !diagnosticsRunning && (
          <span
            className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider font-extrabold border ${
              diagnosticsPassed
                ? 'bg-green-950/20 border-green-800 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                : 'bg-red-950/20 border-red-800 text-red-400'
            }`}
          >
            {diagnosticsPassed ? 'Diagnostics PASS' : 'Diagnostics FAIL'}
          </span>
        )}
      </div>
    </div>
  );
};
