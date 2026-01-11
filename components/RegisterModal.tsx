
import React, { useState } from 'react';
import { X, Calendar, CheckCircle, FileText } from 'lucide-react';
import { Lesson, StudyLog } from '../types';
import { getTodayDateString } from '../utils';

interface RegisterModalProps {
  lesson: Lesson;
  onClose: () => void;
  onSave: (log: StudyLog) => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ lesson, onClose, onSave }) => {
  const [date, setDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      date,
      durationSec: isComplete ? lesson.durationSec : 0,
      status: isComplete ? 'completed' : 'in_progress',
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="p-8 bg-indigo-600 text-white relative">
          <button onClick={onClose} className="absolute right-6 top-6 p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{lesson.module}</span>
          </div>
          <h3 className="text-xl font-black tracking-tight leading-tight">{lesson.title}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Data de Estudo
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-3 h-3" /> Notas / Observações
              </label>
              <textarea
                className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Ex: Tive dúvida na parte de hooks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsComplete(!isComplete)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isComplete
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-300'
                }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className={`w-6 h-6 ${isComplete ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span className="text-sm font-bold">Marcar como Concluída</span>
              </div>
              {isComplete && <span className="text-[10px] font-black uppercase">Pronto</span>}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-500 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
