import React from 'react';
import { SimulationCanvas } from '../playground/components/SimulationCanvas';

const PlaygroundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950">
      <SimulationCanvas />
    </div>
  );
};

export default PlaygroundPage;
