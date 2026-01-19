
import React, { useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip
} from 'recharts';
import {
  TrendingUp, Clock, Zap, Hourglass, Target, GraduationCap,
  History, CheckCircle2, Circle, Flag
} from 'lucide-react';
import { AppStats, StudyLog, Lesson } from '../types';
import { formatDateLocal } from '../utils';
import { SmartForecastEngine, calculateWeight, FORECAST_CONFIG } from '../utils/SmartForecastEngine';

// ⚠️ VERSIONING: Qualquer mudança no algoritmo incrementa esta constante
const FORECAST_ENGINE_VERSION = '5.0.0'; // ⬅️ V5.0: Dynamic Real Load

interface DashboardViewProps {
  stats: AppStats;
  logs: StudyLog[];
  lessons: Lesson[]; // ⬅️ V5.0: NOVO! Array de todas as aulas para cálculo de carga real
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

const DashboardView: React.FC<DashboardViewProps> = ({ stats, logs, lessons }) => {

  // ⚠️ AÇÃO 2: PURGA DE CACHE VICIADO (Executado 1x por sessão)
  useEffect(() => {
    const storedVersion = localStorage.getItem('forecast_engine_version');
    const storedEwmaKey = 'forecast_ewma_velocity';

    // Se versão não existe OU é diferente de V5.0, limpar cache antigo
    if (!storedVersion || storedVersion !== FORECAST_ENGINE_VERSION) {
      console.log('🔧 [FORECAST] Detectado motor antigo ou ausente');
      console.log(`   Versão armazenada: ${storedVersion || 'NENHUMA'}`);
      console.log(`   Versão atual: ${FORECAST_ENGINE_VERSION}`);
      console.log('   ⚠️ LIMPANDO CACHE VICIADO...');

      // Limpar velocidade EWMA antiga
      localStorage.removeItem(storedEwmaKey);

      // Salvar nova versão
      localStorage.setItem('forecast_engine_version', FORECAST_ENGINE_VERSION);

      console.log('   ✅ Cache limpo! Sistema agora usa V5.0 - Dynamic Real Load.');
    } else {
      console.log(`✅ [FORECAST] Motor V5.0 já ativo (versão ${storedVersion})`);
    }
  }, []); // Executa apenas uma vez no mount

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

    // ⚠️ AÇÃO 1: INTEGRIDADE TEMPORAL (Relatório C - Pilar 134)
    // daysActive = DIAS CORRIDOS (primeira aula → HOJE), NÃO dias de estudo!
    // Isso garante que o divisor bayesiano ($N_{days}$) reflita o tempo REAL decorrido.
    // Exemplo: Usuário estudou dia 1, parou 5 dias → daysActive = 6 (não 1!)
    // EFEITO: Velocidade cai, previsão "corre para longe" a cada dia de inatividade.
    // Isso implementa a "Justiça da Constância" (Relatório C).
    const daysActive = Math.max(
      1,
      Math.ceil((today.getTime() - firstCompletedDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // 🔍 LOGGING TEMPORAL (Debug)
    const daysWithStudy = new Set(completedLogs.map(l => l.date)).size;
    const daysInactive = daysActive - daysWithStudy;

    console.log('📅 [TEMPORAL] Integridade da Série Temporal:');
    console.log(`   Primeira aula: ${firstCompletedDate.toLocaleDateString('pt-BR')}`);
    console.log(`   Hoje: ${today.toLocaleDateString('pt-BR')}`);
    console.log(`   Dias CORRIDOS (real): ${daysActive} dias ← Usado no cálculo Bayesiano`);
    console.log(`   Dias COM ESTUDO: ${daysWithStudy} dias`);
    console.log(`   Dias INATIVOS: ${daysInactive} dias (${((daysInactive / daysActive) * 100).toFixed(1)}% do tempo)`);

    if (daysInactive > 0) {
      console.log(`   ⚠️ EFEITO: Velocidade penalizada por inatividade!`);
      console.log(`      → Divisor bayesiano = ${daysActive} (não ${daysWithStudy})`);
      console.log(`      → Previsão "correrá para longe" enquanto usuário não estudar`);
    }

    // 2. ⚠️ V3.0: CÁLCULO DE CRÉDITOS DE ESFORÇO (não contagem de aulas!)
    // Regra: Crédito = Duração em Minutos / 15
    // Exemplo: 15 min = 1.0 crédito; 3h (180 min) = 12.0 créditos

    // 2A. Soma dos créditos das aulas CONCLUÍDAS
    const completedCredits = completedLogs.reduce((sum, log) => {
      const durationMinutes = (log.durationSec || 0) / 60;
      const credit = calculateWeight(durationMinutes);
      return sum + credit;
    }, 0);

    // 2B. ⚠️ V5.0: CARGA REAL DINÂMICA (Elimina Erro de Extrapolação)
    // ANTES (V3.0): assumia que aulas restantes = média das concluídas ❌
    // DEPOIS (V5.0): soma a duração REAL das aulas restantes do banco ✅

    // Criar Set de IDs das aulas completadas
    const completedLessonIds = new Set(completedLogs.map(log => log.lessonId));

    // Filtrar aulas que NÃO foram concluídas
    const remainingLessons = lessons.filter(lesson => !completedLessonIds.has(lesson.id));

    //🏔️ CALCULAR A MONTANHA: Somar durações reais das aulas restantes
    const remainingCredits = remainingLessons.reduce((sum, lesson) => {
      const durationMinutes = (lesson.durationSec || 0) / 60;
      const credit = calculateWeight(durationMinutes);
      return sum + credit;
    }, 0);

    // 🔍 LOGGING V5.0 [GPS]
    const avgCreditPerLessonCompleted = completedCredits / completedLogs.length;
    const avgCreditPerLessonRemaining = remainingCredits / remainingLessons.length;

    console.log('🏔️ [V5.0 - DYNAMIC REAL LOAD] Medindo a Montanha Real:');
    console.log(`   Aulas restantes: ${remainingLessons.length}`);
    console.log(`   Carga REAL restante: ${remainingCredits.toFixed(2)} créditos`);
    console.log(`   Créd médio/aula completada: ${avgCreditPerLessonCompleted.toFixed(2)}`);
    console.log(`   Créd médio/aula restante: ${avgCreditPerLessonRemaining.toFixed(2)}`);

    if (Math.abs(avgCreditPerLessonCompleted - avgCreditPerLessonRemaining) > 0.2) {
      console.log(`   ⚠️ ERRO DE EXTRAPOLAÇÃO DETECTADO!`);
      console.log(`      → Diferença: ${((avgCreditPerLessonRemaining / avgCreditPerLessonCompleted - 1) * 100).toFixed(1)}%`);
      console.log(`      → V3.0 estimaria: ${(avgCreditPerLessonCompleted * remainingLessons.length).toFixed(2)} créd ❌`);
      console.log(`      → V5.0 usa carga real: ${remainingCredits.toFixed(2)} créd ✅`);
    }

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

    // 🔍 LOGGING DO RESULTADO (Debug)
    console.log('🚀 [FORECAST] Resultado do Motor V3.0:');
    console.log(`   Fase: ${phase}`);
    console.log(`   Velocidade: ${velocity.toFixed(2)} créd/dia (~${(velocity * 15).toFixed(0)} min/dia)`);
    console.log(`   Créditos restantes: ${remainingCredits.toFixed(2)}`);
    console.log(`   Dias estimados: ${Math.ceil(remainingCredits / velocity)}`);
    console.log(`   Data de conclusão: ${date.toLocaleDateString('pt-BR')}`);

    if (phase === 'COLD_START') {
      const C = FORECAST_CONFIG.BAYES_C;
      const prior = FORECAST_CONFIG.GLOBAL_VELOCITY_PRIOR;
      const expectedVelocity = (C * prior + completedCredits) / (C + daysActive);
      console.log(`   📐 Fórmula Bayesiana:`);
      console.log(`      v = (${C} × ${prior} + ${completedCredits.toFixed(2)}) / (${C} + ${daysActive})`);
      console.log(`      v = ${expectedVelocity.toFixed(2)} créd/dia`);

      if (daysInactive > 2) {
        console.log(`   ⚠️ ALERTA: ${daysInactive} dias inativos!`);
        console.log(`      → Se usuário estudasse todos os dias: divisor = ${daysWithStudy + C} (não ${daysActive + C})`);
        console.log(`      → Velocidade seria: ${((C * prior + completedCredits) / (C + daysWithStudy)).toFixed(2)} créd/dia`);
        console.log(`      → Ganho potencial: ${(((C * prior + completedCredits) / (C + daysWithStudy)) - velocity).toFixed(2)} créd/dia!`);
      }
    }

    // ⚠️ AÇÃO 3: REFORÇO NO MOTOR (Data Base = HOJE)
    // O SmartForecastEngine.quickForecast() usa addDays(new Date(), days)
    // garantindo que a projeção sempre parta de HOJE, não do último log.
    // Isso está implementado na linha 206 do SmartForecastEngine.ts

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
