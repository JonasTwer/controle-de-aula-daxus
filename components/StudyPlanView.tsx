
import React, { useState, useMemo } from 'react';
// Fix: Added missing BookOpen import from lucide-react
import { ChevronDown, ChevronRight, PlayCircle, CheckCircle, Search, Filter, BookOpen } from 'lucide-react';
import { MetaGroup, Lesson } from '../types';
import { formatSecondsToHHMMSS } from '../utils';

interface StudyPlanViewProps {
  groupedCourses: MetaGroup[];
  onRegisterStudy: (lesson: Lesson) => void;
}

const StudyPlanView: React.FC<StudyPlanViewProps> = ({ groupedCourses, onRegisterStudy }) => {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return groupedCourses.map(meta => {
      const matchMeta = meta.name.toLowerCase().includes(searchLower);

      return {
        ...meta,
        modules: meta.modules.map(mod => {
          const matchMateria = mod.name.toLowerCase().includes(searchLower);

          return {
            ...mod,
            lessons: mod.lessons.filter(l => {
              const matchLesson = l.title.toLowerCase().includes(searchLower);
              const matchFilter = filter === 'all' ? true : filter === 'completed' ? l.isCompleted : !l.isCompleted;
              return (matchMeta || matchMateria || matchLesson) && matchFilter;
            })
          };
        }).filter(m => m.lessons.length > 0)
      };
    }).filter(m => m.modules.length > 0);
  }, [groupedCourses, searchTerm, filter]);

  if (groupedCourses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Nenhum plano importado</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
          Vá até a aba "Config" para importar sua lista de aulas e começar seu rastreamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-4">
      <div className="sticky top-[68px] bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-md py-2 z-10 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar meta, matéria ou aula..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendentes' },
            { id: 'completed', label: 'Concluídos' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${filter === f.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 dark:shadow-none'
                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 pb-8">
        {filteredData.map((meta) => (
          <div key={meta.name} className="space-y-4">
            <div className="flex items-center gap-2 pl-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">{meta.name}</h2>
            </div>
            <div className="space-y-4">
              {meta.modules.map((mod) => {
                const materiaId = `${meta.name}-${mod.name}`;
                const isOpen = expandedModules[materiaId] || searchTerm.length > 0;
                return (
                  <div key={materiaId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm transition-all duration-300">
                    <button
                      onClick={() => toggleModule(materiaId)}
                      className={`w-full flex items-center justify-between p-4 transition-all duration-300 ${isOpen
                        ? 'bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-1.5 rounded-lg transition-all duration-300 ${isOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">{mod.name}</h3>
                          <p className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-tighter">
                            {mod.lessons.length} aulas • {Math.round(mod.progress)}% completo
                          </p>
                        </div>
                      </div>
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${mod.progress}%` }} />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="py-2">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 px-2">
                          {mod.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="group flex items-center justify-between p-4 pl-12 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                            >
                              <div className="flex-1 min-w-0 mr-4">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium truncate transition-all duration-300 ${lesson.isCompleted
                                    ? 'text-slate-400 dark:text-slate-500 line-through opacity-60'
                                    : 'text-slate-700 dark:text-slate-200'
                                    }`}>
                                    {lesson.title}
                                  </p>
                                </div>
                                <p className={`text-[10px] font-mono mt-0.5 ${lesson.isCompleted
                                  ? 'text-slate-300 dark:text-slate-600'
                                  : 'text-slate-400'
                                  }`}>
                                  {formatSecondsToHHMMSS(lesson.durationSec)}
                                </p>
                              </div>
                              <button
                                onClick={() => onRegisterStudy(lesson)}
                                className="flex-shrink-0 p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all active:scale-90"
                              >
                                {lesson.isCompleted ? (
                                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                                ) : (
                                  <PlayCircle className="w-6 h-6" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyPlanView;
