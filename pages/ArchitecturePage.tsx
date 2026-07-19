import React from 'react';
import { Network, Activity, Cpu, ShieldCheck } from 'lucide-react';
import { useArchitecture } from '../hooks/useArchitecture';
import { ArchitectureDiagram } from '../components/architecture/ArchitectureDiagram';
import { ArchitectureSidebar } from '../components/architecture/ArchitectureSidebar';
import { ArchitectureTelemetry } from '../components/architecture/ArchitectureTelemetry';

export const ArchitecturePage: React.FC = () => {
  const {
    nodes,
    edges,
    scale,
    offsetX,
    offsetY,
    selectedNodeId,
    hoveredNodeId,
    activeSimulationId,
    pulsingNodeIds,
    logs,
    selectedNode,
    setSelectedNodeId,
    setHoveredNodeId,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleNodeKeyDown,
    triggerSimulation,
    addLog
  } = useArchitecture();

  const handleClearTelemetry = () => {
    addLog('System', 'Log buffer cleared by user request.', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header HUD */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <Network className="w-8 h-8 text-blue-500 animate-pulse" />
              <h1 className="text-3xl font-bold text-white uppercase tracking-wider">
                System Topology Explorer
              </h1>
            </div>
            <p className="text-sm text-slate-400 max-w-xl">
              Explore the 9-layer decentralized AI operating infrastructure of the Nexus Protocol. 
              Click nodes to trace connections and execute sandbox simulations.
            </p>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-950/40 border border-slate-850 p-3 rounded-xl backdrop-blur-sm">
            <div className="flex items-center space-x-2 border-r border-slate-800 pr-4">
              <Cpu className="w-4 h-4 text-green-400" />
              <div>
                <div className="text-[9px] text-slate-500 font-mono uppercase">Topology Status</div>
                <div className="text-xs text-green-400 font-mono font-bold">10/10 NOMINAL</div>
              </div>
            </div>

            <div className="flex items-center space-x-2 border-r border-slate-800 pr-4">
              <Activity className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-[9px] text-slate-500 font-mono uppercase">Network Connections</div>
                <div className="text-xs text-blue-400 font-mono font-bold">14 ACTIVE</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-[9px] text-slate-500 font-mono uppercase">Compliance Score</div>
                <div className="text-xs text-purple-400 font-mono font-bold">100% SECURE</div>
              </div>
            </div>
          </div>
        </div>

        {/* Visualizer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Visualizer Area & Telemetry logs */}
          <div className="lg:col-span-3 space-y-6 flex flex-col justify-between">
            {/* Visualizer Canvas */}
            <ArchitectureDiagram
              nodes={nodes}
              edges={edges}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              pulsingNodeIds={pulsingNodeIds}
              setSelectedNodeId={setSelectedNodeId}
              setHoveredNodeId={setHoveredNodeId}
              handleZoomIn={handleZoomIn}
              handleZoomOut={handleZoomOut}
              handleZoomReset={handleZoomReset}
              handleWheel={handleWheel}
              handleMouseDown={handleMouseDown}
              handleMouseMove={handleMouseMove}
              handleMouseUpOrLeave={handleMouseUpOrLeave}
              handleNodeKeyDown={handleNodeKeyDown}
            />

            {/* Diagnostic Log Telemetry Console */}
            <ArchitectureTelemetry
              logs={logs}
              onClear={handleClearTelemetry}
            />
          </div>

          {/* Node Details Inspection Sidebar */}
          <div className="lg:col-span-1 h-full min-h-[480px]">
            <ArchitectureSidebar
              selectedNode={selectedNode}
              activeSimulationId={activeSimulationId}
              triggerSimulation={triggerSimulation}
              setSelectedNodeId={setSelectedNodeId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitecturePage;
