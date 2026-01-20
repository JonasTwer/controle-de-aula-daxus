import React, { useState, useEffect } from 'react';
import {
    Users, Search, X, AlertTriangle, TrendingUp, Clock,
    Calendar, Zap, ChevronDown, ChevronUp, Activity
} from 'lucide-react';
import { Lesson, StudyLog } from '../types';
import { supabase } from '../services/supabase';
import DashboardView from '../components/DashboardView';
import { formatSecondsToHHMM, formatDateLocal } from '../utils';
import { SmartForecastEngine, calculateWeight } from '../utils/SmartForecastEngine';

interface AdminDashboardProps {
    lessons: Lesson[];
}

interface UserData {
    userId: string;
    userName: string;
    userEmail: string;
    daysActive: number;
    lastActivity: string;
    riskStatus: 'ok' | 'warning' | 'danger';
    lessons: Lesson[];
    logs: StudyLog[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showV5Debug, setShowV5Debug] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

    // Buscar todos os usuários e seus dados
    useEffect(() => {
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        setIsLoading(true);
        try {
            console.log('🚀 [ADMIN] Iniciando fetch de usuários via RPC...');

            // 1️⃣ BUSCAR USUÁRIOS REAIS via RPC (Fonte da Verdade)
            const { data: realUsers, error: rpcError } = await supabase
                .rpc('get_admin_users_list');

            if (rpcError) {
                console.error('❌ [ADMIN] Erro ao chamar RPC:', rpcError);
                throw rpcError;
            }

            console.log(`✅ [ADMIN] RPC retornou ${realUsers?.length || 0} usuários cadastrados`);

            // 2️⃣ BUSCAR TODOS OS LOGS (para estatísticas)
            const { data: allLogs, error: logsError } = await supabase
                .from('study_logs')
                .select('*')
                .range(0, 9999) // 🔥 FORÇA BRUTA: Garante até 10.000 logs
                .order('date', { ascending: false });

            // 🚨 DEBUG CRÍTICO: Quantos logs o RLS permitiu passar?
            console.warn(`\n🚨 [RLS CHECK] O Banco entregou ${allLogs?.length || 0} logs no total.`);
            console.warn(`🚨 [RLS CHECK] Esperado: 53+ logs. Se < 53, RLS está BLOQUEANDO!`);

            if (logsError) {
                console.warn('⚠️ [ADMIN] Erro ao buscar logs:', logsError);
            }

            // 🔍 DEBUG: Validar quantos logs e usuários únicos vieram
            if (allLogs) {
                const uniqueUserIds = new Set(allLogs.map(l => l.user_id));
                console.log(`📊 [ADMIN DEBUG] Logs baixados: ${allLogs.length}`);
                console.log(`👥 [ADMIN DEBUG] Usuários únicos nos logs: ${uniqueUserIds.size}`);
                console.log(`🆔 [ADMIN DEBUG] IDs únicos:`, Array.from(uniqueUserIds).map(id => id.substring(0, 8)));
            } else {
                console.error('❌ [ADMIN DEBUG] Nenhum log foi retornado!');
            }

            // 3️⃣ BUSCAR TODAS AS AULAS (para cálculos)
            const { data: allLessons, error: lessonsError } = await supabase
                .from('lessons')
                .select('*')
                .range(0, 9999); // 🔥 FORÇA BRUTA: Garante até 10.000 aulas

            if (lessonsError) {
                console.warn('⚠️ [ADMIN] Erro ao buscar aulas:', lessonsError);
            }

            console.log(`📚 [ADMIN] Total de aulas encontradas: ${allLessons?.length || 0}`);

            // 4️⃣ LOSSLESS MERGE (À Prova de Falhas - NENHUM LOG SERÁ DESCARTADO!)
            console.log(`\n🔥 [LOSSLESS MERGE] Iniciando processamento garantido de TODOS os logs...`);

            // PASSO 1: Criar Map com usuários do RPC (fonte oficial)
            const studentMap = new Map<string, any>();

            realUsers?.forEach(user => {
                studentMap.set(user.id, {
                    id: user.id,
                    name: user.raw_user_meta_data?.full_name || user.email?.split('@')[0] || 'Usuário',
                    email: user.email || 'sem-email@example.com',
                    created_at: user.created_at,
                    logs: [],
                    lessons: []
                });
            });

            console.log(`📋 [LOSSLESS] ${studentMap.size} usuários pré-carregados do RPC`);

            // PASSO 2: Distribuir TODOS os logs (SEM FILTROS - GARANTIDO!)
            let orphanLogsCount = 0;

            (allLogs || []).forEach(log => {
                let student = studentMap.get(log.user_id);

                // ⚠️ CRÍTICO: Se o usuário NÃO existe, criar "Usuário Fantasma"
                if (!student) {
                    console.warn(`⚠️ [LOSSLESS] Log órfão encontrado! user_id: ${log.user_id.substring(0, 8)}... (criando usuário fantasma)`);
                    student = {
                        id: log.user_id,
                        name: `Usuário Não Listado [${log.user_id.substring(0, 8)}]`,
                        email: `${log.user_id.substring(0, 8)}@fantasma.local`,
                        created_at: new Date().toISOString(),
                        logs: [],
                        lessons: []
                    };
                    studentMap.set(log.user_id, student);
                    orphanLogsCount++;
                }

                // ✅ GARANTIDO: Log é adicionado (SEMPRE!)
                student.logs.push(log);
            });

            console.log(`✅ [LOSSLESS] ${allLogs?.length || 0} logs distribuídos`);
            if (orphanLogsCount > 0) {
                console.warn(`⚠️ [LOSSLESS] ${orphanLogsCount} logs órfãos (usuários fantasma criados)`);
            }

            // PASSO 3: Distribuir aulas
            (allLessons || []).forEach(lesson => {
                const student = studentMap.get(lesson.user_id);
                if (student) {
                    student.lessons.push(lesson);
                } else {
                    console.warn(`⚠️ [LOSSLESS] Aula órfã: ${lesson.id.substring(0, 8)} (user_id não encontrado)`);
                }
            });

            // PASSO 4: Converter Map para Array e calcular estatísticas
            const usersData: UserData[] = [];

            studentMap.forEach((student, userId) => {
                // Calcular última atividade
                let lastActivity = 'N/A';
                let daysActive = 0;
                let daysSinceLastActivity = 999;

                if (student.logs.length > 0) {
                    const sortedLogs = student.logs.sort((a: any, b: any) => b.date.localeCompare(a.date));
                    lastActivity = sortedLogs[0].date;

                    const today = new Date();
                    const lastActivityDate = new Date(lastActivity + 'T00:00:00');
                    daysSinceLastActivity = Math.floor(
                        (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    daysActive = new Set(student.logs.map((l: any) => l.date)).size;
                } else if (student.created_at) {
                    const today = new Date();
                    const createdDate = new Date(student.created_at);
                    daysSinceLastActivity = Math.floor(
                        (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
                    );
                }

                // Determinar status de risco
                let riskStatus: 'ok' | 'warning' | 'danger';
                if (daysSinceLastActivity > 5) {
                    riskStatus = 'danger';
                } else if (daysSinceLastActivity > 2) {
                    riskStatus = 'warning';
                } else {
                    riskStatus = 'ok';
                }

                // Mapear logs para o formato esperado
                const mappedLogs: StudyLog[] = student.logs.map((log: any) => ({
                    lessonId: log.lesson_id,
                    date: log.date,
                    durationSec: log.duration_sec || 0,
                    status: log.status,
                    notes: log.notes || '',
                    lessonTitle: log.lesson_title || ''
                }));

                // Mapear lessons para o formato esperado
                const mappedLessons: Lesson[] = student.lessons.map((lesson: any) => ({
                    id: lesson.id,
                    meta: lesson.meta || lesson.theme || 'Sem Meta',
                    materia: lesson.materia || lesson.module || 'Sem Matéria',
                    title: lesson.title || 'Aula sem título',
                    durationStr: lesson.duration_str || '00:00:00',
                    durationSec: lesson.duration_sec || 0,
                    createdAt: lesson.created_at || new Date().toISOString()
                }));

                // Criar objeto UserData
                const userData: UserData = {
                    userId: student.id,
                    userName: student.name,
                    userEmail: student.email,
                    daysActive,
                    lastActivity: lastActivity !== 'N/A' ? lastActivity : (student.created_at?.split('T')[0] || 'N/A'),
                    riskStatus,
                    lessons: mappedLessons,
                    logs: mappedLogs
                };

                usersData.push(userData);

                // Log detalhado de cada usuário
                const totalSec = mappedLogs.reduce((sum, log) => sum + log.durationSec, 0);
                const totalHours = (totalSec / 3600).toFixed(2);
                console.log(`👤 [LOSSLESS] ${student.name}: ${mappedLogs.length} logs, ${totalHours}h, ${daysActive} dias ativos, risco: ${riskStatus}`);
            });

            console.log(`\n✅ [LOSSLESS] Total de alunos processados: ${usersData.length}`);
            console.log(`   - Com atividade: ${usersData.filter(u => u.logs.length > 0).length}`);
            console.log(`   - Sem atividade: ${usersData.filter(u => u.logs.length === 0).length}`);

            setAllUsers(usersData.sort((a, b) => a.userName.localeCompare(b.userName)));
        } catch (error) {
            console.error('❌ [ADMIN] Erro ao carregar usuários:', error);

            // Se a RPC falhar, mostrar mensagem mais específica
            if (error instanceof Error && error.message.includes('Acesso negado')) {
                console.error('🚫 [ADMIN] Você não tem permissão de Super Admin!');
                console.error('   Certifique-se de estar logado como jonas10psn@gmail.com');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Filtrar usuários pela busca
    const filteredUsers = allUsers.filter(user =>
        user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calcular stats para usuário selecionado
    const getUserStats = (user: UserData) => {
        const lessonProgress: Record<string, boolean> = {};
        user.logs.forEach(log => {
            if (log.status === 'completed') {
                lessonProgress[log.lessonId] = true;
            }
        });

        const totalDuration = user.lessons.reduce((acc, l) => acc + l.durationSec, 0);
        const totalStudied = user.lessons.reduce((acc, l) =>
            acc + (lessonProgress[l.id] ? l.durationSec : 0), 0
        );

        const todayStr = formatDateLocal(new Date());
        const todaySeconds = user.logs
            .filter(l => l.date === todayStr && l.status === 'completed')
            .reduce((acc, l) => acc + (l.durationSec || 0), 0);

        return {
            totalDuration,
            totalStudied,
            percentage: totalDuration > 0 ? Math.round((totalStudied / totalDuration) * 100) : 0,
            totalDurationFormatted: formatSecondsToHHMM(totalDuration),
            totalStudiedFormatted: formatSecondsToHHMM(totalStudied),
            remainingFormatted: formatSecondsToHHMM(Math.max(0, totalDuration - totalStudied)),
            completedCount: user.lessons.filter(l => lessonProgress[l.id]).length,
            remainingCount: user.lessons.filter(l => !lessonProgress[l.id]).length,
            streak: 0,
            todayFormatted: formatSecondsToHHMM(todaySeconds)
        };
    };

    // Calcular dados V5.0 Debug
    const getV5DebugData = (user: UserData) => {
        const completedLogs = user.logs.filter(l => l.status === 'completed' && (l.durationSec || 0) > 0);

        if (completedLogs.length === 0) {
            return {
                realRemainingLoad: 0,
                bayesianVelocity: 0,
                daysInactive: 0,
                estimatedDate: 'N/A'
            };
        }

        const lessonProgress: Record<string, boolean> = {};
        completedLogs.forEach(log => {
            lessonProgress[log.lessonId] = true;
        });

        // Calcular carga real restante
        const remainingLessons = user.lessons.filter(lesson => !lessonProgress[lesson.id]);
        const remainingCredits = remainingLessons.reduce((sum, lesson) => {
            const durationMinutes = (lesson.durationSec || 0) / 60;
            const credit = calculateWeight(durationMinutes);
            return sum + credit;
        }, 0);

        // Calcular velocidade bayesiana
        const firstCompletedDate = completedLogs
            .map(l => new Date(l.date + 'T00:00:00'))
            .sort((a, b) => a.getTime() - b.getTime())[0];

        const today = new Date();
        const daysActive = Math.max(
            1,
            Math.ceil((today.getTime() - firstCompletedDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        const completedCredits = completedLogs.reduce((sum, log) => {
            const durationMinutes = (log.durationSec || 0) / 60;
            const credit = calculateWeight(durationMinutes);
            return sum + credit;
        }, 0);

        const recentDailyProgress: number[] = [];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return formatDateLocal(d);
        });

        last7Days.forEach(dateStr => {
            const dailyCredits = completedLogs
                .filter(l => l.date === dateStr)
                .reduce((sum, log) => {
                    const durationMinutes = (log.durationSec || 0) / 60;
                    return sum + calculateWeight(durationMinutes);
                }, 0);
            recentDailyProgress.push(dailyCredits);
        });

        const { date, velocity } = SmartForecastEngine.quickForecast(
            completedCredits,
            remainingCredits,
            daysActive,
            recentDailyProgress
        );

        const daysWithStudy = new Set(completedLogs.map(l => l.date)).size;
        const daysInactive = daysActive - daysWithStudy;

        return {
            realRemainingLoad: Math.round(remainingCredits),
            bayesianVelocity: parseFloat(velocity.toFixed(2)),
            daysInactive,
            estimatedDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        };
    };

    // Toggle seleção para comparação
    const toggleCompareSelection = (userId: string) => {
        const newSet = new Set(selectedForCompare);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else if (newSet.size < 2) {
            newSet.add(userId);
        }
        setSelectedForCompare(newSet);
    };

    // Dados para comparação
    const compareData = Array.from(selectedForCompare)
        .map(userId => allUsers.find(u => u.userId === userId))
        .filter(u => u !== undefined) as UserData[];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-2">
                        🔧 God Mode <span className="text-indigo-600">V5.0</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Painel de controle administrativo com visão completa do sistema
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* A. SIDEBAR DE ALUNOS */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Alunos</h2>
                                    <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                                        {allUsers.length}
                                    </span>
                                </div>

                                {/* Campo de Busca */}
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou e-mail..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                        >
                                            <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                        </button>
                                    )}
                                </div>

                                {/* Toggle Modo Comparador */}
                                <button
                                    onClick={() => {
                                        setCompareMode(!compareMode);
                                        setSelectedForCompare(new Set());
                                    }}
                                    className={`w-full mb-4 py-2 px-4 rounded-xl text-sm font-bold transition-all ${compareMode
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                >
                                    {compareMode ? '✓ Modo Comparador Ativo' : 'Ativar Modo Comparador'}
                                </button>

                                {/* Lista de Usuários */}
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {filteredUsers.map((user) => (
                                        <div
                                            key={user.userId}
                                            onClick={() => !compareMode && setSelectedUser(user)}
                                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedUser?.userId === user.userId
                                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {compareMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedForCompare.has(user.userId)}
                                                        onChange={() => toggleCompareSelection(user.userId)}
                                                        disabled={!selectedForCompare.has(user.userId) && selectedForCompare.size >= 2}
                                                        className="mt-1 w-4 h-4 text-indigo-600 rounded"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">
                                                        {user.userName}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 truncate">{user.userEmail}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                            {user.daysActive} dias ativos
                                                        </span>
                                                        {user.riskStatus === 'danger' && (
                                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                                        )}
                                                    </div>
                                                </div>
                                                <div
                                                    className={`w-3 h-3 rounded-full ${user.riskStatus === 'ok'
                                                        ? 'bg-green-500'
                                                        : user.riskStatus === 'warning'
                                                            ? 'bg-yellow-500'
                                                            : 'bg-red-500'
                                                        }`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* B. RAIO-X V5.0 (Detalhes) */}
                        {!compareMode && selectedUser && (
                            <div className="lg:col-span-9 space-y-6">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                                        📊 Raio-X: {selectedUser.userName}
                                    </h2>
                                    <p className="text-sm text-slate-500 mb-6">{selectedUser.userEmail}</p>

                                    {/* Dashboard do Aluno */}
                                    <DashboardView
                                        stats={getUserStats(selectedUser)}
                                        logs={selectedUser.logs}
                                        lessons={selectedUser.lessons}
                                    />

                                    {/* Aba V5.0 Debug */}
                                    <div className="mt-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <button
                                            onClick={() => setShowV5Debug(!showV5Debug)}
                                            className="w-full p-6 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Activity className="w-5 h-5 text-indigo-600" />
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                                    V5.0 Debug Panel
                                                </h3>
                                            </div>
                                            {showV5Debug ? (
                                                <ChevronUp className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            )}
                                        </button>

                                        {showV5Debug && (
                                            <div className="p-6 pt-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {(() => {
                                                    const debugData = getV5DebugData(selectedUser);
                                                    return (
                                                        <>
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Carga Real Restante</p>
                                                                <p className="text-2xl font-black text-indigo-600">{debugData.realRemainingLoad}</p>
                                                                <p className="text-xs text-slate-400 mt-1">créditos</p>
                                                            </div>
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Velocidade Bayesiana</p>
                                                                <p className="text-2xl font-black text-emerald-600">{debugData.bayesianVelocity}</p>
                                                                <p className="text-xs text-slate-400 mt-1">créd/dia</p>
                                                            </div>
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Dias de Inatividade</p>
                                                                <p className="text-2xl font-black text-amber-600">{debugData.daysInactive}</p>
                                                                <p className="text-xs text-slate-400 mt-1">dias</p>
                                                            </div>
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Data Estimada</p>
                                                                <p className="text-lg font-black text-purple-600">{debugData.estimatedDate}</p>
                                                                <p className="text-xs text-slate-400 mt-1">conclusão</p>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* C. MODO COMPARADOR (Versus) */}
                        {compareMode && compareData.length === 2 && (
                            <div className="lg:col-span-9">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                                        ⚔️ Modo Comparador
                                    </h2>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                                                    <th className="text-left py-4 px-4 text-sm font-bold text-slate-500 uppercase">Métrica</th>
                                                    <th className="text-center py-4 px-4">
                                                        <div className="text-sm font-bold text-slate-800 dark:text-white">{compareData[0].userName}</div>
                                                        <div className="text-xs text-slate-500">{compareData[0].userEmail}</div>
                                                    </th>
                                                    <th className="text-center py-4 px-4">
                                                        <div className="text-sm font-bold text-slate-800 dark:text-white">{compareData[1].userName}</div>
                                                        <div className="text-xs text-slate-500">{compareData[1].userEmail}</div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[
                                                    {
                                                        label: 'Velocidade Diária',
                                                        icon: TrendingUp,
                                                        getValue: (user: UserData) => `${getV5DebugData(user).bayesianVelocity} créd/dia`
                                                    },
                                                    {
                                                        label: 'Carga Total Restante',
                                                        icon: Clock,
                                                        getValue: (user: UserData) => `${getV5DebugData(user).realRemainingLoad} créditos`
                                                    },
                                                    {
                                                        label: 'Data de Conclusão',
                                                        icon: Calendar,
                                                        getValue: (user: UserData) => getV5DebugData(user).estimatedDate
                                                    },
                                                    {
                                                        label: 'Dias de Inatividade',
                                                        icon: Zap,
                                                        getValue: (user: UserData) => `${getV5DebugData(user).daysInactive} dias`
                                                    }
                                                ].map((metric, idx) => (
                                                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900">
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <metric.icon className="w-4 h-4 text-indigo-600" />
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                    {metric.label}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="text-center py-4 px-4 font-bold text-slate-800 dark:text-white">
                                                            {metric.getValue(compareData[0])}
                                                        </td>
                                                        <td className="text-center py-4 px-4 font-bold text-slate-800 dark:text-white">
                                                            {metric.getValue(compareData[1])}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Placeholder quando nada selecionado */}
                        {!selectedUser && !compareMode && (
                            <div className="lg:col-span-9 flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-20">
                                <div className="text-center">
                                    <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                                        Selecione um aluno na lista para visualizar detalhes
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Placeholder modo compare */}
                        {compareMode && compareData.length < 2 && (
                            <div className="lg:col-span-9 flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-20">
                                <div className="text-center">
                                    <Activity className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                                        Selecione 2 alunos para comparar
                                    </p>
                                    <p className="text-sm text-slate-400 mt-2">
                                        {selectedForCompare.size}/2 selecionados
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
