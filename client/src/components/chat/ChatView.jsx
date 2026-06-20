import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import MessageThread from './MessageThread';
import ChatInputArea from './ChatInputArea';
import axiosClient from '../../api/axiosClient';

let msgId = Date.now();
const makeId = () => ++msgId;

const groupByDate = (convos) => {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now - 86400000).toDateString();
  const weekAgo = new Date(now - 7 * 86400000);
  const groups = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] };
  convos.forEach((c) => {
    const d = new Date(c.lastMessageAt);
    if (d.toDateString() === todayStr) groups.Today.push(c);
    else if (d.toDateString() === yesterdayStr) groups.Yesterday.push(c);
    else if (d >= weekAgo) groups['Last 7 Days'].push(c);
    else groups.Older.push(c);
  });
  return groups;
};

const ConversationList = ({ convos, activeId, onSelect, onNew, onDelete, loading }) => {
  const groups = groupByDate(convos);
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/5">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-sm text-gray-300 hover:text-white transition-all border border-white/[0.08] hover:border-white/20"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-sm">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {loading && (
          <div className="space-y-1.5 pt-1">
            {[70, 55, 80, 45].map((w, i) => (
              <div key={i} className="h-8 skeleton rounded-lg" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {!loading && convos.length === 0 && (
          <div className="text-center py-10 text-gray-600">
            <MessageSquare className="w-7 h-7 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No conversations yet</p>
          </div>
        )}

        {!loading && Object.entries(groups).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label}>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider px-2 pb-1 font-medium">{label}</p>
              <div className="space-y-0.5">
                {items.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => onSelect(c._id)}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all ${
                      c._id === activeId
                        ? 'bg-white/[0.08] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                    <span className="flex-1 truncate text-xs leading-tight">{c.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(c._id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-neon-red transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

const ChatView = () => {
  const [convos, setConvos] = useState([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadConvos = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/chat/conversations');
      const list = res.data.conversations;
      setConvos(list);
      return list;
    } catch {
      return [];
    } finally {
      setConvosLoading(false);
    }
  }, []);

  const selectConvo = useCallback(async (id) => {
    setActiveConvoId(id);
    setMessages([]);
    setMessagesLoading(true);
    try {
      const res = await axiosClient.get(`/api/chat/conversations/${id}/messages`);
      setMessages(res.data.messages.map((m) => ({
        id: makeId(),
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        blocked: m.blocked || false,
        fallback: m.fallback || false,
        timestamp: new Date(m.createdAt),
      })));
    } catch {
      toast.error('Failed to load conversation');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConvos().then((list) => {
      if (list.length > 0) selectConvo(list[0]._id);
    });
  }, []);

  const createNewConvo = async () => {
    try {
      const res = await axiosClient.post('/api/chat/conversations');
      const c = res.data.conversation;
      setConvos((prev) => [c, ...prev]);
      setActiveConvoId(c._id);
      setMessages([]);
    } catch {
      toast.error('Failed to create new chat');
    }
  };

  const deleteConvo = async (id) => {
    try {
      await axiosClient.delete(`/api/chat/conversations/${id}`);
      setConvos((prev) => prev.filter((c) => c._id !== id));
      if (activeConvoId === id) {
        const remaining = convos.filter((c) => c._id !== id);
        if (remaining.length > 0) selectConvo(remaining[0]._id);
        else { setActiveConvoId(null); setMessages([]); }
      }
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  const handleSend = async (question) => {
    let convoId = activeConvoId;
    if (!convoId) {
      try {
        const res = await axiosClient.post('/api/chat/conversations');
        const c = res.data.conversation;
        setConvos((prev) => [c, ...prev]);
        setActiveConvoId(c._id);
        convoId = c._id;
      } catch { toast.error('Failed to start chat'); return; }
    }

    setMessages((prev) => [...prev, { id: makeId(), role: 'user', content: question, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await axiosClient.post('/api/query', { question, conversationId: convoId });
      const data = res.data;
      setMessages((prev) => [...prev, {
        id: makeId(),
        role: 'assistant',
        content: data.blocked ? (data.error || 'Blocked.') : data.answer,
        sources: data.sources || [],
        blocked: !!data.blocked,
        fallback: !!data.fallback,
        insights: data.insights,
        timestamp: new Date(),
      }]);
      // Update title in sidebar after first message
      setConvos((prev) => prev.map((c) =>
        c._id === convoId
          ? { ...c, title: c.title === 'New Chat' ? question.slice(0, 55) : c.title, lastMessageAt: new Date() }
          : c
      ));
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error;
      if (status === 429) toast.error('Daily AI query limit reached.', { duration: 5000 });
      else if (status === 403) setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', blocked: true, content: msg || 'Request blocked.', timestamp: new Date() }]);
      else if (status === 503) toast.error("Couldn't search knowledge base — retry.");
      else toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Conversation history panel */}
      <div className="w-56 flex-shrink-0 border-r border-white/5 bg-surface-800/40 flex flex-col">
        <ConversationList
          convos={convos}
          activeId={activeConvoId}
          onSelect={selectConvo}
          onNew={createNewConvo}
          onDelete={deleteConvo}
          loading={convosLoading}
        />
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-heading font-semibold text-white">Knowledge Chat</h2>
            <p className="text-xs text-gray-500 mt-0.5">Role-filtered · Injection-protected · Source-cited</p>
          </div>
          {activeConvoId && messages.length > 0 && (
            <button
              onClick={() => deleteConvo(activeConvoId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-neon-red hover:bg-neon-red/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>

        <MessageThread messages={messages} loading={loading} historyLoading={messagesLoading} />
        <ChatInputArea onSend={handleSend} loading={loading} />
      </div>
    </div>
  );
};

export default ChatView;
