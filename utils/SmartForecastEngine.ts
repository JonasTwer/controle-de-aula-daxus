import { addDays, startOfDay, differenceInCalendarDays } from 'date-fns';

// --- CONFIGURAÇÃO CALIBRADA (V3.0 - CRÉDITOS DE ESFORÇO) ---
export const FORECAST_CONFIG = {
    BAYES_C: 7,               // Inércia de 7 dias (Empréstimo de Força)
    GLOBAL_VELOCITY_PRIOR: 5.0, // ⚠️ V3.0: 5.0 CRÉDITOS/DIA (não aulas!)
    CREDIT_DIVISOR: 15,       // 15 minutos = 1.0 crédito
    EWMA_ALPHA: 0.2,          // Foco nos últimos ~7-10 dias
    MEDIAN_WINDOW_SIZE: 3,    // Janela ímpar para matar outliers
    COLD_START_DAYS: 14,
    SEASONALITY_LEARNING_RATE: 0.05, // Taxa de aprendizado lenta
    EPSILON: 0.1              // Proteção contra divisão por zero
};

/**
 * V3.0: Calcula peso da aula baseado na duração
 * @param durationMinutes - Duração da aula em minutos
 * @returns Créditos de esforço (15 min = 1.0 crédito; 3h = 12.0 créditos)
 */
export const calculateWeight = (durationMinutes: number): number => {
    return Math.max(0.1, durationMinutes / FORECAST_CONFIG.CREDIT_DIVISOR);
};

export interface ForecastState {
    userId: string;
    startDate: string;
    itemsCompletedTotal: number;
    lastEwmaVelocity: number | null;
    velocityBuffer: number[];
    seasonalIndices: number[]; // Array[7], inicia tudo com 1.0
}

export class SmartForecastEngine {

    public static processDailyUpdate(
        input: { date: Date, itemsCompleted: number }, // ⚠️ V3.0: itemsCompleted agora é CRÉDITOS (não contagem!)
        state: ForecastState,
        totalItemsToFinish: number
    ) {
        const newState = { ...state };
        const today = startOfDay(new Date());
        const start = startOfDay(new Date(newState.startDate));
        const daysActive = Math.max(1, differenceInCalendarDays(today, start) + 1);

        // 1. ATUALIZAÇÃO DO BUFFER (✅ V3.0: Créditos entram no buffer)
        newState.itemsCompletedTotal += input.itemsCompleted;
        newState.velocityBuffer.push(input.itemsCompleted);
        if (newState.velocityBuffer.length > FORECAST_CONFIG.MEDIAN_WINDOW_SIZE) {
            newState.velocityBuffer.shift();
        }

        let velocity: number;
        let phase: 'COLD_START' | 'MATURITY';

        // 2. ROTEAMENTO DE FASE
        if (daysActive <= FORECAST_CONFIG.COLD_START_DAYS) {
            phase = 'COLD_START';
            // Fórmula Bayesiana: (C*Prior + Real) / (C + N)
            const C = FORECAST_CONFIG.BAYES_C;
            const mu = FORECAST_CONFIG.GLOBAL_VELOCITY_PRIOR;
            velocity = (C * mu + newState.itemsCompletedTotal) / (C + daysActive);

            // Prepara transição suave
            newState.lastEwmaVelocity = velocity;
        } else {
            phase = 'MATURITY';

            // A) Filtro de Mediana (Ignora o zero se tiver histórico bom)
            const cleanInput = this.calculateMedian(newState.velocityBuffer);

            // B) Dessazonalização
            const dow = new Date().getDay();
            const seasonality = Math.max(FORECAST_CONFIG.EPSILON, newState.seasonalIndices[dow] || 1.0);
            const adjustedInput = cleanInput / seasonality;

            // C) EWMA (Tendência)
            const alpha = FORECAST_CONFIG.EWMA_ALPHA;
            const prev = newState.lastEwmaVelocity || adjustedInput;
            const newEwma = (alpha * adjustedInput) + ((1 - alpha) * prev);
            newState.lastEwmaVelocity = newEwma;
            velocity = newEwma;

            // D) Aprendizado Sazonal (Update + ✅ Renormalização)
            this.updateSeasonality(newState, cleanInput, newEwma, dow);
        }

        // 3. PROJEÇÃO (Burndown Simulado)
        const itemsRemaining = totalItemsToFinish - newState.itemsCompletedTotal;
        const prediction = this.predictCompletionDate(velocity, itemsRemaining, newState.seasonalIndices);

        return {
            newState,
            prediction: {
                ...prediction,
                phase,
                currentVelocity: velocity,
                confidence: phase === 'MATURITY' ? 0.85 : 0.4
            }
        };
    }

    private static predictCompletionDate(velocity: number, itemsRemaining: number, indices: number[]) {
        if (velocity <= 0.1) return { date: addDays(new Date(), 365), days: 365 };

        let remaining = itemsRemaining;
        let currentDate = new Date();
        let days = 0;

        // Simulação dia-a-dia para precisão máxima
        while (remaining > 0 && days < 730) {
            currentDate = addDays(currentDate, 1);
            days++;
            const dow = currentDate.getDay();
            const factor = indices[dow] || 1.0;
            remaining -= (velocity * factor);
        }

        return { date: currentDate, days };
    }

    private static calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    }

    private static updateSeasonality(state: ForecastState, actual: number, trend: number, dow: number) {
        if (trend <= FORECAST_CONFIG.EPSILON) return;

        const ratio = actual / trend;
        const oldIndex = state.seasonalIndices[dow] || 1.0;
        const beta = FORECAST_CONFIG.SEASONALITY_LEARNING_RATE;

        // Update
        state.seasonalIndices[dow] = (1 - beta) * oldIndex + (beta * ratio);

        // ✅ RENORMALIZAÇÃO OBRIGATÓRIA (Evita Drift)
        const sum = state.seasonalIndices.reduce((a, b) => a + b, 0);
        if (sum > 0) {
            state.seasonalIndices = state.seasonalIndices.map(v => (v / sum) * 7);
        }
    }

    /**
     * Factory: Cria estado inicial para um novo usuário
     */
    public static createInitialState(userId: string, startDate: string): ForecastState {
        return {
            userId,
            startDate,
            itemsCompletedTotal: 0,
            lastEwmaVelocity: null,
            velocityBuffer: [],
            seasonalIndices: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] // ✅ Inicia normalizado (soma = 7)
        };
    }

    /**
     * Helper: Calcula previsão diretamente dos logs (sem estado persistido)
     * ⚠️ V3.0: completedItems e remainingItems devem ser SOMA DE CRÉDITOS, não contagem!
     * 
     * @param completedItems - Soma dos créditos de aulas concluídas
     * @param remainingItems - Soma dos créditos de aulas restantes
     * @param daysActive - Número de dias desde a primeira aula
     * @param recentDailyProgress - Array de créditos/dia dos últimos dias
     * @param previousEwmaVelocity - Velocidade EWMA anterior (para continuidade)
     */
    public static quickForecast(
        completedItems: number,
        remainingItems: number,
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
            velocity = (C * prior + completedItems) / (C + daysActive);
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
                cleanVelocity = completedItems / daysActive;
            }

            // 2. EWMA (Exponential Weighted Moving Average)
            const alpha = FORECAST_CONFIG.EWMA_ALPHA; // 20% novo
            const prevVelocity = previousEwmaVelocity || cleanVelocity; // 80% histórico
            velocity = alpha * cleanVelocity + (1 - alpha) * prevVelocity;
        }

        // ⚠️ AÇÃO 3: PROJEÇÃO COM DATA BASE = HOJE (Relatório C - Pilar 134)
        // CRÍTICO: Usa new Date() (HOJE) como base, NÃO a data do último log!
        // Isso garante que a previsão "corra para longe" a cada dia de inatividade.
        // Exemplo: Usuário parou dia 14/01, hoje é 19/01 → base = 19/01 (não 14/01)
        // EFEITO: Cada dia inativo aumenta a distância até a conclusão.
        const days = Math.ceil(remainingItems / Math.max(velocity, FORECAST_CONFIG.EPSILON));
        const date = addDays(new Date(), days); // ← new Date() = HOJE!

        return { date, phase, velocity };
    }
}
