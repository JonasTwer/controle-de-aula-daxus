
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import { getStudyAdvice } from '../services/groqService';

interface AssistantViewProps {
  contextData: any;
}

const AssistantView: React.FC<AssistantViewProps> = ({ contextData }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Olá! Sou seu mentor de estudos. Como posso ajudar você hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const contextStr = `
      - Progresso: ${contextData.stats.percentage}%
      - Horas estudadas: ${contextData.stats.totalStudiedFormatted}
      - Horas restantes: ${contextData.stats.remainingFormatted}
      - Streak: ${contextData.stats.streak} dias
      - Próximas aulas: ${contextData.pendingLessons.slice(0, 3).map((l: any) => `${l.materia}: ${l.title} (${l.meta})`).join(', ')}
    `;

    const response = await getStudyAdvice(userMsg, contextStr);
    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setLoading(false);
  };

  const suggestions = [
    "O que estudar agora?",
    "Me dê dicas de motivação",
    "Sugira um cronograma",
    "Como melhorar meu rendimento?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] animate-in fade-in duration-500">
      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4 pt-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl text-sm shadow-sm ${msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none'
              }`}>
              <div className="flex items-center gap-2 mb-1.5">
                {msg.role === 'user' ? <User className="w-3 h-3 opacity-60" /> : <Sparkles className="w-3 h-3 text-indigo-500" />}
                <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">
                  {msg.role === 'user' ? 'Você' : 'CoursePlanner AI'}
                </span>
              </div>
              <p className="leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl rounded-bl-none shadow-sm flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">Mentor está pensando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-lg">
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); }}
              className="whitespace-nowrap px-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-tight rounded-full border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Pergunte ao mentor..."
            className="flex-1 bg-slate-50 dark:bg-slate-700/50 border-0 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-indigo-600 p-3 rounded-2xl text-white hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all shadow-md shadow-indigo-100 dark:shadow-none active:scale-90"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantView;
