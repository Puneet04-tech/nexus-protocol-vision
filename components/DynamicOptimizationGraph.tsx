import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRealTimeMetrics } from '../contexts/RealTimeContext';
import { useGraphComplexity } from '../contexts/GraphComplexityContext';

interface OptimizationPhase {
  name: string;
  color: string;
  icon: string;
}

const DynamicOptimizationGraph: React.FC = () => {
  const { metrics } = useRealTimeMetrics();
  const { complexity: complexityState } = useGraphComplexity();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // State for optimization phases
  const [optimizationPhase, setOptimizationPhase] = useState(0);
  const [parameterCount, setParameterCount] = useState(1.2);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  // Optimization phases
  const phases: OptimizationPhase[] = [
    { name: "Structured Pruning", color: "#FF6B6B", icon: "✂️" },
    { name: "Quantization", color: "#4ECDC4", icon: "🔢" },
    { name: "Knowledge Distillation", color: "#45B7D1", icon: "📚" },
    { name: "Early Exit Routing", color: "#96CEB4", icon: "🚀" },
  ];

  // Simulation metrics that decrease as optimization progresses
  const baseMetrics = {
    modelSize: 100,
    latency: 100,
    memory: 100,
    energy: 100,
  };

  const optimizedMetrics = {
    modelSize: 27, // -73%
    latency: 18, // -82%
    memory: 32, // -68%
    energy: 9, // -91%
  };

  // Calculate current metrics based on progress
  const currentMetrics = {
    modelSize:
      baseMetrics.modelSize +
      (optimizedMetrics.modelSize - baseMetrics.modelSize) * optimizationProgress,
    latency:
      baseMetrics.latency +
      (optimizedMetrics.latency - baseMetrics.latency) * optimizationProgress,
    memory:
      baseMetrics.memory +
      (optimizedMetrics.memory - baseMetrics.memory) * optimizationProgress,
    energy:
      baseMetrics.energy +
      (optimizedMetrics.energy - baseMetrics.energy) * optimizationProgress,
  };

  // Update optimization based on complexity
  useEffect(() => {
    const complexityFactor =
      complexityState === "complex"
        ? 0.015
        : complexityState === "simple"
          ? 0.025
          : 0.01;

    const interval = setInterval(() => {
      setOptimizationProgress((prev) => {
        const newProgress = Math.min(prev + complexityFactor, 1);
        if (newProgress === 1) {
          // Cycle back to beginning after reaching full optimization
          setTimeout(
            () => setOptimizationProgress(0),
            3000
          );
        }
        return newProgress;
      });

      setOptimizationPhase((prev) => (prev + 1) % phases.length);

      setParameterCount((prev) => {
        const minParams = 0.32;
        const range = 1.2 - minParams;
        const target = 1.2 - range * optimizationProgress;
        return prev + (target - prev) * 0.1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [complexityState]);

  // Canvas rendering for neural network visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
    ctx.fillRect(0, 0, width, height);

    const layers = 5;
    const nodesPerLayer = 6;
    const layerWidth = width / (layers + 1);

    // Draw nodes and connections with optimization effect
    const nodes: [number, number][] = [];

    for (let layer = 0; layer < layers; layer++) {
      const x = (layer + 1) * layerWidth;

      for (let node = 0; node < nodesPerLayer; node++) {
        const y = ((node + 1) / (nodesPerLayer + 1)) * height;
        nodes.push([x, y]);

        // Node opacity decreases with optimization (pruning effect)
        const opacity = 1 - optimizationProgress * 0.4;
        ctx.fillStyle = `rgba(100, 180, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, 6 + optimizationProgress * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw label
        ctx.fillStyle = `rgba(200, 220, 255, ${opacity * 0.7})`;
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`N${layer}-${node}`, x, y - 15);
      }
    }

    // Draw connections with pruning effect
    ctx.strokeStyle = "rgba(100, 180, 255, 0.3)";
    ctx.lineWidth = 1 + optimizationProgress;

    for (let i = 0; i < nodes.length - nodesPerLayer; i++) {
      const [x1, y1] = nodes[i];
      const layerIndex = Math.floor(i / nodesPerLayer);

      if (layerIndex < layers - 1) {
        for (let j = 0; j < nodesPerLayer; j++) {
          const nextIndex = (layerIndex + 1) * nodesPerLayer + j;
          if (nextIndex < nodes.length) {
            const [x2, y2] = nodes[nextIndex];

            // Skip some connections based on optimization progress (pruning)
            if (Math.random() > optimizationProgress * 0.3) {
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
        }
      }
    }

    // Draw input/output labels
    ctx.fillStyle = "rgba(150, 200, 255, 0.8)";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("INPUT", 60, height / 2 + 30);
    ctx.fillText("OUTPUT", width - 60, height / 2 + 30);
  }, [optimizationProgress]);

  return (
    <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden flex flex-col p-6 gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Neural Network Optimization</h2>
          <p className="text-slate-400 text-sm">Real-time Model Pruning & Parameter Reduction</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
            {(optimizationProgress * 100).toFixed(0)}% Optimized
          </span>
          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-semibold">
            {phases[optimizationPhase].icon} {phases[optimizationPhase].name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 flex-1">
        {/* Column 1: Parameter & Metrics Stats */}
        <div className="flex flex-col gap-3">
          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400/30"
            animate={{ scale: 1 + optimizationProgress * 0.05 }}
          >
            <p className="text-blue-200 text-xs mb-1">Parameter Count</p>
            <p className="text-2xl font-bold text-white">
              {parameterCount.toFixed(2)}
              <span className="text-xs ml-1">B</span>
            </p>
            <p className="text-blue-300 text-xs mt-1">
              ↓ {((1.2 - parameterCount) / 1.2 * 100).toFixed(0)}%
            </p>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-green-600 to-green-800 border border-green-400/30"
            animate={{ scale: 1 + optimizationProgress * 0.08 }}
          >
            <p className="text-green-200 text-xs mb-1">Inference Speedup</p>
            <p className="text-2xl font-bold text-white">
              {(5.6 + optimizationProgress * 0.4).toFixed(1)}
              <span className="text-xs ml-1">x</span>
            </p>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 border border-purple-400/30"
            animate={{ scale: 1 + optimizationProgress * 0.06 }}
          >
            <p className="text-purple-200 text-xs mb-1">Energy Efficiency</p>
            <p className="text-2xl font-bold text-white">
              {(92 + optimizationProgress * 8).toFixed(0)}
              <span className="text-xs ml-1">%</span>
            </p>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-yellow-600 to-yellow-800 border border-yellow-400/30"
            animate={{ scale: 1 + optimizationProgress * 0.07 }}
          >
            <p className="text-yellow-200 text-xs mb-1">Optimization %</p>
            <div className="flex items-end gap-1 mt-2">
              <p className="text-2xl font-bold text-white">
                {(optimizationProgress * 100).toFixed(0)}
              </p>
              <span className="text-xs text-yellow-300 pb-1">%</span>
            </div>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 border border-gray-400/30"
            animate={{ scale: 1 + optimizationProgress * 0.04 }}
          >
            <p className="text-gray-200 text-xs mb-1">Compute Mode</p>
            <p className="text-sm font-bold text-white">
              {complexityState === "complex"
                ? "Standard"
                : complexityState === "simple"
                  ? "Aggressive"
                  : "Idle"}
            </p>
          </motion.div>
        </div>

        {/* Column 2: Phases & Reduction Metrics */}
        <div className="flex flex-col gap-3">
          {/* Pruning Stages */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <p className="text-slate-300 text-xs font-semibold mb-2">Pruning Stages</p>
            <div className="space-y-1">
              {phases.map((phase, idx) => (
                <motion.div
                  key={idx}
                  className={`p-1.5 rounded text-xs font-semibold flex items-center gap-2 ${
                    idx === optimizationPhase
                      ? `bg-[${phase.color}] text-white`
                      : "bg-slate-800 text-slate-400"
                  }`}
                  animate={idx === optimizationPhase ? { opacity: [0.6, 1] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  <span>{phase.icon}</span>
                  <span>{phase.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Reduction Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <motion.div
              className="p-2 rounded bg-gradient-to-br from-red-600/30 to-red-800/30 border border-red-400/30"
              animate={{
                borderColor: optimizationProgress > 0.25 ? "rgb(134,239,172)" : "rgb(248,113,113)",
              }}
            >
              <p className="text-red-200 text-xs mb-1">Model Size</p>
              <p className="text-lg font-bold text-white">
                -{(73 * Math.min(optimizationProgress, 1)).toFixed(0)}%
              </p>
            </motion.div>

            <motion.div
              className="p-2 rounded bg-gradient-to-br from-cyan-600/30 to-cyan-800/30 border border-cyan-400/30"
              animate={{
                borderColor: optimizationProgress > 0.5 ? "rgb(134,239,172)" : "rgb(34,211,238)",
              }}
            >
              <p className="text-cyan-200 text-xs mb-1">Latency</p>
              <p className="text-lg font-bold text-white">
                -{(82 * Math.min(optimizationProgress, 1)).toFixed(0)}%
              </p>
            </motion.div>

            <motion.div
              className="p-2 rounded bg-gradient-to-br from-orange-600/30 to-orange-800/30 border border-orange-400/30"
              animate={{
                borderColor: optimizationProgress > 0.75 ? "rgb(134,239,172)" : "rgb(249,115,22)",
              }}
            >
              <p className="text-orange-200 text-xs mb-1">Memory</p>
              <p className="text-lg font-bold text-white">
                -{(68 * Math.min(optimizationProgress, 1)).toFixed(0)}%
              </p>
            </motion.div>

            <motion.div
              className="p-2 rounded bg-gradient-to-br from-lime-600/30 to-lime-800/30 border border-lime-400/30"
              animate={{
                borderColor: optimizationProgress > 0.9 ? "rgb(134,239,172)" : "rgb(132,204,22)",
              }}
            >
              <p className="text-lime-200 text-xs mb-1">Energy</p>
              <p className="text-lg font-bold text-white">
                -{(91 * Math.min(optimizationProgress, 1)).toFixed(0)}%
              </p>
            </motion.div>
          </div>
        </div>

        {/* Columns 3-4: Neural Network Graph */}
        <div className="col-span-2 bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            className="w-full h-full"
          />
        </div>

        {/* Column 5: Real-Time Metrics */}
        <div className="flex flex-col gap-2">
          {[
            { label: "Active Users", value: metrics.activeUsers, color: "blue" },
            { label: "CPU Load", value: `${metrics.cpuLoadPercent.toFixed(0)}%`, color: "amber" },
            { label: "Energy Savings", value: `${metrics.energySavingsPercent.toFixed(0)}%`, color: "green" },
            { label: "Total Uptime", value: `${(metrics.uptimeSeconds / 3600).toFixed(1)}h`, color: "cyan" },
          ].map((metric, idx) => (
            <motion.div
              key={idx}
              className={`p-2 rounded-lg bg-${metric.color}-600/20 border border-${metric.color}-400/30`}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, delay: idx * 0.3, repeat: Infinity }}
            >
              <p className={`text-${metric.color}-200 text-xs mb-1`}>{metric.label}</p>
              <p className="text-lg font-bold text-white">{metric.value}</p>
            </motion.div>
          ))}

          {/* Active Phase Indicator */}
          <motion.div
            className="p-2 rounded-lg bg-gradient-to-r from-pink-600/30 to-purple-600/30 border border-pink-400/30 mt-auto"
            animate={{
              boxShadow: [
                "0 0 8px rgba(236,72,153,0.3)",
                "0 0 16px rgba(236,72,153,0.6)",
                "0 0 8px rgba(236,72,153,0.3)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-pink-200 text-xs font-semibold">Current Phase</p>
            <p className="text-sm font-bold text-white mt-1">
              {phases[optimizationPhase].icon} {phases[optimizationPhase].name}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DynamicOptimizationGraph;
