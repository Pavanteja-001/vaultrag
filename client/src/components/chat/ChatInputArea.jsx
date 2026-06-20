import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip } from 'lucide-react';

const ChatInputArea = ({ onSend, loading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  useEffect(() => { adjustHeight(); }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="border-t border-white/5 p-4" style={{ background: 'rgba(24,24,27,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-4xl mx-auto flex items-end gap-3">
        {/* Attach mockup */}
        <button className="flex-shrink-0 p-2.5 rounded-xl text-gray-500 hover:text-neon-blue hover:bg-white/5 transition-all duration-200 mb-0.5">
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the codebase... (Shift+Enter for newline)"
            rows={1}
            className="w-full bg-surface-700 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none input-glow transition-all duration-200 leading-relaxed"
            style={{ minHeight: '48px', maxHeight: '160px' }}
          />
        </div>

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          whileHover={{ scale: input.trim() && !loading ? 1.05 : 1 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 p-2.5 rounded-xl bg-gradient-ai text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-glow-ai transition-all duration-200 mb-0.5"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>

      <p className="text-center text-xs text-gray-700 mt-2">
        All queries are role-filtered and audited. Injection attempts are blocked automatically.
      </p>
    </div>
  );
};

export default ChatInputArea;
