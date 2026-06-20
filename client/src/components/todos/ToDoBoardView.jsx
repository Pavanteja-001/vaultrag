import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ToDoCard from './ToDoCard';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

const ToDoListColumn = ({ title, count, todos, onUpdate }) => (
  <div className="flex-1">
    <div className="flex items-center gap-2 mb-4">
      <h3 className="font-heading font-semibold text-white">{title}</h3>
      <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full font-mono-code">{count}</span>
    </div>
    <div className="space-y-2">
      {todos.map((todo) => (
        <ToDoCard key={todo._id} todo={todo} onUpdate={onUpdate} />
      ))}
      {todos.length === 0 && (
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-gray-600">{title === 'Open' ? 'No open tasks' : 'No completed tasks'}</p>
        </div>
      )}
    </div>
  </div>
);

const ToDoBoardView = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const url = showAll && user?.role === 3 ? '/api/todos/all' : `/api/todos/${user?.id}`;
        const res = await axiosClient.get(url);
        setTodos(res.data.todos || []);
      } catch {} finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchTodos();
  }, [user?.id, showAll]);

  const handleUpdate = (todoId, newStatus) => {
    setTodos((prev) =>
      prev.map((t) =>
        t._id === todoId
          ? { ...t, status: newStatus, completedAt: newStatus === 'done' ? new Date() : null }
          : t
      )
    );
  };

  const openTodos = todos.filter((t) => t.status === 'open');
  const doneTodos = todos.filter((t) => t.status === 'done');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold gradient-text mb-1">Developer To-Do Board</h1>
          <p className="text-sm text-gray-500">Auto-generated tasks from mockup integration queries</p>
        </div>
        {user?.role === 3 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-heading font-semibold transition-all duration-200 ${
              showAll
                ? 'bg-gradient-ai text-white shadow-glow-ai'
                : 'glass-card text-gray-400 hover:text-white'
            }`}
          >
            {showAll ? 'My Board' : 'All Boards'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="flex-1 space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="glass-card p-4 h-16 skeleton" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-6">
          <ToDoListColumn title="Open" count={openTodos.length} todos={openTodos} onUpdate={handleUpdate} />
          <div className="w-px bg-white/5" />
          <ToDoListColumn title="Done" count={doneTodos.length} todos={doneTodos} onUpdate={handleUpdate} />
        </div>
      )}
    </div>
  );
};

export default ToDoBoardView;
