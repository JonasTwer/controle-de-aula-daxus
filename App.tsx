
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart2, BookOpen, MessageSquare, Settings } from 'lucide-react';
import { TabId, Lesson, StudyLog } from './types';
import DashboardView from './components/DashboardView';
import StudyPlanView from './components/StudyPlanView';
import AssistantView from './components/AssistantView';
import ConfigView from './components/ConfigView';
import RegisterModal from './components/RegisterModal';
import { supabase } from './services/supabase';
import AuthView from './components/AuthView';
import { getTodayDateString, formatSecondsToHHMM, formatDateLocal } from './utils';
import { Session } from '@supabase/supabase-js';
import UpdatePasswordView from './components/UpdatePasswordView';
import toast, { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [modalLesson, setModalLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    document.title = 'CoursePlanner AI';
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'PASSWORD_RECOVERY') setIsRecovering(true);
      if (_event === 'SIGNED_IN') setActiveTab('dashboard');
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);

    try {
      const { data: lData, error: lErr } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', session.user.id);

      if (lErr) throw lErr;

      const { data: logsData, error: logsErr } = await supabase
        .from('study_logs')
        .select('*')
        .eq('user_id', session.user.id);

      if (logsErr) throw logsErr;

      const mappedLessons = (lData || []).map(l => ({
        id: l.id,
        meta: l.meta || l.theme || 'Sem Meta',
        materia: l.materia || l.module || 'Sem Matéria',
        title: l.title || 'Aula sem título',
        durationStr: l.duration_str || '00:00:00',
        durationSec: l.duration_sec || 0,
        createdAt: l.created_at || new Date().toISOString()
      }));

      mappedLessons.sort((a, b) => {
        const metaCmp = a.meta.localeCompare(b.meta, undefined, { numeric: true, sensitivity: 'base' });
        if (metaCmp !== 0) return metaCmp;

        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        if (dateA !== dateB) return dateA - dateB;

        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      });

      const mappedLogs = (logsData || []).map(l => ({
        lessonId: l.lesson_id,
        date: l.date,
        durationSec: l.duration_sec,
        status: l.status,
        notes: l.notes || '',
        lessonTitle: l.lesson_title || ''
      }));

      setLessons(mappedLessons);
      setLogs(mappedLogs);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error(`Erro: ${error.message || 'Falha na conexão com o banco'}`);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session && !isRecovering) {
      fetchUserData();
    } else {
      setLessons([]);
      setLogs([]);
    }
  }, [session, isRecovering, fetchUserData]);

  const handleSaveCurriculum = async (incomingLessons: Lesson[]) => {
    if (!session?.user?.id) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    setIsLoading(true);

    try {
      const timestamp = new Date().getTime();

      // Tentativa 1: Novo padrão (meta/materia)
      const lessonsBatchNew = incomingLessons.map((l, idx) => ({
        id: `L-${timestamp}-${idx.toString().padStart(4, '0')}-${Math.random().toString(36).substr(2, 5)}`,
        user_id: session.user.id,
        meta: l.meta,
        materia: l.materia,
        title: l.title,
        duration_str: l.durationStr,
        duration_sec: l.durationSec
      }));

      const { error: errorNew } = await supabase.from('lessons').insert(lessonsBatchNew);

      // Se falhar porque a coluna não existe, tenta o padrão antigo (fallback)
      if (errorNew && (errorNew.message.includes('column') || errorNew.code === '42703')) {
        console.warn("Detectado schema antigo no banco. Realizando fallback para theme/module...");
        const lessonsBatchOld = incomingLessons.map((l, idx) => ({
          id: `L-${timestamp}-${idx.toString().padStart(4, '0')}-${Math.random().toString(36).substr(2, 5)}`,
          user_id: session.user.id,
          theme: l.meta,
          module: l.materia,
          title: l.title,
          duration_str: l.durationStr,
          duration_sec: l.durationSec
        }));

        const { error: errorOld } = await supabase.from('lessons').insert(lessonsBatchOld);
        if (errorOld) throw errorOld;
      } else if (errorNew) {
        throw errorNew;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchUserData();

      setActiveTab('plan');
      toast.success('Aulas adicionadas ao seu Plano de Estudo!', {
        duration: 3000,
        icon: '✅',
      });
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error(`Erro ao importar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (metaName: string) => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      // Tenta deletar usando meta e se falhar tenta usando theme
      const { error: errMeta } = await supabase.from('lessons').delete().eq('user_id', session.user.id).eq('meta', metaName);

      if (errMeta && (errMeta.message.includes('column') || errMeta.code === '42703')) {
        await supabase.from('lessons').delete().eq('user_id', session.user.id).eq('theme', metaName);
      } else if (errMeta) {
        throw errMeta;
      }

      await fetchUserData();
      toast.success('Curso excluído com sucesso!');
    } catch (error) {
      toast.error("Erro ao excluir curso.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLog = async (logData: StudyLog) => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      if (logData.status === 'completed') {
        const { error } = await supabase.from('study_logs').upsert({
          user_id: session.user.id,
          lesson_id: logData.lessonId,
          date: logData.date,
          duration_sec: logData.durationSec,
          status: 'completed',
          notes: logData.notes,
          lesson_title: logData.lessonTitle
        }, { onConflict: 'user_id,lesson_id' });

        if (error) throw error;

        await fetchUserData();
        setModalLesson(null);
        toast.success('Aula concluída com sucesso! 🎉', {
          duration: 3000,
          icon: '✅'
        });
      } else {
        const { error } = await supabase.from('study_logs').delete().eq('user_id', session.user.id).eq('lesson_id', logData.lessonId);

        if (error) throw error;

        await fetchUserData();
        setModalLesson(null);
        toast.success('Status da aula atualizado.', {
          duration: 2000
        });
      }
    } catch (error: any) {
      console.error('[ERROR] Erro em handleSaveLog:', error);
      toast.error("Erro ao salvar progresso no Plano de Estudo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!session?.user?.id) return;
    setConfirmDialog({
      message: 'ATENÇÃO: Isso apagará absolutamente TUDO de forma permanente. Confirma?',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await supabase.from('lessons').delete().eq('user_id', session.user.id);
          await fetchUserData();
          setActiveTab('dashboard');
          toast.success('Seu Plano de Estudo foi limpo.');
        } catch (error) {
          toast.error('Erro ao limpar dados.');
        } finally {
          setIsLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const processedData = useMemo(() => {
    const lessonProgress: Record<string, boolean> = {};
    logs.forEach(log => {
      if (log.status === 'completed') {
        lessonProgress[log.lessonId] = true;
      }
    });

    const enrichedLessons = lessons.map(l => ({
      ...l,
      isCompleted: !!lessonProgress[l.id]
    }));

    const totalDuration = enrichedLessons.reduce((acc, l) => acc + l.durationSec, 0);
    const totalStudied = enrichedLessons.reduce((acc, l) => acc + (l.isCompleted ? l.durationSec : 0), 0);
    const todayStr = getTodayDateString();
    const todaySeconds = logs
      .filter(l => l.date === todayStr && l.status === 'completed')
      .reduce((acc, l) => acc + (l.durationSec || 0), 0);

    const metaGroups: { name: string, modules: { name: string, lessons: Lesson[] }[] }[] = [];
    const metaIndexMap: Record<string, number> = {};
    const moduleIndexMap: Record<string, number> = {};

    enrichedLessons.forEach(l => {
      if (metaIndexMap[l.meta] === undefined) {
        metaIndexMap[l.meta] = metaGroups.length;
        metaGroups.push({ name: l.meta, modules: [] });
      }
      const mIdx = metaIndexMap[l.meta];
      const modKey = `${l.meta}|${l.materia}`;

      if (moduleIndexMap[modKey] === undefined) {
        moduleIndexMap[modKey] = metaGroups[mIdx].modules.length;
        metaGroups[mIdx].modules.push({ name: l.materia, lessons: [] });
      }
      const modIdx = moduleIndexMap[modKey];
      metaGroups[mIdx].modules[modIdx].lessons.push(l);
    });

    metaGroups.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const grouped = metaGroups.map(meta => ({
      ...meta,
      modules: meta.modules.map(mod => {
        const mDur = mod.lessons.reduce((acc, l) => acc + (l.durationSec || 0), 0);
        const mStud = mod.lessons.reduce((acc, l) => acc + (l.isCompleted ? (l.durationSec || 0) : 0), 0);
        return {
          name: mod.name,
          lessons: mod.lessons,
          progress: mDur > 0 ? (mStud / mDur) * 100 : 0
        };
      })
    }));

    const completedDates = new Set(logs.filter(l => l.status === 'completed').map(l => l.date));
    let streak = 0;
    let checkDate = new Date();
    if (!completedDates.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1);
    for (let i = 0; i < 1000; i++) {
      const dStr = formatDateLocal(checkDate);
      if (completedDates.has(dStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }

    return {
      grouped,
      stats: {
        totalDuration, totalStudied, percentage: totalDuration > 0 ? Math.round((totalStudied / totalDuration) * 100) : 0,
        totalDurationFormatted: formatSecondsToHHMM(totalDuration),
        totalStudiedFormatted: formatSecondsToHHMM(totalStudied),
        remainingFormatted: formatSecondsToHHMM(Math.max(0, totalDuration - totalStudied)),
        completedCount: enrichedLessons.filter(l => l.isCompleted).length,
        remainingCount: enrichedLessons.filter(l => !l.isCompleted).length,
        streak, todayFormatted: formatSecondsToHHMM(todaySeconds)
      },
      pendingLessons: enrichedLessons.filter(l => !l.isCompleted)
    };
  }, [lessons, logs]);

  if (isRecovering) return <UpdatePasswordView />;
  if (!session) return <AuthView />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-3">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg"><BookOpen className="w-5 h-5 text-white" /></div>
            <h1 className="font-bold text-lg">CoursePlanner <span className="text-indigo-500">AI</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bem-vindo</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{session.user.user_metadata?.full_name || 'Usuário'}</p>
            </div>
            <img src={session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`} alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-500 object-cover" />
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-sm font-bold text-slate-700 dark:text-white">Processando...</p>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto pb-24 p-4">
        {activeTab === 'dashboard' && <DashboardView stats={processedData.stats} logs={logs} />}
        {activeTab === 'plan' && <StudyPlanView groupedCourses={processedData.grouped} onRegisterStudy={setModalLesson} />}
        {activeTab === 'assistant' && <AssistantView contextData={processedData} />}
        {activeTab === 'config' && (
          <ConfigView
            onSaveData={handleSaveCurriculum}
            onClearData={handleClearAllData}
            onDeleteCourse={handleDeleteCourse}
            lessons={lessons}
            currentDataCount={lessons.length}
            logs={logs}
            userMetadata={session.user.user_metadata}
            userEmail={session.user.email}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 z-30">
        <div className="max-w-3xl mx-auto flex justify-around">
          {[
            { id: 'dashboard', icon: BarChart2, label: 'Resumo' },
            { id: 'plan', icon: BookOpen, label: 'Aulas' },
            { id: 'assistant', icon: MessageSquare, label: 'Mentor' },
            { id: 'config', icon: Settings, label: 'Config' }
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id as TabId)} className={`flex flex-col items-center py-3 px-4 w-full transition-all ${activeTab === t.id ? 'text-indigo-600' : 'text-slate-400'}`}>
              <t.icon className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-bold uppercase">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {modalLesson && <RegisterModal lesson={modalLesson} onClose={() => setModalLesson(null)} onSave={handleSaveLog} />}

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confirmar Ação</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDialog.onConfirm()}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
