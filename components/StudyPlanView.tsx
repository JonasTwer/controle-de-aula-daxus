
import React, { useState, useMemo } from 'react';
import { PlayCircle, CheckCircle, Search, BookOpen } from 'lucide-react';
import { MetaGroup, Lesson } from '../types';
import { formatSecondsToHHMMSS } from '../utils';

interface StudyPlanViewProps {
  groupedCourses: MetaGroup[];
  onRegisterStudy: (lesson: Lesson) => void;
}

const StudyPlanView: React.FC<StudyPlanViewProps> = ({ groupedCourses, onRegisterStudy }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Flatten lessons from groupedCourses, preserving insertion order
  const flattenedData = useMemo(() => {
    return groupedCourses.map(meta => {
      // Collect all lessons from all modules under this meta
      const allLessons: Lesson[] = [];
      meta.modules.forEach(mod => {
        allLessons.push(...mod.lessons);
      });

      // Sort by createdAt to maintain insertion order
      // If createdAt is not available, maintain the current order
      allLessons.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return 0;
      });

      return {
        name: meta.name,
        lessons: allLessons,
        totalLessons: allLessons.length,
        completedCount: allLessons.filter(l => l.isCompleted).length,
        progress: allLessons.length > 0
          ? (allLessons.filter(l => l.isCompleted).length / allLessons.length) * 100
          : 0
      };
    });
  }, [groupedCourses]);

  // Apply search and filter
  const filteredData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return flattenedData.map(meta => {
      const matchMeta = meta.name.toLowerCase().includes(searchLower);

      return {
        ...meta,
        lessons: meta.lessons.filter(l => {
          const matchLesson = l.title.toLowerCase().includes(searchLower) ||
            l.materia.toLowerCase().includes(searchLower);
          const matchFilter = filter === 'all' ? true : filter === 'completed' ? l.isCompleted : !l.isCompleted;
          return (matchMeta || matchLesson) && matchFilter;
        })
      };
    }).filter(m => m.lessons.length > 0);
  }, [flattenedData, searchTerm, filter]);

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
      {/* Search and Filter Controls */}
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

      {/* Meta Groups with Linear Lesson Lists */}
      <div className="space-y-8 pb-8">
        {filteredData.map((meta) => (
          <div key={meta.name} className="space-y-4">
            {/* Meta Header */}
            <div className="flex items-center justify-between pl-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                {meta.name}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium text-slate-400">
                  {meta.completedCount}/{meta.totalLessons} • {Math.round(meta.progress)}%
                </span>
                <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${meta.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Linear Lesson List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {meta.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="group flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3">
                        {/* Lesson Number/Index */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${lesson.isCompleted
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Lesson Title */}
                          <p className={`text-sm font-medium truncate transition-all duration-300 ${lesson.isCompleted
                              ? 'text-slate-400 dark:text-slate-500 line-through opacity-60'
                              : 'text-slate-700 dark:text-slate-200'
                            }`}>
                            {lesson.title}
                          </p>

                          {/* Lesson Metadata */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${lesson.isCompleted
                                ? 'text-slate-300 dark:text-slate-600'
                                : 'text-indigo-500 dark:text-indigo-400'
                              }`}>
                              {lesson.materia}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <p className={`text-[10px] font-mono ${lesson.isCompleted
                                ? 'text-slate-300 dark:text-slate-600'
                                : 'text-slate-400'
                              }`}>
                              {formatSecondsToHHMMSS(lesson.durationSec)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => onRegisterStudy(lesson)}
                      className="flex-shrink-0 p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all active:scale-90"
                      title={lesson.isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyPlanView;
