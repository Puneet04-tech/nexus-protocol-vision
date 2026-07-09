import React, { useState, useEffect, useRef } from 'react';
import { Network, Search, Eye, Maximize, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import { SovereignPersona } from '../../core/sovereign-persona/SovereignPersona';

interface KnowledgeGraphViewProps {
  persona: SovereignPersona | null;
}

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  confidence: number;
  domain: string;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({ persona }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Transform settings
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Simulation settings
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Sync graph state on mount and update
  useEffect(() => {
    if (!persona) {
      // Default placeholder nodes if persona is idle
      const defaultNodes: GraphNode[] = [
        { id: 'math', label: 'Mathematics', x: 150, y: 150, vx: 0, vy: 0, confidence: 0.8, domain: 'foundational' },
        { id: 'prog', label: 'Programming', x: 250, y: 150, vx: 0, vy: 0, confidence: 0.9, domain: 'technical' },
        { id: 'ethics', label: 'Ethics', x: 200, y: 250, vx: 0, vy: 0, confidence: 0.75, domain: 'philosophical' }
      ];
      const defaultEdges: GraphEdge[] = [
        { source: 'math', target: 'prog', strength: 0.6 },
        { source: 'prog', target: 'ethics', strength: 0.4 }
      ];
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      return;
    }

    const syncGraph = () => {
      try {
        const rawGraph = persona.getCognitiveGraph().exportGraph();
        
        // Map nodes keeping their coordinates if they exist
        setNodes(prevNodes => {
          return rawGraph.nodes.map(n => {
            const existing = prevNodes.find(pn => pn.id === n.id);
            return {
              id: n.id,
              label: n.id.replace('_', ' '),
              x: existing ? existing.x : 100 + Math.random() * 300,
              y: existing ? existing.y : 100 + Math.random() * 200,
              vx: existing ? existing.vx : 0,
              vy: existing ? existing.vy : 0,
              confidence: n.confidence,
              domain: n.domain
            };
          });
        });

        setEdges(rawGraph.edges.map(e => ({
          source: e.source,
          target: e.target,
          strength: e.strength
        })));
      } catch (err) {
        // Suppress sync exceptions
      }
    };

    syncGraph();
    const interval = setInterval(syncGraph, 1200);
    return () => clearInterval(interval);
  }, [persona]);

  // Force-directed layout physics updates
  useEffect(() => {
    const simulate = () => {
      setNodes(prevNodes => {
        if (prevNodes.length <= 1) return prevNodes;

        return prevNodes.map(node => {
          let { x, y, vx, vy } = node;

          // Apply forces
          prevNodes.forEach(other => {
            if (other.id !== node.id) {
              const dx = other.x - x;
              const dy = other.y - y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 80 && distance > 0) {
                // Repulsion force to prevent node clustering
                const force = 30 / (distance * distance);
                vx -= (dx / distance) * force;
                vy -= (dy / distance) * force;
              } else if (distance > 130) {
                // Attraction force to keep network group cohesive
                const force = (distance - 130) * 0.0005;
                vx += (dx / distance) * force;
                vy += (dy / distance) * force;
              }
            }
          });

          // Apply velocity with damping friction
          x += vx * 0.1;
          y += vy * 0.1;
          vx *= 0.92;
          vy *= 0.92;

          // Keep within bounds
          x = Math.max(20, Math.min(480, x));
          y = Math.max(20, Math.min(380, y));

          return { ...node, x, y, vx, vy };
        });
      });
    };

    const interval = setInterval(simulate, 30);
    return () => clearInterval(interval);
  }, [nodes]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply zoom and panning transformations
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // 1. Draw Edges
    edges.forEach(edge => {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);

      if (src && tgt) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = edge.strength * 2;
        ctx.stroke();
      }
    });

    // 2. Draw Nodes
    nodes.forEach(node => {
      const radius = 6 + node.confidence * 8;
      const isSelected = selectedNode?.id === node.id;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

      // Color nodes based on domain
      let color = '59, 130, 246'; // blue (technical)
      if (node.domain === 'philosophical' || node.domain === 'ethical') color = '239, 68, 68'; // red
      else if (node.domain === 'environmental' || node.domain === 'foundational') color = '34, 197, 94'; // green

      ctx.fillStyle = `rgba(${color}, ${0.4 + node.confidence * 0.5})`;
      ctx.fill();

      // Selection rings
      ctx.strokeStyle = isSelected ? '#fbbf24' : `rgba(${color}, 0.6)`;
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      // Text labels
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y - radius - 5);

      // Confidence badge
      ctx.fillStyle = '#94a3b8';
      ctx.font = '6px monospace';
      ctx.fillText(`${(node.confidence * 100).toFixed(0)}%`, node.x, node.y + radius + 7);
    });

    ctx.restore();
  }, [nodes, edges, zoom, panX, panY, selectedNode]);

  // Click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Convert click location back to transformed coordinates
    const clickX = (e.clientX - rect.left - panX) / zoom;
    const clickY = (e.clientY - rect.top - panY) / zoom;

    const clicked = nodes.find(node => {
      const dx = node.x - clickX;
      const dy = node.y - clickY;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    setSelectedNode(clicked || null);
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.current.x);
    setPanY(e.clientY - dragStart.current.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(3, Math.max(0.5, prev * factor)));
  };

  const handleReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSelectedNode(null);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-400" />
          Cognitive Graph Live View
        </h3>

        {/* View adjustment tools */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-1 rounded-lg">
          <button
            onClick={() => handleZoom(1.1)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.9)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Reset Pan/Zoom"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas viewport */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-lg p-2 overflow-hidden select-none relative">
          <canvas
            ref={canvasRef}
            width={460}
            height={320}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-[320px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          />
        </div>

        {/* Node detail inspector panel */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-950/20 to-transparent border border-indigo-800/40 p-4 rounded-xl flex flex-col justify-between h-full">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-indigo-800/20 pb-2">
              <Eye className="w-4 h-4" />
              Node Inspector
            </h4>

            {selectedNode ? (
              <div className="space-y-3 py-2 text-xs">
                <div className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                  {selectedNode.label}
                </div>
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Domain Class:</span>
                  <span className="text-slate-200 capitalize font-bold">{selectedNode.domain}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 font-mono">
                    <span>Confidence level:</span>
                    <span className="text-green-400 font-extrabold">{(selectedNode.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: `${selectedNode.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500 py-12">
                Click any node on the graph canvas to inspect its parameters.
              </p>
            )}
            <div className="text-[9px] text-slate-500 font-mono border-t border-slate-800/40 pt-2 flex items-center justify-between">
              <span>Nodes: {nodes.length}</span>
              <span>Edges: {edges.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
