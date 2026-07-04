'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getInitials } from '@/lib/utils';
import { Send, Sparkles, Bot, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED = [
  'How many leaves do I have?',
  'Show my attendance this month',
  'When is salary credited?',
  'Apply casual leave tomorrow',
  'What are the company holidays?',
  'Explain the leave policy',
];

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const message = text || input.trim();
    if (!message || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiApi.chat({ message, history });
      const reply = res.data.data.reply;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      toast.error('AI Assistant is currently unavailable');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-10rem)] flex flex-col">
      {/* Header */}
      <div className="page-header flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="gradient-bg rounded-2xl w-12 h-12 flex items-center justify-center">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">NexusAI Assistant</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="status-dot online" />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Online · Powered by AI</p>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="btn-ghost flex items-center gap-2 text-sm" onClick={clearChat}>
            <RefreshCw size={14} /> Clear
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto glass-card p-6 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="gradient-bg rounded-3xl w-20 h-20 flex items-center justify-center mb-6"
            >
              <Bot size={40} className="text-white" />
            </motion.div>
            <h2 className="text-2xl font-800 mb-2" style={{ color: 'var(--text-primary)' }}>
              Hi {user?.name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              I&apos;m your AI HR Assistant. Ask me anything about leaves, attendance, payroll, or company policies.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTED.map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded-xl text-sm transition-smooth"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Zap size={12} className="inline mr-2" style={{ color: '#818cf8' }} />
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {msg.role === 'assistant' ? (
                      <div className="gradient-bg rounded-xl w-8 h-8 flex items-center justify-center">
                        <Sparkles size={14} className="text-white" />
                      </div>
                    ) : (
                      <div className="avatar text-xs" style={{ width: 32, height: 32 }}>
                        {user?.avatar
                          ? <img src={user.avatar} className="avatar" style={{ width: 32, height: 32 }} alt="" />
                          : getInitials(user?.name || 'U')
                        }
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    <p className="text-[10px] mt-1.5 opacity-60">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="gradient-bg rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="chat-bubble-ai flex items-center gap-1 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: 'var(--text-muted)' }}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, delay: i * 0.2, duration: 0.6 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input-field flex-1"
            placeholder="Ask anything about HR, leaves, attendance, payroll..."
            disabled={loading}
          />
          <motion.button
            type="submit"
            disabled={loading || !input.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary px-4 flex-shrink-0"
          >
            <Send size={16} />
          </motion.button>
        </form>
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          NexusAI may not always be accurate. Verify important information with your HR team.
        </p>
      </div>
    </div>
  );
}
