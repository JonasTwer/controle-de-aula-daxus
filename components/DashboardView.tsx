
import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip
} from 'recharts';
import {
  TrendingUp, Clock, Zap, Hourglass, Target, GraduationCap,
  History, CheckCircle2, Circle, Flag
} from 'lucide-react';
import { AppStats, StudyLog } from '../types';
import { formatDateLocal } from '../utils';
import { SmartForecastEngine, calculateWeight } from '../utils/SmartForecastEngine';

interface DashboardViewProps {
  stats: AppStats;
  logs: StudyLog[];
}

// Função para formatar minutos em formato "Xh Ymin" ou "Xmin"
const formatMinutesToReadable = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const minutes = payload[0].value;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">
          Tempo Estudado
        </p>
        <p className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
          {formatMinutesToReadable(minutes)}
        </p>
      </div>
    );
  }
  return null;
};

const DashboardView: React.FC<DashboardViewProps> = ({ stats, logs }) => {
  // Filtering only completed logs and sorting to get the 5 most recent activities
  const recentActivity = logs
    .filter(log => log.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const pieData = [
    { name: 'Concluído', value: stats.completedCount, color: '#6366f1' },
    { name: 'Pendente', value: stats.remainingCount, color: '#e2e8f0' }
  ];

  // Daily Chart (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = formatDateLocal(d);
    const mins = logs
      .filter(l => l.date === dStr && l.status === 'completed')
      .reduce((acc, l) => acc + ((l.durationSec || 0) / 60), 0);
    return {
      name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      minutes: Math.round(mins)
    };
  });

  // ⚠️ V3.0: Calcular previsão de conclusão com Smart Forecast Engine (Créditos de Esforço)
  const getCompletionForecast = (): string => {
    // Se não há aulas restantes, retorna completo
    if (stats.remainingCount === 0) {
      return '✓ Completo';
    }

    // Filtra apenas logs completados com duração válida
    const completedLogs = logs.filter(l => l.status === 'completed' && (l.durationSec || 0) > 0);

    if (completedLogs.length === 0) {
      return '---';
    }

    // 1. PREPARAÇÃO DOS DADOS
    const firstCompletedDate = completedLogs
      .map(l => new Date(l.date + 'T00:00:00'))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const today = new Date();
    const daysActive = Math.max(
      1,
      Math.ceil((today.getTime() - firstCompletedDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // 2. ⚠️ V3.0: CÁLCULO DE CRÉDITOS DE ESFORÇO (não contagem de aulas!)
    // Regra: Crédito = Duração em Minutos / 15
    // Exemplo: 15 min = 1.0 crédito; 3h (180 min) = 12.0 créditos

    // 2A. Soma dos créditos das aulas CONCLUÍDAS
    const completedCredits = completedLogs.reduce((sum, log) => {
      const durationMinutes = (log.durationSec || 0) / 60;
      const credit = calculateWeight(durationMinutes);
      return sum + credit;
    }, 0);

    // 2B. Soma dos créditos das aulas RESTANTES
    // Precisamos acessar todas as lessons (não apenas os logs) para calcular créditos restantes
    // Vamos criar um Set de IDs das aulas completas para filtrar
    const completedLessonIds = new Set(completedLogs.map(log => log.lessonId));

    // Note: Precisamos das lessons originais, que não estão disponíveis diretamente no Dashboard
    // mas podemos inferir pelos logs e stats
    // WORKAROUND: Usa stats.remainingCount como aproximação inicial
    // Isso será ajustado quando passarmos 'lessons' como prop ou contexto

    // Por enquanto, vamos usar uma abordagem simplificada:
    // Assumir que aulas restantes têm crédito médio das aulas completadas
    const avgCreditPerLesson = completedCredits / completedLogs.length;
    const remainingCredits = avgCreditPerLesson * stats.remainingCount;

    // 3. PREPARAR HISTÓRICO DOS ÚLTIMOS DIAS (Créditos por dia)
    const recentDailyProgress: number[] = [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return formatDateLocal(d);
    });

    // Calcula CRÉDITOS ACUMULADOS por dia (não contagem!)
    last7Days.forEach(dateStr => {
      const dailyCredits = completedLogs
        .filter(l => l.date === dateStr)
        .reduce((sum, log) => {
          const durationMinutes = (log.durationSec || 0) / 60;
          return sum + calculateWeight(durationMinutes);
        }, 0);
      recentDailyProgress.push(dailyCredits);
    });

    // 4. APLICAR SMART FORECAST ENGINE V3.0 (Bayes + Mediana + EWMA com Créditos)
    // Recupera velocidade EWMA anterior do localStorage (para continuidade)
    const storedEwmaKey = 'forecast_ewma_velocity';
    const previousEwmaVelocity = localStorage.getItem(storedEwmaKey)
      ? parseFloat(localStorage.getItem(storedEwmaKey)!)
      : undefined;

    const { date, phase, velocity } = SmartForecastEngine.quickForecast(
      completedCredits,      // ✅ V3.0: CRÉDITOS concluídos (não contagem!)
      remainingCredits,      // ✅ V3.0: CRÉDITOS restantes (não contagem!)
      daysActive,
      recentDailyProgress,   // ✅ Array de [créditos/dia] dos últimos 7 dias
      previousEwmaVelocity   // ✅ Ativa continuidade do EWMA
    );

    // Salva nova velocidade EWMA para próxima execução (se estiver em fase madura)
    if (phase === 'MATURITY') {
      localStorage.setItem(storedEwmaKey, velocity.toString());
    }

    // 5. RETORNAR DATA FORMATADA
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. TOPO: CARDS DE MÉTRICAS */}
      <div className="space-y-4">
        {/* LINHA SUPERIOR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TOTAL ESTUDADO */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-4 rounded-[32px] text-white shadow-xl shadow-indigo-100 dark:shadow-none transition-all hover:scale-[1.01]">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block mb-2">Total Estudado</span>
                <h3 className="text-3xl font-black tracking-tight">{stats.totalStudiedFormatted}</h3>
                <p className="text-indigo-200/80 text-[10px] font-bold uppercase mt-1">de {stats.totalDurationFormatted} totais</p>
              </div>
              <div className="p-2 bg-white/10 rounded-xl flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-indigo-100" />
              </div>
            </div>
          </div>

          {/* TEMPO DO DIA */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-[32px] shadow-sm transition-all hover:scale-[1.01]">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 block mb-2">Tempo do Dia</span>
                <h3 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{stats.todayFormatted}</h3>
                <p className="text-slate-400 dark:text-slate-300 text-[10px] font-bold uppercase mt-1">Dedicados hoje</p>
              </div>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex-shrink-0">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* LINHA INFERIOR - 4 COLUNAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-5 rounded-[28px] shadow-sm">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 block mb-3">Dias Seguidos</span>
            <div className="flex items-center gap-2">
              <Zap className={`w-5 h-5 ${stats.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-slate-300'}`} />
              <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white whitespace-nowrap">{stats.streak}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-5 rounded-[28px] shadow-sm">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 block mb-3">Progresso Geral</span>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white whitespace-nowrap">{stats.percentage}%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-5 rounded-[28px] shadow-sm">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 block mb-3">Tempo Restante</span>
            <div className="flex items-center gap-2">
              <Hourglass className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white whitespace-nowrap">{stats.remainingFormatted}</span>
            </div>
          </div>

          {/* NOVO CARD: CONCLUSÃO ESTIMADA */}
          <div
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-5 rounded-[28px] shadow-sm group relative"
            title="Cálculo estabilizado por IA (Bayes/EWMA)"
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 block mb-3">Conclusão Estimada</span>
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-emerald-500" />
              <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white whitespace-nowrap">{getCompletionForecast()}</span>
            </div>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Cálculo estabilizado por IA (Bayes/EWMA)
            </div>
          </div>
        </div>
      </div>

      {/* 2. MEIO: ATIVIDADE RECENTE */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 mb-6 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-500" /> Atividade Recente
        </h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((log, i) => (
              <div key={i} className="flex items-center justify-between group animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2 rounded-xl flex-shrink-0 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{log.lessonTitle}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">{new Date(log.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                  </div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800 text-slate-400 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                  Concluído
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4 italic">Nenhuma conclusão recente para exibir.</p>
        )}
      </div>

      {/* 3. FUNDO: GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* STATUS DAS AULAS (Donut) */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 mb-8">Status das Aulas</h3>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="outline-none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.percentage}%</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-slate-500 dark:text-slate-300 font-medium">Concluídas</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{stats.completedCount} aulas</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="text-slate-500 dark:text-slate-300 font-medium">Pendentes</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{stats.remainingCount} aulas</span>
            </div>
          </div>
        </div>

        {/* RENDIMENTO SEMANAL (Bar Chart) - Com Tooltip Customizado */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 mb-8 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> Rendimento Semanal
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} stroke="#94a3b8" />
                <YAxis hide />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="minutes" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardView;
