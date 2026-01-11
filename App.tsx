
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2, BookOpen, MessageSquare, Settings, Layout
} from 'lucide-react';
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

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [modalLesson, setModalLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data from Supabase when session changes
  useEffect(() => {
    if (session) {
      fetchUserData();
      setActiveTab('dashboard'); // Always open on Dashboard after login/refresh
    } else {
      setLessons([]);
      setLogs([]);
    }
  }, [session]);

  const fetchUserData = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('created_at', { ascending: true });

      if (lessonsError) throw lessonsError;

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('study_logs')
        .select('*')
        .order('created_at', { ascending: true });

      if (logsError) throw logsError;

      // Transform duration_str/duration_sec as they are named differently in DB vs Types if I customized them
      // But I used snake_case in DB and camelCase in TS. I should probably map them.
      // Wait, in migration I used theme, module, title, duration_str, duration_sec.
      // In TS types I have id, theme, module, title, durationStr, durationSec.

      const mappedLessons: Lesson[] = (lessonsData || []).map(l => ({
        id: l.id,
        theme: l.theme,
        module: l.module,
        title: l.title,
        durationStr: l.duration_str,
        durationSec: l.duration_sec
      }));

      const mappedLogs: StudyLog[] = (logsData || []).map(l => ({
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
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCurriculum = async (newLessons: Lesson[]) => {
    if (!session?.user?.id) return;
    setIsLoading(true);

    try {
      // First, clear existing lessons for this user (Cascade will delete logs)
      await supabase.from('lessons').delete().eq('user_id', session.user.id);

      // Prepare data for insert
      const toInsert = newLessons.map(l => ({
        id: l.id,
        user_id: session.user.id,
        theme: l.theme,
        module: l.module,
        title: l.title,
        duration_str: l.durationStr,
        duration_sec: l.durationSec
      }));

      const { error } = await supabase.from('lessons').insert(toInsert);
      if (error) throw error;

      setLessons(newLessons);
      setLogs([]); // Logs are deleted by cascade
      setActiveTab('plan');
    } catch (error) {
      console.error('Error saving curriculum:', error);
      alert('Erro ao salvar plano de estudos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLog = async (logData: StudyLog) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase.from('study_logs').upsert({
        user_id: session.user.id,
        lesson_id: logData.lessonId,
        date: logData.date,
        duration_sec: logData.durationSec,
        status: logData.status,
        notes: logData.notes,
        lesson_title: logData.lessonTitle
      }, { onConflict: 'user_id,lesson_id,date' }); // Assuming we want one log per lesson/day or just unique lesson_id

      if (error) throw error;

      // Update local state
      setLogs(prev => {
        const filtered = prev.filter(l => l.lessonId !== logData.lessonId);
        return [...filtered, logData];
      });
      setModalLesson(null);
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  const handleClearAllData = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);

    try {
      // Cascade delete handles logs when lessons are deleted
      await supabase.from('lessons').delete().eq('user_id', session.user.id);

      setLessons([]);
      setLogs([]);
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Error clearing data:', error);
    } finally {
      setIsLoading(false);
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
    const completedCount = enrichedLessons.filter(l => l.isCompleted).length;

    const todayStr = getTodayDateString();
    const todaySeconds = logs
      .filter(l => l.date === todayStr && l.status === 'completed')
      .reduce((acc, l) => acc + l.durationSec, 0);

    const pendingLessons = enrichedLessons.filter(l => !l.isCompleted);

    // Grouping
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
        return {
          name: mName,
          lessons: mLessons,
          progress: mDur > 0 ? (mStud / mDur) * 100 : 0
        };
      })
    }));

    // Streak Calculation
    const completedDates = new Set(
      logs.filter(l => l.status === 'completed').map(l => l.date)
    );

    let streak = 0;
    let checkDate = new Date();
    const today = getTodayDateString();

    if (!completedDates.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 1000; i++) {
      const dStr = formatDateLocal(checkDate);
      if (completedDates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      grouped,
      stats: {
        totalDuration,
        totalStudied,
        totalDurationFormatted: formatSecondsToHHMM(totalDuration),
        totalStudiedFormatted: formatSecondsToHHMM(totalStudied),
        remainingFormatted: formatSecondsToHHMM(Math.max(0, totalDuration - totalStudied)),
        remainingCount: pendingLessons.length,
        percentage: totalDuration > 0 ? Math.round((totalStudied / totalDuration) * 100) : 0,
        completedCount,
        streak,
        todayFormatted: formatSecondsToHHMM(todaySeconds)
      },
      pendingLessons
    };
  }, [lessons, logs]);

  if (!session) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">StudyTracker <span className="text-indigo-500 font-normal">AI</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Bem-vindo</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">
                {session.user.user_metadata?.full_name || 'Usuário'}
              </p>
            </div>
            <img
              src={session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`}
              alt="Avatar"
              className="w-10 h-10 rounded-full border-2 border-indigo-500 shadow-sm object-cover object-center"
            />
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="fixed inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto pb-24 p-4">
        {activeTab === 'dashboard' && (
          <DashboardView stats={processedData.stats} logs={logs} />
        )}
        {activeTab === 'plan' && (
          <StudyPlanView
            groupedCourses={processedData.grouped}
            onRegisterStudy={setModalLesson}
          />
        )}
        {activeTab === 'assistant' && (
          <AssistantView contextData={processedData} />
        )}
        {activeTab === 'config' && (
          <ConfigView
            onSaveData={handleSaveCurriculum}
            onClearData={handleClearAllData}
            lessons={lessons}
            currentDataCount={lessons.length}
            logs={logs}
            userMetadata={session.user.user_metadata}
            userEmail={session.user.email}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 z-30 shadow-2xl">
        <div className="max-w-3xl mx-auto flex justify-around items-center">
          {[
            { id: 'dashboard', icon: BarChart2, label: 'Resumo' },
            { id: 'plan', icon: BookOpen, label: 'Aulas' },
            { id: 'assistant', icon: MessageSquare, label: 'Mentor' },
            { id: 'config', icon: Settings, label: 'Config' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex flex-col items-center justify-center py-3 px-4 w-full transition-all relative ${activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              {activeTab === tab.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-indigo-600 rounded-b-full"></div>
              )}
              <tab.icon className={`w-6 h-6 mb-1 ${activeTab === tab.id ? 'fill-indigo-50 dark:fill-indigo-900/20' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {modalLesson && (
        <RegisterModal
          lesson={modalLesson}
          onClose={() => setModalLesson(null)}
          onSave={handleSaveLog}
        />
      )}
    </div>
  );
};

export default App;
