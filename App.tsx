import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/dashboard/DashboardLayout';

// Contexts
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { GraphComplexityProvider } from './contexts/GraphComplexityContext';
import { ErrorStateProvider } from './contexts/ErrorStateContext';
import { DiagnosticLogProvider } from './contexts/DiagnosticLogContext';
import { RealTimeProvider } from './contexts/RealTimeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import SovereignPersonaPage from './pages/SovereignPersonaPage';
import CognitiveGraphPage from './pages/CognitiveGraphPage';
import PrivacyNegotiatorPage from './pages/PrivacyNegotiatorPage';
import CarbonAwarePage from './pages/CarbonAwarePage';
import FederatedLearningPage from './pages/FederatedLearningPage';
import MorphNetPage from './pages/MorphNetPage';
import ImmuneSystemPage from './pages/ImmuneSystemPage';
import LatentSpaceMapping from './pages/LatentSpaceMapping';
import MonitoringAnalyticsPage from './pages/MonitoringAnalyticsPage';
import ExplainabilityPage from './pages/ExplainabilityPage';
import PluginPage from './pages/PluginPage';
import PlaygroundPage from './pages/PlaygroundPage';
import GovernancePage from './pages/GovernancePage';
import { ConflictResolutionPage } from './pages/ConflictResolutionPage';
import WorkflowOrchestratorPage from './pages/WorkflowOrchestratorPage';


// Main App Component
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <GraphComplexityProvider>
            <ErrorStateProvider>
              <DiagnosticLogProvider>
                <RealTimeProvider>
                  <ErrorBoundary>
                    <DashboardLayout>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/sovereign-persona" element={<SovereignPersonaPage />} />
                        <Route path="/cognitive-graph" element={<CognitiveGraphPage />} />
                        <Route path="/privacy-negotiator" element={<PrivacyNegotiatorPage />} />
                        <Route path="/carbon-aware" element={<CarbonAwarePage />} />
                        <Route path="/federated-learning" element={<FederatedLearningPage />} />
                        <Route path="/morphnet" element={<MorphNetPage />} />
                        <Route path="/immune-system" element={<ImmuneSystemPage />} />
                        <Route path="/latent-space" element={<LatentSpaceMapping />} />
                        <Route path="/monitoring" element={<MonitoringAnalyticsPage />} />
                        <Route path="/governance" element={<GovernancePage />} />
                        <Route path="/conflict-resolution" element={<ConflictResolutionPage />} />
                        <Route path="/explainability" element={<ExplainabilityPage />} />
                        <Route path="/plugins" element={<PluginPage />} />
                        <Route path="/playground" element={<PlaygroundPage />} />
                        <Route path="/orchestrator" element={<WorkflowOrchestratorPage />} />
                      </Routes>
                    </DashboardLayout>
                  </ErrorBoundary>
                </RealTimeProvider>
              </DiagnosticLogProvider>
            </ErrorStateProvider>
          </GraphComplexityProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
