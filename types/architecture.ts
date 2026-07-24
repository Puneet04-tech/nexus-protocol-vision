export type NodeStatus = 'active' | 'idle' | 'warning' | 'error';

export interface ArchitectureNode {
  id: string;
  name: string;
  iconName: string; // Used to dynamically map Lucide react icon components
  x: number;
  y: number;
  description: string;
  responsibility: string;
  relatedModules: string[];
  route?: string;
  status: NodeStatus;
  metrics: Record<string, string | number>;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  flowDirection?: 'forward' | 'reverse' | 'bidirectional';
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  module: string;
  message: string;
  level: 'info' | 'warning' | 'success' | 'error';
}
