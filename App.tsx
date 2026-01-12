
import React, { useState, useEffect, useMemo } from 'react';
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

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [modalLesson, setModalLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

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

  useEffect(() => {
    if (session && !isRecovering) {
      fetchUserData();
    } else {
      setLessons([]);
      setLogs([]);
    }
  }, [session, isRecovering]);

  const fetchUserData = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);

    console.log("========================================");
    console.log("INICIANDO FETCH DE DADOS DO BANCO");
    console.log("User ID:", session.user.id);
    console.log("========================================");

    try {
      const { data: lData, error: lErr } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (lErr) throw lErr;

      const { data: logsData, error: logsErr } = await supabase
        .from('study_logs')
        .select('*')
        .eq('user_id', session.user.id);

      if (logsErr) throw logsErr;

      const mappedLessons = (lData || []).map(l => ({
        id: l.id,
        theme: l.theme,
        module: l.module,
        title: l.title,
        durationStr: l.duration_str,
        durationSec: l.duration_sec
      }));

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
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert('Erro ao carregar dados do banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCurriculum = async (incomingLessons: Lesson[]) => {
    if (!session?.user?.id) {
      alert('Sessão expirada!');
      return;
    }



    setIsLoading(true);

    try {
      // Passo 1: Preparar dados
      const timestamp = new Date().getTime();
      const lessonsToInsert = incomingLessons.map((l, idx) => ({
        id: `L-${timestamp}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        user_id: session.user.id,
        theme: l.theme,
        module: l.module,
        title: l.title,
        duration_str: l.durationStr,
        duration_sec: l.durationSec
      }));

      // Passo 2: INSERIR NO BANCO (SEM DELETE!)
      const { data: insertData, error: insertErr } = await supabase
        .from('lessons')
        .insert(lessonsToInsert)
        .select();

      if (insertErr) {
        throw new Error(`Falha ao inserir: ${insertErr.message}`);
      }

      // Passo 3: BUSCAR TUDO DE NOVO
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchUserData();

      setActiveTab('plan');
      alert('✅ SUCESSO! As aulas foram adicionadas ao seu plano.');
    } catch (error: any) {
      console.error("Erro na importação:", error);
      alert(`❌ Erro ao importar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseName: string) => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      await supabase.from('lessons').delete().eq('user_id', session.user.id).eq('theme', courseName);
      await fetchUserData();
    } catch (error) {
      alert("Erro ao excluir curso.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLog = async (logData: StudyLog) => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      if (logData.status === 'completed') {
        await supabase.from('study_logs').upsert({
          user_id: session.user.id,
          lesson_id: logData.lessonId,
          date: logData.date,
          duration_sec: logData.durationSec,
          status: 'completed',
          notes: logData.notes,
          lesson_title: logData.lessonTitle
        }, { onConflict: 'user_id,lesson_id' });
      } else {
        await supabase.from('study_logs').delete().eq('user_id', session.user.id).eq('lesson_id', logData.lessonId);
      }
      await fetchUserData();
      setModalLesson(null);
    } catch (error) {
      alert("Erro ao salvar progresso.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!session?.user?.id) return;
    if (confirm("ATENÇÃO: Isso apagará absolutamente TUDO de forma permanente. Confirma?")) {
      setIsLoading(true);
      try {
        await supabase.from('lessons').delete().eq('user_id', session.user.id);
        await fetchUserData();
        setActiveTab('dashboard');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const processedData = useMemo(() => {
    const lessonProgress: Record<string, boolean> = {};
    logs.forEach(log => {
      if (log.status === 'completed') lessonProgress[log.lessonId] = true;
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
      .reduce((acc, l) => acc + l.durationSec, 0);

    const themesMap: Record<string, Record<string, Lesson[]>> = {};
    enrichedLessons.forEach(l => {
      if (!themesMap[l.theme]) themesMap[l.theme] = {};
      if (!themesMap[l.theme][l.module]) themesMap[l.theme][l.module] = [];
      themesMap[l.theme][l.module].push(l);
    });

    const grouped = Object.keys(themesMap).map(themeName => ({
      name: themeName,
      modules: Object.keys(themesMap[themeName]).map(mName => {
        const mLessons = themesMap[themeName][mName];
        const mDur = mLessons.reduce((acc, l) => acc + l.durationSec, 0);
        const mStud = mLessons.reduce((acc, l) => acc + (l.isCompleted ? l.durationSec : 0), 0);
        return { name: mName, lessons: mLessons, progress: mDur > 0 ? (mStud / mDur) * 100 : 0 };
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
    </div>
  );
};

export default App;
