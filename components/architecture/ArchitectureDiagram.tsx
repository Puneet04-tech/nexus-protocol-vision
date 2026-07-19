import React from 'react';
import { 
  Brain, Network, Shield, Activity, Users, Cpu, BarChart3, Layers, Leaf, ShoppingBag,
  ZoomIn, ZoomOut, RefreshCw, Hand, Info
} from 'lucide-react';
import { ArchitectureNode, ArchitectureEdge } from '../../types/architecture';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';

interface ArchitectureDiagramProps {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  scale: number;
  offsetX: number;
  offsetY: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  pulsingNodeIds: string[];
  setSelectedNodeId: (id: string | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
  handleMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseUpOrLeave: () => void;
  handleNodeKeyDown: (e: React.KeyboardEvent, nodeId: string) => void;
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

export const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  nodes,
  edges,
  scale,
  offsetX,
  offsetY,
  selectedNodeId,
  hoveredNodeId,
  pulsingNodeIds,
  setSelectedNodeId,
  setHoveredNodeId,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUpOrLeave,
  handleNodeKeyDown
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  // Helper to determine if a node should be highlighted
  const isNodeHighlighted = (nodeId: string) => {
    const focusId = hoveredNodeId || selectedNodeId;
    if (!focusId) return true;
    if (focusId === nodeId) return true;
    return edges.some(
      (e) =>
        (e.source === focusId && e.target === nodeId) ||
        (e.target === focusId && e.source === nodeId)
    );
  };

  // Helper to determine if an edge should be highlighted
  const isEdgeHighlighted = (edge: ArchitectureEdge) => {
    const focusId = hoveredNodeId || selectedNodeId;
    if (!focusId) return true;
    return edge.source === focusId || edge.target === focusId;
  };

  // Get active hovered node for tooltip rendering
  const hoveredNode = nodes.find((n) => n.id === hoveredNodeId);

  // Math helper to generate curved path string
  const getCurvePath = (source: ArchitectureNode, target: ArchitectureNode) => {
    // Subtle arc path
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; // Curve radius factor
    return `M ${source.x} ${source.y} A ${dr} ${dr} 0 0 1 ${target.x} ${target.y}`;
  };

  return (
    <div className="relative w-full h-[550px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl group/canvas">
      {/* Visual background grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* SVG Canvas */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <defs>
          {/* Subtle glow filter */}
          <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="glow-pulse" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Gradients */}
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="edge-gradient-active" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Viewport Transform Group */}
        <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
          
          {/* 1. Connections/Edges */}
          <g>
            {edges.map((edge) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const isHighlighted = isEdgeHighlighted(edge);
              const isDimmed = !isHighlighted && (hoveredNodeId !== null || selectedNodeId !== null);
              
              const curvePath = getCurvePath(sourceNode, targetNode);
              const pathId = `path-${edge.id}`;

              return (
                <g key={edge.id} className="transition-opacity duration-300">
                  {/* Invisible thick helper path for easier hover selection */}
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                    className="cursor-pointer"
                  />

                  {/* Main connection curve */}
                  <path
                    id={pathId}
                    d={curvePath}
                    fill="none"
                    stroke={isHighlighted ? 'url(#edge-gradient-active)' : 'url(#edge-gradient)'}
                    strokeWidth={isHighlighted ? '2' : '1'}
                    className="transition-all duration-300"
                    style={{
                      opacity: isDimmed ? 0.15 : 1,
                      filter: isHighlighted ? 'drop-shadow(0 0 4px rgba(99,102,241,0.5))' : 'none'
                    }}
                  />

                  {/* Flowing data packets */}
                  {edge.animated && !isDimmed && (
                    <circle
                      r={isHighlighted ? '3.5' : '2'}
                      fill={isHighlighted ? '#22d3ee' : '#818cf8'}
                      style={{
                        opacity: isDimmed ? 0 : 0.8,
                        filter: isHighlighted ? 'drop-shadow(0 0 3px #22d3ee)' : 'none'
                      }}
                    >
                      <animateMotion
                        dur={isHighlighted ? '2.5s' : '4s'}
                        repeatCount="indefinite"
                        rotate="auto"
                      >
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* 2. Layer Group Nodes */}
          <g>
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isHighlighted = isNodeHighlighted(node.id);
              const isDimmed = !isHighlighted && (hoveredNodeId !== null || selectedNodeId !== null);
              const isPulsing = pulsingNodeIds.includes(node.id);
              
              const IconComp = iconMap[node.iconName] || Brain;
              
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer focus:outline-none"
                  tabIndex={0}
                  onKeyDown={(e) => handleNodeKeyDown(e, node.id)}
                  aria-label={`${node.name} node. Status: ${node.status}.`}
                >
                  {/* Outer active/glow halo */}
                  {(isSelected || isHovered || isPulsing) && (
                    <circle
                      r="36"
                      fill="transparent"
                      stroke={isPulsing ? '#ef4444' : isSelected ? 'var(--theme-focus-ring, #6366f1)' : '#4b5563'}
                      strokeWidth="2"
                      strokeDasharray={isSelected ? '4,4' : 'none'}
                      className={`opacity-80 ${isPulsing ? 'animate-ping' : 'animate-[spin_10s_linear_infinite]'}`}
                      style={{ transformOrigin: '0px 0px' }}
                    />
                  )}

                  {/* Pulse scan ring during simulations */}
                  {isPulsing && (
                    <circle
                      r="48"
                      fill="none"
                      stroke="#f87171"
                      strokeWidth="1.5"
                      className="animate-pulse-node"
                      style={{ filter: 'url(#glow-pulse)' }}
                    />
                  )}

                  {/* Main solid node backing */}
                  <circle
                    r="28"
                    className={`transition-all duration-300 ${
                      isSelected 
                        ? 'fill-slate-900 stroke-[3px]' 
                        : isHovered 
                        ? 'fill-slate-900 stroke-[2px]' 
                        : 'fill-slate-950 stroke-[1.5px]'
                    }`}
                    style={{
                      stroke: isSelected
                        ? 'var(--theme-focus-ring, #6366f1)'
                        : isHovered
                        ? '#94a3b8'
                        : '#334155',
                      opacity: isDimmed ? 0.2 : 1,
                      filter: isSelected ? 'url(#glow-filter)' : 'none'
                    }}
                  />

                  {/* Icon centering */}
                  <g 
                    transform="translate(-12, -12)"
                    style={{ opacity: isDimmed ? 0.2 : 1 }}
                  >
                    <IconComp
                      size={24}
                      className={`transition-colors duration-300 ${
                        isSelected
                          ? themeClasses.text
                          : isHovered
                          ? 'text-slate-100'
                          : 'text-slate-400'
                      }`}
                    />
                  </g>

                  {/* Tag label under node */}
                  <text
                    y="42"
                    textAnchor="middle"
                    className={`text-[10px] font-bold tracking-wider uppercase pointer-events-none select-none transition-all duration-300 ${
                      isSelected
                        ? 'fill-white font-extrabold'
                        : isHovered
                        ? 'fill-slate-200'
                        : 'fill-slate-400'
                    }`}
                    style={{ opacity: isDimmed ? 0.2 : 1 }}
                  >
                    {node.name}
                  </text>

                  {/* Active status bubble indicator */}
                  <circle
                    cx="20"
                    cy="-18"
                    r="4"
                    className={`transition-all duration-300 ${
                      node.status === 'active'
                        ? 'fill-green-500'
                        : node.status === 'warning'
                        ? 'fill-yellow-500'
                        : 'fill-red-500'
                    }`}
                    style={{ opacity: isDimmed ? 0.2 : 1 }}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Floating Hover Tooltip overlay */}
      {hoveredNode && (
        <div 
          className="absolute z-30 w-72 bg-slate-900/95 border border-slate-700/80 rounded-xl p-4 shadow-xl backdrop-blur-md transition-all duration-150 pointer-events-none"
          style={{
            // Compute a stable layout placement relative to node SVG position
            left: `${Math.min(
              Math.max(20, (hoveredNode.x * scale) + offsetX - 144), 
              (1000 - 308)
            )}px`,
            top: `${Math.max(20, (hoveredNode.y * scale) + offsetY - 180)}px`
          }}
        >
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 mb-2">
            {React.createElement(iconMap[hoveredNode.iconName] || Brain, {
              className: `w-5 h-5 ${themeClasses.text}`
            })}
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">{hoveredNode.name}</h4>
          </div>
          
          <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
            {hoveredNode.description}
          </p>

          <div className="space-y-1.5 text-[11px]">
            <div>
              <span className="text-slate-500 font-semibold uppercase">Core Responsibility:</span>
              <p className="text-slate-400 mt-0.5">{hoveredNode.responsibility}</p>
            </div>
            <div className="pt-1.5 border-t border-slate-800/80">
              <span className="text-slate-500 font-semibold uppercase">Related Modules:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {hoveredNode.relatedModules.map((relId) => {
                  const nameMap: Record<string, string> = {
                    'sovereign-persona': 'Sovereign Persona',
                    'cognitive-graph': 'Cognitive Graph',
                    'privacy-negotiator': 'Privacy Negotiator',
                    'federated-learning': 'Federated Learning',
                    'morphnet-engine': 'MorphNet Engine',
                    'adversarial-immune': 'Immune System',
                    'carbon-aware': 'Carbon Aware',
                    'latent-mapping': 'Latent Space',
                    'monitoring': 'Monitoring',
                    'marketplace': 'Marketplace'
                  };
                  return (
                    <span 
                      key={relId} 
                      className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide border border-slate-700/40"
                    >
                      {nameMap[relId] || relId}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control overlay menu */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-slate-900/80 border border-slate-850 p-1.5 rounded-xl shadow-lg backdrop-blur-sm z-20">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleZoomReset}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset View"
          aria-label="Reset View"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Interactive mouse action guide */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-1.5 bg-slate-950/70 border border-slate-850/60 px-3 py-1 rounded-full text-[10px] text-slate-400 backdrop-blur-md select-none font-mono">
        <Hand size={11} className="text-slate-500" />
        <span>DRAG TO PAN</span>
        <span className="text-slate-700">•</span>
        <span>SCROLL TO ZOOM</span>
        <span className="text-slate-700">•</span>
        <Info size={11} className="text-slate-500" />
        <span>CLICK NODE TO INSPECT</span>
      </div>
    </div>
  );
};
export default ArchitectureDiagram;
