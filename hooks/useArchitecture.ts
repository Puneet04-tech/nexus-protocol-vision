import { useState, useCallback, useEffect, useRef } from 'react';
import { ArchitectureNode, ArchitectureEdge, SimulationLog, NodeStatus } from '../types/architecture';
import { INITIAL_NODES, INITIAL_EDGES, SIMULATION_COMMANDS } from '../utils/architectureData';

/**
 * Custom React hook for managing the state, viewport translation (zoom/pan),
 * node selections, hovers, and sandboxed simulation logs for the interactive
 * architecture visualizer.
 *
 * @purpose
 * Encapsulates complex visualization state (positions, dimensions, drag-pan, zoom scale, selection,
 * simulation status) into a clean, reusable state hook.
 *
 * @responsibilities
 * - Manages nodes and static connections (edges).
 * - Stores scale and scroll/drag offset coordinates.
 * - Resolves node details by tracking selected and hovered states.
 * - Dispatches simulated multi-stage actions (telemetry logs and pulsing nodes) during sandbox scans.
 * - Restricts viewport zoom from 0.4x to 2.5x bounds.
 *
 * @returns {object} The complete architecture visualization state and handlers.
 */
export const useArchitecture = () => {
  const [nodes, setNodes] = useState<ArchitectureNode[]>(INITIAL_NODES);
  const [edges] = useState<ArchitectureEdge[]>(INITIAL_EDGES);
  
  // Viewport transformation states (Zoom & Pan)
  const [scale, setScale] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Focus & Hover states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('sovereign-persona');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Simulation states
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [pulsingNodeIds, setPulsingNodeIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<SimulationLog[]>([]);

  // Add a simulation log helper
  const addLog = useCallback((module: string, message: string, level: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    const newLog: SimulationLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      module,
      message,
      level
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 50)); // limit to 50 logs
  }, []);

  // Initialize with system logs
  useEffect(() => {
    addLog('System', 'Nexus Protocol visual node topology initialized.', 'success');
    addLog('System', 'All 10 local-first layers active and operating within nominal parameters.', 'info');
  }, [addLog]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.15, 2.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.15, 0.4));
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 0.05;
    setScale((prev) => {
      const newScale = e.deltaY < 0 ? prev + zoomFactor : prev - zoomFactor;
      return Math.max(0.4, Math.min(2.5, newScale));
    });
  }, []);

  // Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Only drag with left click
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  }, [offsetX, offsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.current.x);
    setOffsetY(e.clientY - dragStart.current.y);
  }, [isDragging]);

  const handleMouseUpOrLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard navigation helpers
  const handleNodeKeyDown = useCallback((e: React.KeyboardEvent, nodeId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedNodeId(nodeId);
      addLog('System', `Keyboard selection focused on: ${nodeId}`, 'info');
    }
  }, [addLog]);

  // Triggering simulation scripts
  const triggerSimulation = useCallback((simId: string) => {
    const cmd = SIMULATION_COMMANDS.find((c) => c.id === simId);
    if (!cmd || activeSimulationId) return;

    setActiveSimulationId(simId);
    setPulsingNodeIds(cmd.targetModules);
    addLog('System', `Initiating command script: "${cmd.label}"`, 'info');

    // Simulate multi-stage telemetry reports
    if (simId === 'diagnostics') {
      setTimeout(() => addLog('Sovereign Persona', 'Scanning local identity config profiles...', 'info'), 400);
      setTimeout(() => addLog('Monitoring', 'System-wide telemetry baseline registered (CPU: 14%, Mem: 1.2GB).', 'info'), 900);
      setTimeout(() => {
        // Randomly update status of MorphNet or Carbon Aware for visual changes
        setNodes(prev => prev.map(n => n.id === 'morphnet-engine' ? { ...n, status: 'active' } : n));
        addLog('System', cmd.successMessage, 'success');
        setPulsingNodeIds([]);
        setActiveSimulationId(null);
      }, 1600);
    } 
    else if (simId === 'security-scan') {
      setTimeout(() => addLog('Immune System', 'Scanning memory addresses and vector tables...', 'warning'), 400);
      setTimeout(() => addLog('Sovereign Persona', 'Locking private context keys during active scan.', 'info'), 800);
      setTimeout(() => {
        addLog('System', cmd.successMessage, 'success');
        setPulsingNodeIds([]);
        setActiveSimulationId(null);
      }, 1500);
    } 
    else if (simId === 'carbon-opt') {
      setTimeout(() => addLog('Carbon Aware', 'Checking grid carbon intensity (low intensity detected).', 'info'), 300);
      setTimeout(() => addLog('MorphNet Engine', 'De-activating 3 unused layer paths to match carbon budget.', 'info'), 800);
      setTimeout(() => {
        addLog('System', cmd.successMessage, 'success');
        setPulsingNodeIds([]);
        setActiveSimulationId(null);
      }, 1400);
    } 
    else if (simId === 'federated-sync') {
      setTimeout(() => addLog('Privacy Negotiator', 'Verifying MPC parameters and differential privacy bounds.', 'info'), 400);
      setTimeout(() => addLog('Federated Learning', 'Broadcasting model weight gradients to local-mesh network.', 'info'), 800);
      setTimeout(() => addLog('Cognitive Graph', 'Integrating assimilated weights into knowledge maps.', 'info'), 1200);
      setTimeout(() => {
        addLog('System', cmd.successMessage, 'success');
        setPulsingNodeIds([]);
        setActiveSimulationId(null);
      }, 1800);
    }
  }, [activeSimulationId, addLog]);

  // Find currently selected node details
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return {
    nodes,
    edges,
    scale,
    offsetX,
    offsetY,
    isDragging,
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
  };
};
