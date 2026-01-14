
import React, { useState, useMemo } from 'react';
import { PlayCircle, CheckCircle, Search, BookOpen, Eraser } from 'lucide-react';
import { MetaGroup, Lesson } from '../types';
import { formatSecondsToHHMMSS } from '../utils';

interface StudyPlanViewProps {
  groupedCourses: MetaGroup[];
  onRegisterStudy: (lesson: Lesson) => void;
}

// Função auxiliar para normalizar texto (remover acentos e tornar lowercase)
const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const StudyPlanView: React.FC<StudyPlanViewProps> = ({ groupedCourses, onRegisterStudy }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedMeta, setSelectedMeta] = useState<string>('all');
  const [selectedMateria, setSelectedMateria] = useState<string>('all');

  // Verify active filters for the Clear Filters button
  const hasActiveFilters = filter !== 'all' || selectedMeta !== 'all' || selectedMateria !== 'all';

  const handleClearFilters = () => {
    setFilter('all');
    setSelectedMeta('all');
    setSelectedMateria('all');
    setSearchTerm('');
  };

  // 1. Dados Base achatados (Flattened)
  const flattenedData = useMemo(() => {
    return groupedCourses.map(meta => {
      const allLessons: Lesson[] = [];
      meta.modules.forEach(mod => {
        allLessons.push(...mod.lessons);
      });

      // Ordenação: Criação (se disponível) ou Ordem original
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

  // 2. Passo A (Base): Filtrar por Status PRIMEIRO
  // Isso gera o universo de dados válido para o status selecionado
  const statusFilteredData = useMemo(() => {
    return flattenedData.map(meta => ({
      ...meta,
      lessons: meta.lessons.filter(l => {
        if (filter === 'all') return true;
        return filter === 'completed' ? l.isCompleted : !l.isCompleted;
      })
    })).filter(meta => meta.lessons.length > 0); // Remove Metas que ficaram vazias
  }, [flattenedData, filter]);

  // 3. Lógica de Filtragem Bidirecional (Cross-Filtering)
  // Calcula opções disponíveis para os Dropdowns baseado no Status + O Outro Filtro
  const { availableMetas, availableMaterias } = useMemo(() => {
    const metas = new Set<string>();
    const materias = new Set<string>();

    // A. Opções de META disponíveis
    // Devem considerar: Dados do Status Atual + Matéria Selecionada (se houver)
    statusFilteredData.forEach(meta => {
      // Verifica se esta meta tem aulas compatíveis com a matéria selecionada
      const hasMatchingLessons = selectedMateria === 'all' || meta.lessons.some(l => l.materia === selectedMateria);

      if (hasMatchingLessons) {
        metas.add(meta.name);
      }
    });

    // B. Opções de MATÉRIA disponíveis
    // Devem considerar: Dados do Status Atual + Meta Selecionada (se houver)
    statusFilteredData.forEach(meta => {
      // Se uma meta específica está selecionada, ignorar as outras
      if (selectedMeta === 'all' || meta.name === selectedMeta) {
        meta.lessons.forEach(l => {
          // Aqui não precisamos filtrar por matéria, pois queremos saber todas as matérias disponíveis DENTRO desta meta/status
          materias.add(l.materia);
        });
      }
    });

    return {
      availableMetas: Array.from(metas).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      ),
      availableMaterias: Array.from(materias).sort()
    };
  }, [statusFilteredData, selectedMeta, selectedMateria]);

  // 4. Reset de Segurança
  // Se a opção selecionada não for mais válida (ex: mudou status e a matéria sumiu), resetar
  // Usamos useMemo para detectar a mudança, mas o set deve ser em efeito ou render direto.
  // Evitando loop: só reseta se o valor atual não for 'all' e não estiver na lista
  if (selectedMeta !== 'all' && !availableMetas.includes(selectedMeta)) {
    setSelectedMeta('all');
  }
  if (selectedMateria !== 'all' && !availableMaterias.includes(selectedMateria)) {
    setSelectedMateria('all');
  }

  // 5. Filtragem Final para Exibição
  // Aplica TODOS os filtros combinados (Status + Meta + Matéria + Busca)
  const filteredData = useMemo(() => {
    const searchNormalized = normalizeText(searchTerm);

    return statusFilteredData
      .filter(meta => selectedMeta === 'all' || meta.name === selectedMeta)
      .map(meta => {
        const filteredLessons = meta.lessons.filter(l => {
          // Filtro de Matéria
          const matchMateria = selectedMateria === 'all' || l.materia === selectedMateria;

          // Busca Inteligente
          const matchSearch = searchNormalized === '' ||
            normalizeText(l.title).includes(searchNormalized) ||
            normalizeText(l.materia).includes(searchNormalized) ||
            normalizeText(meta.name).includes(searchNormalized);

          return matchMateria && matchSearch;
        });

        return {
          ...meta,
          lessons: filteredLessons
        };
      })
      .filter(meta => meta.lessons.length > 0);
  }, [statusFilteredData, searchTerm, selectedMeta, selectedMateria]);

  if (groupedCourses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Nenhum plano importado</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
          Vá até a aba "Config" para importar sua lista de aulas e começar seu planejamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-4">
      {/* Modern Toolbar with Hybrid Layout - Sticky com Offset Correto */}
      <div className="sticky top-16 py-4 z-40 space-y-4" style={{ backgroundColor: '#0f172a' }}>
        {/* 1. Smart Search Bar (Largura Total) */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar meta, matéria ou aula..."
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all dark:text-white text-sm font-medium placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 2. Hybrid Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Esquerda: Status Pills */}
          <div className="flex p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm w-fit">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'completed', label: 'Concluídos' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === f.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Direita: Refinement Dropdowns (Selects) + Clear Button */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Meta Filter */}
            <div className="relative flex-1 min-w-[140px]">
              <select
                value={selectedMeta}
                onChange={(e) => setSelectedMeta(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-300 transition-all truncate"
              >
                <option value="all">Todas as Metas</option>
                {availableMetas.map(meta => (
                  <option key={meta} value={meta}>{meta}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Materia Filter */}
            <div className="relative flex-1 min-w-[140px]">
              <select
                value={selectedMateria}
                onChange={(e) => setSelectedMateria(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-300 transition-all truncate"
              >
                <option value="all">Todas as Matérias</option>
                {availableMaterias.map(materia => (
                  <option key={materia} value={materia}>{materia}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Clear Filters Button (Conditional) */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all whitespace-nowrap animate-in fade-in slide-in-from-right-4"
                title="Limpar todos os filtros"
              >
                <Eraser className="w-4 h-4" />
                <span className="hidden sm:inline">Limpar</span>
                <span className="sm:hidden">Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meta Groups - Estrutura Reestruturada para Sticky Mobile */}
      <div className="space-y-8 pb-8">
        {filteredData.map((meta) => (
          <div key={meta.name} className="space-y-4">
            {/* Meta Header - Sticky (Responsivo: mobile 64px, desktop 208px) */}
            <div
              className="sticky top-[112px] md:top-[203px] z-30 -mx-4 px-8 py-4 mb-4 flex items-center justify-between w-full rounded-b-2xl bg-[#0f172a]"
              
            >
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
            <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {meta.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="group flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Container principal com items-center para centralização vertical */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                      {/* Lesson Number/Index - Vertically Centered */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all z-10 ${lesson.isCompleted
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                        {index + 1}
                      </div>

                      {/* Container de texto com gap para espaçamento entre linhas */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        {/* Materia (Superior - Hierarquia Invertida) */}
                        <p className={`text-[11px] font-extrabold uppercase tracking-wider transition-all duration-300 leading-tight ${lesson.isCompleted
                          ? 'text-slate-300 dark:text-slate-600 line-through opacity-60'
                          : 'text-indigo-500 dark:text-indigo-400'
                          }`}>
                          {lesson.materia}
                        </p>

                        {/* Lesson Title (Inferior - Texto Secundário com fonte Inter Regular) */}
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-normal truncate transition-all duration-300 leading-snug ${lesson.isCompleted
                              ? 'text-slate-400 dark:text-slate-500 line-through opacity-60'
                              : 'text-slate-600 dark:text-slate-400'
                              }`}
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {lesson.title}
                          </p>
                          <span className="text-slate-300 dark:text-slate-700 flex-shrink-0 text-xs">•</span>
                          <p className={`text-[10px] font-mono flex-shrink-0 ${lesson.isCompleted
                            ? 'text-slate-300 dark:text-slate-600'
                            : 'text-slate-400 dark:text-slate-500'
                            }`}>
                            {formatSecondsToHHMMSS(lesson.durationSec)}
                          </p>
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
