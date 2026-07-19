import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Brain, Network, Shield, Activity, Users, Cpu, BarChart3, Layers, Leaf, ShoppingBag,
  ExternalLink, Play, CheckCircle2, Loader2, Sparkles, Terminal
} from 'lucide-react';
import { ArchitectureNode } from '../../types/architecture';
import { SIMULATION_COMMANDS } from '../../utils/architectureData';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';

interface ArchitectureSidebarProps {
  selectedNode: ArchitectureNode | null;
  activeSimulationId: string | null;
  triggerSimulation: (simId: string) => void;
  setSelectedNodeId: (id: string | null) => void;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Brain,
  Network,
  Shield,
  Activity,
  Users,
  Cpu,
  BarChart3,
  Layers,
  Leaf,
  ShoppingBag
};

export const ArchitectureSidebar: React.FC<ArchitectureSidebarProps> = ({
  selectedNode,
  activeSimulationId,
  triggerSimulation,
  setSelectedNodeId
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  if (!selectedNode) {
    return (
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
        <Terminal className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-sm">System Inspection</h3>
        <p className="text-xs text-slate-500 max-w-[240px]">
          Select any system node in the diagram to inspect its parameters and run sandboxed protocols.
        </p>
      </div>
    );
  }

  const IconComp = iconMap[selectedNode.iconName] || Brain;

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 h-full flex flex-col justify-between shadow-xl backdrop-blur-md space-y-6">
      
      {/* 1. Header Detail */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className={`p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 ${themeClasses.text}`}>
              <IconComp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">{selectedNode.name}</h3>
                <span className={`w-2 h-2 rounded-full ${selectedNode.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              </div>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Nexus Core Layer</span>
            </div>
          </div>
        </div>

        {/* Description & Responsibilities */}
        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/20 border border-slate-900 p-3 rounded-lg">
            {selectedNode.description}
          </p>
          <div className="text-xs space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Core Responsibility:</span>
            <p className="text-slate-400 font-medium leading-relaxed">{selectedNode.responsibility}</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">System Telemetry:</span>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(selectedNode.metrics).map(([key, val]) => (
              <div key={key} className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-lg">
                <div className="text-[9px] text-slate-500 uppercase font-mono truncate">{key}</div>
                <div className="text-xs text-slate-200 font-bold font-mono mt-0.5">{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Controls & Actions */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        
        {/* Navigation Action */}
        {selectedNode.route && (
          <Link
            to={selectedNode.route}
            className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold transition-all text-white ${themeClasses.bg} ${themeClasses.hoverBg} shadow-lg shadow-indigo-650/15 hover:shadow-indigo-650/25`}
          >
            <span>Open {selectedNode.name} Workspace</span>
            <ExternalLink size={14} />
          </Link>
        )}

        {/* Sandbox Simulation Triggers */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sandbox Simulator</span>
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 select-none">
            {SIMULATION_COMMANDS.map((cmd) => {
              const isTargeted = cmd.targetModules.includes(selectedNode.id);
              const isActiveSim = activeSimulationId === cmd.id;
              const isAnySimActive = activeSimulationId !== null;

              return (
                <button
                  key={cmd.id}
                  disabled={isAnySimActive || !isTargeted}
                  onClick={() => triggerSimulation(cmd.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                    isActiveSim
                      ? 'bg-blue-950/30 border-blue-500/80 text-blue-300'
                      : isTargeted
                      ? isAnySimActive
                        ? 'bg-slate-950/20 border-slate-900 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-750 text-slate-300 hover:text-white'
                      : 'bg-slate-950/10 border-slate-900/50 text-slate-600 opacity-40 cursor-not-allowed'
                  }`}
                  title={!isTargeted ? `This command is not related to ${selectedNode.name}` : cmd.description}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold tracking-wide">{cmd.label}</div>
                    <div className="text-[9px] text-slate-500 truncate max-w-[200px]">
                      {isTargeted ? cmd.description : 'Incompatible module'}
                    </div>
                  </div>

                  {isActiveSim ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                  ) : isTargeted ? (
                    <Play className="w-3 h-3 text-slate-500 group-hover:text-white flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-800 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ArchitectureSidebar;
