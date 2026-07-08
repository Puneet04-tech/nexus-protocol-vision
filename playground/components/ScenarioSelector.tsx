import React, { useState } from 'react';
import { BookOpen, Award, Clock, Code2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { PREDEFINED_SCENARIOS } from '../ScenarioLibrary';
import { Scenario, WorkflowStep } from '../PlaygroundTypes';

interface ScenarioSelectorProps {
  currentScenarioId: string | null;
  onSelectScenario: (id: string, customSteps?: WorkflowStep[]) => void;
}

const CUSTOM_STEP_TEMPLATES: Array<{ label: string; component: WorkflowStep['component']; operation: string; message: string }> = [
  { label: 'Initialize Sovereign Persona', component: 'sovereign-persona', operation: 'initialize', message: 'Setting up new Sovereign Persona twin instance with professional contexts.' },
  { label: 'Process Learning Interaction', component: 'sovereign-persona', operation: 'processInteraction', message: 'Ingesting learning interaction to expand Cognitive Graph.' },
  { label: 'Identify Cognitive Gaps', component: 'cognitive-graph', operation: 'identifyGaps', message: 'Scanning Cognitive Graph confidence distributions for knowledge gaps.' },
  { label: 'Generate Learning Path', component: 'cognitive-graph', operation: 'generateLearningPath', message: 'Computing optimal prerequisite steps to bridge mastery gaps.' },
  { label: 'Setup Privacy Negotiator', component: 'privacy-negotiator', operation: 'initialize', message: 'Bootstrapping negotiator parameters.' },
  { label: 'Conclude Privacy Negotiation', component: 'privacy-negotiator', operation: 'negotiate', message: 'Conducting secure negotiation checks via MPC and ZKP verification.' },
  { label: 'Setup Federated Learning Client', component: 'federated-learning', operation: 'initialize', message: 'Activating secure collaborative learning protocols.' },
  { label: 'Participate in Secure Aggregation', component: 'federated-learning', operation: 'contribute', message: 'Running secure gradient noise injection and weight updates.' },
  { label: 'Active Immune System Shield', component: 'adversarial-immune', operation: 'initialize', message: 'Intrusion monitors online.' },
  { label: 'Block Adversarial Injections', component: 'adversarial-immune', operation: 'monitor', message: 'Detecting injection strings and quarantining contexts.' },
  { label: 'Profile Carbon Compute Limits', component: 'carbon-optimizer', operation: 'optimize', message: 'Enforcing green budget ceilings on complex layer tasks.' },
  { label: 'Prune Layer Weights (MorphNet)', component: 'morphnet', operation: 'optimizeForTask', message: 'Performing dynamic neural architecture restructuring.' },
  { label: 'Create Latent Space Maps', component: 'latent-mapping', operation: 'createSpace', message: 'Setting up universal interoperability mapping coordinates.' }
];

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  currentScenarioId,
  onSelectScenario
}) => {
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined');
  const [customSteps, setCustomSteps] = useState<WorkflowStep[]>([]);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);

  const addCustomStep = () => {
    const template = CUSTOM_STEP_TEMPLATES[selectedTemplateIndex];
    const newStep: WorkflowStep = {
      id: `custom-step-${Date.now()}-${customSteps.length}`,
      label: template.label,
      component: template.component,
      operation: template.operation,
      status: 'pending',
      duration: 0,
      message: template.message
    };
    setCustomSteps([...customSteps, newStep]);
  };

  const removeCustomStep = (index: number) => {
    setCustomSteps(customSteps.filter((_, idx) => idx !== index));
  };

  const handleApplyCustomScenario = () => {
    if (customSteps.length === 0) return;
    onSelectScenario('custom', customSteps);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-700/60 pb-1">
        <button
          onClick={() => setActiveTab('predefined')}
          className={`flex-1 pb-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'predefined'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Built-in Scenarios
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 pb-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'custom'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Custom Scenario Builder
        </button>
      </div>

      {activeTab === 'predefined' ? (
        /* Predefined Scenarios List */
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {PREDEFINED_SCENARIOS.map(sc => {
            const isSelected = currentScenarioId === sc.id;
            const complexityColors = {
              beginner: 'text-green-400 bg-green-950/40 border-green-800/40',
              intermediate: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40',
              advanced: 'text-red-400 bg-red-950/40 border-red-800/40'
            };

            return (
              <div
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:bg-slate-700/30 ${
                  isSelected
                    ? 'border-blue-500 bg-slate-800/80 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                    : 'border-slate-700 bg-slate-900/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    {sc.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-semibold uppercase tracking-wider ${complexityColors[sc.complexity]}`}>
                      {sc.complexity}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {sc.duration}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                  {sc.description}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Components:</span>
                  {[...new Set(sc.steps.map(s => s.component))].map(c => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Custom Scenario Compiler */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplateIndex}
              onChange={(e) => setSelectedTemplateIndex(Number(e.target.value))}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
            >
              {CUSTOM_STEP_TEMPLATES.map((tpl, index) => (
                <option key={index} value={index}>
                  {tpl.label} ({tpl.component})
                </option>
              ))}
            </select>
            <button
              onClick={addCustomStep}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              title="Add Step"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Compiled Steps List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {customSteps.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">
                No steps added yet. Choose a template above and click '+' to assemble your scenario.
              </p>
            ) : (
              customSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-xs"
                >
                  <div className="flex flex-col gap-0.5 max-w-[80%]">
                    <span className="font-semibold text-slate-200 truncate">
                      {idx + 1}. {step.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">
                      {step.component} : {step.operation}
                    </span>
                  </div>
                  <button
                    onClick={() => removeCustomStep(idx)}
                    className="text-red-400 hover:text-red-300 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            onClick={handleApplyCustomScenario}
            disabled={customSteps.length === 0}
            className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              customSteps.length > 0
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply Custom Scenario ({customSteps.length} Steps)
          </button>
        </div>
      )}
    </div>
  );
};
