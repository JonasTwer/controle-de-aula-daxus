import { addDays, startOfDay, differenceInCalendarDays } from 'date-fns';

export const FORECAST_CONFIG = {
    BAYES_C: 7, // Inércia Bayesiana: 7 dias virtuais de "âncora"
    GLOBAL_VELOCITY_PRIOR: 5, // ⚠️ CALIBRADO: 5 AULAS por dia (NÃO minutos!)
    EWMA_ALPHA: 0.2, // Reatividade: 20% peso para novos dados
    MEDIAN_WINDOW_SIZE: 3, // Janela do filtro anti-outlier
    COLD_START_DAYS: 14 // Transição: Bayes → EWMA após 14 dias
};

export interface ForecastState {
    userId: string;
    startDate: string;
    itemsCompletedTotal: number;
    lastEwmaVelocity: number | null;
    velocityBuffer: number[];
    seasonalIndices: number[];
}

export class SmartForecastEngine {

    public static processDailyUpdate(
        input: { date: Date, itemsCompleted: number },
        state: ForecastState,
        totalItems: number
    ) {
        const newState = { ...state };
        const daysActive = Math.max(1, differenceInCalendarDays(new Date(), new Date(state.startDate)) + 1);

        // Atualiza totalizadores
        newState.itemsCompletedTotal += input.itemsCompleted;
        newState.velocityBuffer.push(input.itemsCompleted);
        if (newState.velocityBuffer.length > FORECAST_CONFIG.MEDIAN_WINDOW_SIZE) newState.velocityBuffer.shift();

        let velocity: number;
        let phase: 'COLD_START' | 'MATURITY';

        // LÓGICA CENTRAL
        if (daysActive <= FORECAST_CONFIG.COLD_START_DAYS) {
            phase = 'COLD_START';
            // AQUI ESTÁ A PROTEÇÃO DO DIA 3:
            // O divisor cresce (C + 3), mas o numerador tem o peso (C * Prior).
            // O zero dilui a velocidade suavemente, sem choques.
            const C = FORECAST_CONFIG.BAYES_C;
            const prior = FORECAST_CONFIG.GLOBAL_VELOCITY_PRIOR;
            velocity = (C * prior + newState.itemsCompletedTotal) / (C + daysActive);
        } else {
            phase = 'MATURITY';
            // PROTEÇÃO FUTURA (Mediana):
            const cleanInput = this.calculateMedian(newState.velocityBuffer);

            // Seeding logic se necessário
            const alpha = FORECAST_CONFIG.EWMA_ALPHA;
            const prev = state.lastEwmaVelocity || cleanInput; // Fallback seguro
            velocity = alpha * cleanInput + (1 - alpha) * prev;
            newState.lastEwmaVelocity = velocity;
        }

        // Projeção (Burndown Simulado)
        const prediction = this.predictBurndown(velocity, totalItems - newState.itemsCompletedTotal);

        return { newState, prediction: { ...prediction, velocity, phase } };
    }

    private static calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    }

    private static predictBurndown(velocity: number, remaining: number) {
        // Implementação simplificada para o prompt:
        if (velocity <= 0.1) return { date: addDays(new Date(), 365), daysRemaining: 365 };
        const days = Math.ceil(remaining / velocity);
        return { date: addDays(new Date(), days), daysRemaining: days };
    }

    /**
     * Factory simplificado: Cria estado inicial para um novo usuário
     */
    public static createInitialState(userId: string, startDate: string): ForecastState {
        return {
            userId,
            startDate,
            itemsCompletedTotal: 0,
            lastEwmaVelocity: null,
            velocityBuffer: [],
            seasonalIndices: []
        };
    }

    /**
     * Helper: Calcula previsão diretamente dos logs (sem estado persistido)
     * Útil para sistemas legados que não armazenam ForecastState
     * 
     * @param recentDailyProgress - Array com progresso dos últimos dias (para Mediana)
     * @param previousEwmaVelocity - Velocidade EWMA anterior (para continuidade)
     */
    public static quickForecast(
        completedMinutes: number,
        remainingMinutes: number,
        daysActive: number,
        recentDailyProgress?: number[],
        previousEwmaVelocity?: number
    ): { date: Date; phase: string; velocity: number } {
        let velocity: number;
        let phase: 'COLD_START' | 'MATURITY';

        if (daysActive <= FORECAST_CONFIG.COLD_START_DAYS) {
            // ✅ FASE INICIAL: Bayesian Smoothing (Âncora de Segurança)
            phase = 'COLD_START';
            const C = FORECAST_CONFIG.BAYES_C;
            const prior = FORECAST_CONFIG.GLOBAL_VELOCITY_PRIOR;
            velocity = (C * prior + completedMinutes) / (C + daysActive);
        } else {
            // ✅ FASE MADURA: Cascata de Filtros (Mediana → EWMA)
            phase = 'MATURITY';

            // 1. FILTRO DE MEDIANA (Anti-Outlier)
            let cleanVelocity: number;
            if (recentDailyProgress && recentDailyProgress.length >= FORECAST_CONFIG.MEDIAN_WINDOW_SIZE) {
                // Usa Mediana dos últimos N dias (ignora zeros e picos)
                cleanVelocity = this.calculateMedian(recentDailyProgress);
            } else {
                // Fallback: média simples (quando não há histórico recente)
                cleanVelocity = completedMinutes / daysActive;
            }

            // 2. EWMA (Exponential Weighted Moving Average)
            const alpha = FORECAST_CONFIG.EWMA_ALPHA; // 20% novo
            const prevVelocity = previousEwmaVelocity || cleanVelocity; // 80% histórico
            velocity = alpha * cleanVelocity + (1 - alpha) * prevVelocity;
        }

        const prediction = this.predictBurndown(velocity, remainingMinutes);
        return { date: prediction.date, phase, velocity };
    }
}
