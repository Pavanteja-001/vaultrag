import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

const MacDots = () => (
  <div className="flex items-center gap-1.5">
    <div className="w-3 h-3 rounded-full bg-red-500" />
    <div className="w-3 h-3 rounded-full bg-yellow-400" />
    <div className="w-3 h-3 rounded-full bg-green-500" />
  </div>
);

const CodeSnippetRenderer = ({ code, language = 'javascript', filename = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 my-3">
      {/* Mac-style top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/5">
        <div className="flex items-center gap-3">
          <MacDots />
          {filename && (
            <span className="text-xs text-gray-500 font-mono-code">{filename}</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-neon-green" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy</>
          )}
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={atomDark}
        customStyle={{
          margin: 0,
          padding: '16px',
          background: 'rgba(0,0,0,0.8)',
          fontSize: '13px',
          fontFamily: '"JetBrains Mono", monospace',
        }}
        wrapLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeSnippetRenderer;
