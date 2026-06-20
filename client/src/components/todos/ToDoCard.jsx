import React from 'react';
import { motion } from 'framer-motion';
import { Image } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const ToDoCard = ({ todo, onUpdate }) => {
  const isDone = todo.status === 'done';

  const handleCheck = async () => {
    const newStatus = isDone ? 'open' : 'done';
    try {
      await axiosClient.patch(`/api/todos/${todo._id}`, { status: newStatus });
      onUpdate?.(todo._id, newStatus);
    } catch {}
  };

  return (
    <motion.div
      layout
      animate={{ opacity: isDone ? 0.5 : 1 }}
      whileHover={{ boxShadow: isDone ? 'none' : '0 0 12px rgba(0,210,255,0.15)' }}
      className="glass-card p-4 cursor-pointer group"
    >
      <div className="flex items-start gap-3" onClick={handleCheck}>
        {/* Checkbox */}
        <div className={`w-5 h-5 rounded-md border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200 ${
          isDone
            ? 'bg-neon-green border-neon-green'
            : 'border-white/20 group-hover:border-neon-blue'
        }`}>
          {isDone && (
            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isDone ? 'line-through text-gray-600' : 'text-gray-200'}`}>
            {todo.task}
          </p>

          {todo.mockupId && (
            <div className="flex items-center gap-1 mt-1.5">
              <Image className="w-3 h-3 text-neon-purple" />
              <span className="text-xs text-neon-purple font-mono-code">Mockup task</span>
            </div>
          )}

          {isDone && todo.completedAt && (
            <p className="text-xs text-gray-700 mt-1 font-mono-code">
              Completed {new Date(todo.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ToDoCard;
