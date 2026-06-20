import React, { useState } from 'react';
import toast from 'react-hot-toast';
import MessageThread from './MessageThread';
import ChatInputArea from './ChatInputArea';
import axiosClient from '../../api/axiosClient';

let msgId = 0;
const makeId = () => ++msgId;

const ChatView = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const addMessage = (msg) => setMessages((prev) => [...prev, { id: makeId(), timestamp: new Date(), ...msg }]);

  const handleSend = async (question) => {
    addMessage({ role: 'user', content: question });
    setLoading(true);

    try {
      const res = await axiosClient.post('/api/query', { question });
      const data = res.data;

      if (data.blocked) {
        addMessage({
          role: 'assistant',
          blocked: true,
          content: data.error || 'This query was blocked by the security classifier.',
        });
      } else {
        addMessage({
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          insights: data.insights,
          fallback: data.fallback,
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error;

      if (status === 429) {
        toast.error('Daily AI query limit reached, resets at midnight UTC.', { duration: 5000 });
      } else if (status === 403) {
        addMessage({
          role: 'assistant',
          blocked: true,
          content: msg || 'Unable to verify this request right now. Please try again in a moment.',
        });
      } else if (status === 503) {
        toast.error("Couldn't search the knowledge base right now — please retry.");
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-white">Knowledge Chat</h2>
          <p className="text-xs text-gray-500 mt-0.5">Role-filtered · Injection-protected · Source-cited</p>
        </div>
      </div>

      <MessageThread messages={messages} loading={loading} />
      <ChatInputArea onSend={handleSend} loading={loading} />
    </div>
  );
};

export default ChatView;
