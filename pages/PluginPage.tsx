import React from 'react';
import { ShieldAlert, Terminal, Lock, Key, Layers, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

import PluginManagerDemo from '../demos/interactive/PluginManagerDemo';
import ProtocolDiagnostics from '../components/ProtocolDiagnostics';

const PluginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="text-center space-y-4 pt-6">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Cpu className="w-12 h-12 text-blue-400 animate-pulse" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">AI Agent Plugin Hub</h1>
          <p className="text-xl sm:text-2xl text-gray-300 font-medium">Decentralized AI Extension SDK Layer</p>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Construct, sandbox, and run autonomous AI agents dynamically. The Nexus Protocol Plugin SDK empowers external developers to register custom actions and inspect cognitive graph resources safely.
          </p>
        </div>

        {/* Security and Architecture Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/40 border border-gray-700/60 p-6 rounded-2xl space-y-3"
          >
            <div className="w-10 h-10 bg-blue-950/40 border border-blue-800/40 text-blue-400 rounded-xl flex items-center justify-center">
              <Lock size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">JavaScript Sandbox</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Third-party scripts execute in a strict closed scope. Global references like <code className="text-gray-300 bg-gray-900/60 px-1 py-0.5 rounded font-mono">window</code>, <code className="text-gray-300 bg-gray-900/60 px-1 py-0.5 rounded font-mono">document</code>, and storage targets are overwritten with <code className="text-red-400 font-mono">undefined</code> to enforce runtime isolation.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/40 border border-gray-700/60 p-6 rounded-2xl space-y-3"
          >
            <div className="w-10 h-10 bg-orange-950/40 border border-orange-800/40 text-orange-400 rounded-xl flex items-center justify-center">
              <Key size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Fine-Grained ACL</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Permissions are declared inside manifest headers. Operations accessing the user's sovereign persona profile or adding nodes to the cognitive graph are validated against the approved scopes dynamically.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/40 border border-gray-700/60 p-6 rounded-2xl space-y-3"
          >
            <div className="w-10 h-10 bg-purple-950/40 border border-purple-800/40 text-purple-400 rounded-xl flex items-center justify-center">
              <Layers size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Priority Event Bus</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Communicational layers rely on a typed event structure. Agents can publish or subscribe to specific topics or wildcard matches, executing callbacks sorted by custom priority weightings.
            </p>
          </motion.div>

        </div>

        {/* Interactive Workspace */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white px-2">Interactive Agent Playground</h2>
          <div className="bg-slate-800/30 border border-gray-700/80 rounded-3xl overflow-hidden shadow-2xl">
            <PluginManagerDemo />
          </div>
        </div>

        {/* Diagnostic Logs Panel */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white px-2">System Diagnostics Monitor</h2>
          <ProtocolDiagnostics />
        </div>

      </div>
    </div>
  );
};

export default PluginPage;
