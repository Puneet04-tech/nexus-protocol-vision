import React, { useState, useEffect } from 'react';
import { Leaf, Award, Compass, HeartHandshake, Zap, Plus } from 'lucide-react';
import { CarbonAwareOptimizer, CarbonOffset } from '../../core/carbon-aware/CarbonAwareOptimizer';

interface CarbonDashboardProps {
  carbonOptimizer: CarbonAwareOptimizer | null;
}

export const CarbonDashboard: React.FC<CarbonDashboardProps> = ({ carbonOptimizer }) => {
  const [report, setReport] = useState({
    totalEmissions: 0.1,
    averageEfficiency: 0.85,
    optimizationSavings: 0.05,
    budgetUtilization: 10,
    trend: 'stable' as 'increasing' | 'decreasing' | 'stable',
    recommendations: [] as string[]
  });

  const [offsets, setOffsets] = useState<CarbonOffset[]>([]);
  const [buyingOffset, setBuyingOffset] = useState(false);

  useEffect(() => {
    if (!carbonOptimizer) return;

    const syncReport = () => {
      try {
        const repVal = carbonOptimizer.getEfficiencyReport();
        setReport({
          totalEmissions: repVal.totalEmissions,
          averageEfficiency: repVal.averageEfficiency,
          optimizationSavings: repVal.optimizationSavings,
          budgetUtilization: repVal.budgetUtilization,
          trend: repVal.trend as 'increasing' | 'decreasing' | 'stable',
          recommendations: repVal.recommendations
        });
      } catch (e) {
        // Suppress sync exceptions
      }
    };

    syncReport();
    const interval = setInterval(syncReport, 1000);
    return () => clearInterval(interval);
  }, [carbonOptimizer]);

  const handleBuyOffset = async () => {
    if (!carbonOptimizer) return;
    setBuyingOffset(true);

    try {
      const res = await carbonOptimizer.purchaseOffsets(10, {
        type: 'reforestation',
        verifiedOnly: true,
        maxPrice: 20
      });
      setOffsets(prev => [...prev, ...res]);
    } catch (e) {
      // Suppress exceptions
    } finally {
      setBuyingOffset(false);
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
        <Leaf className="w-4 h-4 text-green-400" />
        Carbon Footprint Dashboard
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Budget Utilization Gauge */}
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Budget Utilization</span>
            <Compass className="w-4 h-4 text-green-400 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <span className="text-2xl font-extrabold text-slate-100 font-mono py-1">
            {report.budgetUtilization.toFixed(1)}%
          </span>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                report.budgetUtilization > 90 ? 'bg-red-500' : report.budgetUtilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, report.budgetUtilization)}%` }}
            />
          </div>
        </div>

        {/* Total emissions */}
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Emissions Saved</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="text-2xl font-extrabold text-green-400 font-mono py-1">
            {report.optimizationSavings.toFixed(3)} kg
          </span>
          <p className="text-[9px] text-slate-500 font-medium">
            Accumulated savings from neural pruning.
          </p>
        </div>
      </div>

      {/* Carbon Offsets Purchase Section */}
      <div className="border-t border-slate-700/40 pt-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-blue-400" />
            Verified Reforestation Offsets
          </span>
          
          <button
            onClick={handleBuyOffset}
            disabled={buyingOffset || !carbonOptimizer}
            className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-bold text-white flex items-center gap-1 transition-all"
          >
            <Plus className="w-3 h-3" />
            Purchase Offset
          </button>
        </div>

        {/* Offsets list */}
        <div className="space-y-1.5 max-h-[85px] overflow-y-auto scrollbar-thin text-[10px] font-mono">
          {offsets.length === 0 ? (
            <p className="text-center text-slate-500 py-3 font-sans">
              No offset agreements purchased yet. Buy offsets to achieve net zero footprint.
            </p>
          ) : (
            offsets.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900"
              >
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-green-400" />
                  <span>Offset #{item.offsetId.substring(7, 13)} ({item.amount}kg CO2)</span>
                </div>
                <span className="text-green-400 font-bold">${item.cost.toFixed(2)} USD</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
