import React from 'react';
import { User, Brain, Network, Shield, Users, Activity } from 'lucide-react';
import { generateColorsForModule } from '../PlaygroundUtils';

interface FlowDiagramProps {
  activeModule: string | null;
  activeModules: string[];
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({ activeModule, activeModules }) => {
  const nodes = [
    { id: 'user', name: 'User', icon: User, color: 'system' },
    { id: 'sovereign-persona', name: 'Sovereign Persona', icon: Brain, color: 'sovereign-persona' },
    { id: 'cognitive-graph', name: 'Cognitive Graph', icon: Network, color: 'cognitive-graph' },
    { id: 'privacy-negotiator', name: 'Privacy Negotiator', icon: Shield, color: 'privacy-negotiator' },
    { id: 'federated-learning', name: 'Federated Learning', icon: Users, color: 'federated-learning' },
    { id: 'monitoring', name: 'Monitoring', icon: Activity, color: 'monitoring' }
  ];

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 shadow-xl backdrop-blur-md">
      <h3 className="text-sm font-semibold text-slate-300 mb-5 uppercase tracking-wider">
        Protocol Flow Diagram
      </h3>

      {/* Vertical flow for mobile, Horizontal for larger screens */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2">
        {nodes.map((node, idx) => {
          const isActive = activeModule === node.id;
          const isParticipating = activeModules.includes(node.id) || node.id === 'user';
          
          const clr = generateColorsForModule(node.color);
          const IconComponent = node.icon;

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div
                className={`flex flex-col items-center p-4 rounded-xl border-2 w-36 text-center transition-all duration-500 ${
                  isActive
                    ? clr.activeGlow + ' bg-slate-800 scale-105'
                    : isParticipating
                    ? `${clr.bg} ${clr.border} border-opacity-80`
                    : 'bg-slate-900/10 border-slate-800 opacity-40'
                }`}
              >
                <div className={`p-2.5 rounded-lg mb-2 ${clr.text} bg-slate-950/40`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-slate-100">{node.name}</span>
                {isActive && (
                  <span className="text-[8px] uppercase tracking-wider text-green-400 font-bold mt-1 animate-pulse">
                    Active
                  </span>
                )}
              </div>

              {/* Connected arrow showing data flow direction */}
              {idx < nodes.length - 1 && (
                <div className="flex flex-col lg:flex-row items-center justify-center font-mono select-none px-1 py-2 lg:py-0">
                  {/* Arrow indicator using <<<<==== as required */}
                  <span
                    className={`text-sm tracking-tighter hidden lg:inline transition-colors duration-500 ${
                      isActive || activeModule === nodes[idx + 1].id
                        ? 'text-blue-400 font-bold'
                        : 'text-slate-700'
                    }`}
                  >
                    {"<<<<===="}
                  </span>
                  
                  {/* Vertical connector for mobile */}
                  <span
                    className={`text-sm font-bold rotate-90 lg:hidden transition-colors duration-500 ${
                      isActive || activeModule === nodes[idx + 1].id
                        ? 'text-blue-400 font-bold'
                        : 'text-slate-700'
                    }`}
                  >
                    ▲▲▲▲====
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
