import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Search, BookOpen, Shield, 
  Cpu, GitBranch, AlertTriangle, ListTodo, FileText, CheckCircle2 
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    steps: [
      { id: 0, label: 'Platform Introduction', img: '/images/image.png', desc: 'Welcome to VaultRAG, a premium technical assistant embedded in your engineering codebase, enabling real-time workspace intelligence and AI-driven security auditing.' },
      { id: 1, label: 'Role-Based Authentication', img: '/images/image copy.png', desc: 'Secure, token-based authentication page with distinct roles (L1 Junior Dev, L2 Senior Dev, L3 PM/Admin).' },
      { id: 2, label: 'Access Level Configurations', img: '/images/image copy 2.png', desc: 'Verification of authenticated active developer session and client-side view customization matching user privileges.' }
    ]
  },
  {
    id: 'knowledge-chat',
    title: 'AI Knowledge Chat',
    icon: Cpu,
    steps: [
      { id: 3, label: 'Knowledge Chat Overview', img: '/images/image copy 3.png', desc: 'Conversational chat dashboard utilizing advanced retrieval augmented generation to answer complex project architecture queries.' },
      { id: 4, label: 'Code Query Interface', img: '/images/image copy 4.png', desc: 'Interactive chat feed showing user prompt submissions and immediate contextual stream response loading.' },
      { id: 5, label: 'Mac-Style Code Renderer', img: '/images/image copy 5.png', desc: 'Syntax-highlighted code chunks rendered in a Mac-terminal styled container, featuring active filename tags and clipboard copies.' },
      { id: 6, label: 'Clickable Citation Pills', img: '/images/image copy 6.png', desc: 'Source references embedded inside AI answers. Clicking a pill expands an inline editor showing the exact code chunk queried.' },
      { id: 7, label: 'Multi-Modal Attachments', img: '/images/image copy 7.png', desc: 'Paperclip attachment trigger allowing PMs to contextually couple mockups/images directly with LLM instructions.' },
      { id: 8, label: 'System Guard Validation', img: '/images/image copy 8.png', desc: 'Behind-the-scenes verification where user roles are checked on the DB on every single AI request to prevent session hijacking.' },
      { id: 9, label: 'Prompt Injection Defense', img: '/images/image copy 9.png', desc: 'Security engine intercepts malicious requests. Prompts attempting jailbreaks trigger a neon red shield warning and write audit logs.' }
    ]
  },
  {
    id: 'neural-sync',
    title: 'Neural Sync Pipeline',
    icon: GitBranch,
    steps: [
      { id: 10, label: 'Pulsating Status Pill', img: '/images/image copy 10.png', desc: 'The neural sync status indicator in the top navbar. Glows green when synchronized and pulsates neon blue when active.' },
      { id: 11, label: 'Pipeline Sync Flyout', img: '/images/image copy 11.png', desc: 'Detailed, drop-down terminal showing real-time git webhook processing logs, from receiving commits to node updates.' },
      { id: 12, label: 'AST Code Parser', img: '/images/image copy 12.png', desc: 'Codebase slicing logic. Committed files are parsed into structural nodes (classes, hooks, functions) for precise indexing.' },
      { id: 13, label: 'Gemini Chunk Embedding', img: '/images/image copy 13.png', desc: 'Pipeline step generating 768-dimension vectors using Google Gemini models, writing synchronized vector keys to MongoDB Atlas.' }
    ]
  },
  {
    id: 'sme-regression',
    title: 'SME & Performance Insights',
    icon: AlertTriangle,
    steps: [
      { id: 14, label: 'Regression Querying', img: '/images/image copy 14.png', desc: 'Developer regression dashboard. Enter performance symptoms like "why is order checkout laggy?" to audit git history.' },
      { id: 15, label: 'Subject Matter Expert Card', img: '/images/image copy 15.png', desc: 'Dynamic glassmorphic card displaying the identified Subject Matter Expert with corresponding profile avatar.' },
      { id: 16, label: 'Confidence Score System', img: '/images/image copy 16.png', desc: 'AI confidence progress bar calculating the likelihood that a specific developer\'s commit is the root cause of the lag.' },
      { id: 17, label: 'Interactive Regression Graph', img: '/images/image copy 17.png', desc: 'Visual timeline rendering recent commits. The problematic commit is highlighted with confidence-colored neon borders.' }
    ]
  },
  {
    id: 'pm-tracker',
    title: 'PM Center & Scope Tracker',
    icon: FileText,
    steps: [
      { id: 18, label: 'PRD Document Ingestion', img: '/images/image copy 18.png', desc: 'L3 PM tool supporting PDF/TXT PRD uploads. Uploaded requirements are automatically chunked and mapped.' },
      { id: 19, label: 'Mockup Processing Center', img: '/images/image copy 19.png', desc: 'Image uploader. PMs drag UI screenshots to parse design components, labels, and input fields via Gemini Vision.' },
      { id: 20, label: 'Gemini Vision description', img: '/images/image copy 20.png', desc: 'AI-generated mockup description. Extracted labels feed directly into developer tasks and implementation audits.' },
      { id: 21, label: 'Scope Tracker Dashboard', img: '/images/image copy 21.png', desc: 'Project compliance panel. Automatically tracks PRD specifications against actual code commits to calculate completion.' },
      { id: 22, label: 'Segmented Progress Indicators', img: '/images/image copy 22.png', desc: 'Sci-fi battery-style segmented progress bar glowing green for completed code requirements and yellow for active files.' },
      { id: 23, label: 'Requirement Commit Map', img: '/images/image copy 23.png', desc: 'Collapsible accordion mapping each requirement to the specific commit hashes, authors, and file diffs that completed it.' }
    ]
  },
  {
    id: 'audit-governance',
    title: 'To-Dos & Audit Admin',
    icon: ListTodo,
    steps: [
      { id: 24, label: 'Automated Developer Board', img: '/images/image copy 24.png', desc: 'Kanban list. Tasks are generated automatically when a mockup is uploaded and checked off as developers commit matching code.' },
      { id: 25, label: 'Cryptographic Audit Log', img: '/images/image copy 25.png', desc: 'Strict security ledger tracking user queries, blocks, and files. Blocked queries are highlighted with subtle red warning tints.' },
      { id: 26, label: 'Hash Chain Verification Pill', img: '/images/image copy 26.png', desc: 'Lock indicators verifying the audit trail\'s cryptographic integrity. Green means the hash chain is fully intact.' }
    ]
  }
];

const DocumentationView = ({ onClose }) => {
  const [activeStepId, setActiveStepId] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Flattened steps list for easier next/prev navigation
  const allSteps = CATEGORIES.flatMap(cat => cat.steps);
  const currentStep = allSteps.find(step => step.id === activeStepId) || allSteps[0];

  // Find step category
  const currentCategory = CATEGORIES.find(cat => 
    cat.steps.some(step => step.id === activeStepId)
  );

  const handleNext = () => {
    if (activeStepId < allSteps.length - 1) {
      setActiveStepId(activeStepId + 1);
    }
  };

  const handlePrev = () => {
    if (activeStepId > 0) {
      setActiveStepId(activeStepId - 1);
    }
  };

  const filteredCategories = CATEGORIES.map(cat => {
    const filteredSteps = cat.steps.filter(step => 
      step.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...cat, steps: filteredSteps };
  }).filter(cat => cat.steps.length > 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-base-900 flex flex-col text-white font-inter"
    >
      {/* Top Navbar */}
      <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-surface-800/80 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-5 h-5 text-neon-blue" />
          <h2 className="font-heading text-xl font-bold gradient-text">VaultRAG Complete Guide</h2>
          <span className="text-xs text-gray-500 font-mono-code px-2 py-0.5 rounded border border-white/5 bg-white/5">
            Step {currentStep.id + 1} of {allSteps.length}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-700 transition-colors border border-white/10 hover:shadow-glow-ai/10"
        >
          <X className="w-5 h-5 text-gray-400 hover:text-white" />
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-80 border-r border-white/10 bg-surface-800/40 flex flex-col overflow-y-auto">
          {/* Search bar */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search steps & features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-700/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue focus:shadow-glow-ai/10 transition-all duration-200"
              />
            </div>
          </div>

          {/* Navigation Categories */}
          <div className="flex-1 p-3 space-y-4">
            {filteredCategories.map(cat => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center space-x-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <Icon className="w-3.5 h-3.5 text-neon-purple/80" />
                    <span>{cat.title}</span>
                  </div>
                  <div className="space-y-0.5">
                    {cat.steps.map(step => (
                      <button
                        key={step.id}
                        onClick={() => setActiveStepId(step.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between ${
                          activeStepId === step.id 
                            ? 'bg-gradient-ai text-white font-medium shadow-glow-ai/20' 
                            : 'text-gray-400 hover:text-white hover:bg-surface-700/40'
                        }`}
                      >
                        <span className="truncate pr-2">{step.label}</span>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          activeStepId === step.id ? 'opacity-100 translate-x-0.5' : 'opacity-0'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No matching guide steps found.
              </div>
            )}
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 flex flex-col bg-base-900 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-between">
            {/* Header info */}
            <div>
              <div className="flex items-center space-x-2 text-xs text-neon-purple font-bold tracking-wider uppercase mb-1">
                <span>{currentCategory?.title}</span>
                <span>•</span>
                <span>Feature Walkthrough</span>
              </div>
              <h1 className="text-2xl font-bold font-heading mb-4 text-white">
                {currentStep.label}
              </h1>
              <p className="text-gray-400 text-base leading-relaxed mb-6 glass-card p-4 border-l-2 border-l-neon-blue">
                {currentStep.desc}
              </p>
            </div>

            {/* Interactive Image Display Card */}
            <div className="flex-1 flex items-center justify-center min-h-[350px] mb-8 relative glass-card overflow-hidden p-3 border border-white/10 group hover:shadow-glow-ai/5 transition-shadow duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none z-10" />
              <img 
                src={currentStep.img} 
                alt={currentStep.label}
                className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl relative z-0 select-none pointer-events-none transform group-hover:scale-[1.01] transition-transform duration-500"
                onError={(e) => {
                  // Fallback if image fails to render
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop";
                }}
              />
            </div>

            {/* Footer Navigation Buttons */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 bg-base-900">
              <button
                onClick={handlePrev}
                disabled={activeStepId === 0}
                className="flex items-center space-x-2 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-700/60 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              
              <div className="text-xs text-gray-500 font-mono-code">
                {activeStepId + 1} of {allSteps.length}
              </div>

              <button
                onClick={handleNext}
                disabled={activeStepId === allSteps.length - 1}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-ai border border-transparent rounded-lg text-sm text-white hover:shadow-glow-ai/20 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </motion.div>
  );
};

export default DocumentationView;
