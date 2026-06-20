import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CitationPill from './CitationPill';
import CodeSnippetRenderer from './CodeSnippetRenderer';

const bubbleVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export const UserMessageBubble = ({ message }) => (
  <motion.div
    {...bubbleVariants}
    className="flex justify-end mb-4"
  >
    <div className="max-w-xl">
      <div className="bg-surface-700 rounded-2xl rounded-br-sm px-4 py-3 text-sm text-white">
        {message.content}
      </div>
      <p className="text-xs text-gray-600 mt-1 text-right font-mono-code">
        {new Date(message.timestamp).toLocaleTimeString()}
      </p>
    </div>
  </motion.div>
);

export const VaultRAGMessageBubble = ({ message }) => (
  <motion.div
    {...bubbleVariants}
    className="flex justify-start mb-4"
  >
    <div className="max-w-2xl w-full">
      <div className="glass-card border border-white/5 relative overflow-hidden">
        {/* Left border gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-ai-vertical" />

        <div className="p-4 pl-5">
          {/* AI label */}
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-ai" />
            <span className="text-xs text-gray-500 font-mono-code">VaultRAG</span>
          </div>

          {/* Content */}
          <div className="prose prose-invert prose-sm max-w-none text-gray-200">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  if (!inline && match) {
                    return <CodeSnippetRenderer code={code} language={match[1]} />;
                  }
                  return (
                    <code className="bg-surface-700 px-1.5 py-0.5 rounded text-neon-blue font-mono-code text-xs" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Sources / Citation pills — deduplicated by filepath */}
          {message.sources && message.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/5">
              {Array.from(
                message.sources.reduce((map, s) => {
                  if (!map.has(s.filepath)) map.set(s.filepath, s);
                  return map;
                }, new Map()).values()
              ).map((source, i) => (
                <CitationPill key={i} filepath={source.filepath} snippet={source.snippet} />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-1 font-mono-code">
        {new Date(message.timestamp).toLocaleTimeString()}
      </p>
    </div>
  </motion.div>
);

export const SecurityAlertBubble = ({ message }) => (
  <motion.div
    {...bubbleVariants}
    className="flex justify-start mb-4"
  >
    <div className="max-w-xl w-full">
      <div className="glass-card border-2 border-neon-red/60 relative overflow-hidden"
        style={{ boxShadow: '0 0 20px rgba(255,0,60,0.2), inset 0 0 20px rgba(255,0,60,0.05)' }}
      >
        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <ShieldAlert className="w-5 h-5 text-neon-red flex-shrink-0" />
            <span className="text-sm font-heading font-semibold text-neon-red">Security Block</span>
          </div>
          <p className="text-sm text-gray-300">{message.content}</p>
        </div>
      </div>
    </div>
  </motion.div>
);

export const LoadingBubble = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex justify-start mb-4"
  >
    <div className="glass-card px-5 py-4 flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-neon-blue"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  </motion.div>
);
