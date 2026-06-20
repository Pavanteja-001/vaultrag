import React, { useEffect, useRef } from 'react';
import { UserMessageBubble, VaultRAGMessageBubble, SecurityAlertBubble, LoadingBubble } from './Bubbles';

const MessageThread = ({ messages, loading }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-ai flex items-center justify-center text-2xl">
            🧠
          </div>
          <h3 className="font-heading font-semibold text-white mb-2">Ask VaultRAG anything</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Query your codebase, PRDs, and architecture docs. Your role determines what you can see.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {messages.map((msg) => {
        if (msg.role === 'user') return <UserMessageBubble key={msg.id} message={msg} />;
        if (msg.blocked) return <SecurityAlertBubble key={msg.id} message={msg} />;
        return <VaultRAGMessageBubble key={msg.id} message={msg} />;
      })}
      {loading && <LoadingBubble />}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageThread;
