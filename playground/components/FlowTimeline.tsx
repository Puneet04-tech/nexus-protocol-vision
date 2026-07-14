import React from 'react';
import { CheckCircle2, Circle, Play, AlertCircle } from 'lucide-react';
import { WorkflowStep } from '../PlaygroundTypes';
import { formatDuration } from '../PlaygroundUtils';

interface FlowTimelineProps {
  steps: WorkflowStep[];
  currentStepIndex: number;
}

export const FlowTimeline: React.FC<FlowTimelineProps> = ({ steps, currentStepIndex }) => {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
        Scenario Timeline Steps
      </h3>
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isRunning = step.status === 'running';
          const isFailed = step.status === 'failed';
          const isPending = step.status === 'pending';
          const isCurrent = idx === currentStepIndex;

          let statusColor = 'text-slate-500 border-slate-700 bg-slate-900/40';
          let borderHighlight = 'border-slate-800';
          
          if (isCompleted) {
            statusColor = 'text-green-400 border-green-600/50 bg-green-950/20';
            borderHighlight = 'border-green-500/30';
          } else if (isRunning) {
            statusColor = 'text-blue-400 border-blue-600 bg-blue-950/40 animate-pulse';
            borderHighlight = 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
          } else if (isFailed) {
            statusColor = 'text-red-400 border-red-600/50 bg-red-950/20';
            borderHighlight = 'border-red-500/30';
          }

          return (
            <div key={step.id} className="flex items-center flex-shrink-0">
              {/* Step Card */}
              <div
                className={`flex flex-col p-3 rounded-lg border-2 w-52 transition-all duration-300 ${
                  isCurrent ? 'bg-slate-800/80 border-slate-500 scale-102' : 'bg-slate-900/30 ' + borderHighlight
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Step {idx + 1}</span>
                  <div className={`p-0.5 rounded-full ${statusColor}`}>
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {isRunning && <Play className="w-3.5 h-3.5" />}
                    {isFailed && <AlertCircle className="w-3.5 h-3.5" />}
                    {isPending && <Circle className="w-3.5 h-3.5 text-slate-600" />}
                  </div>
                </div>

                <span className="text-xs font-semibold text-slate-100 line-clamp-1 mb-1" title={step.label}>
                  {step.label}
                </span>

                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5 border-t border-slate-700/40 pt-1">
                  <span className="truncate max-w-[120px] uppercase">{step.component.replace('-', ' ')}</span>
                  <span>{step.duration > 0 ? formatDuration(step.duration) : '--'}</span>
                </div>
              </div>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div
                  className={`w-6 h-0.5 border-t-2 border-dashed transition-colors duration-300 ${
                    idx < currentStepIndex
                      ? 'border-green-500/50'
                      : idx === currentStepIndex
                      ? 'border-blue-500/50'
                      : 'border-slate-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
