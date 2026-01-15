import { SmartForecastEngine, FORECAST_CONFIG } from '../utils/SmartForecastEngine';
import { describe, it, expect } from 'vitest';
import { addDays, differenceInDays } from 'date-fns';

describe('SmartForecastEngine', () => {
    describe('Cold Start Protection (< 14 dias)', () => {
        it('deve amortecer zeros no início (Caso do Dia 3 - Ana Lice)', () => {
            // Cenário: Dia 1: 7 aulas, Dia 2: 2 aulas, Dia 3: 0 aulas, Dia 4: 0 aulas
            const completedItems = 7 + 2 + 0 + 0; // 9 aulas
            const remainingItems = 21; // 21 aulas restantes
            const daysActive = 4;

            const result = SmartForecastEngine.quickForecast(
                completedItems,
                remainingItems,
                daysActive
            );

            // Velocidade esperada (Bayes):
            // (7 * 5 + 9) / (7 + 4) = 44 / 11 = 4.0 aulas/dia
            expect(result.velocity).toBeCloseTo(4.0, 1);
            expect(result.phase).toBe('COLD_START');

            // Dias restantes: 21 / 4.0 = 5.25 → ceil = 6 dias
            const daysUntilCompletion = differenceInDays(result.date, new Date());
            expect(daysUntilCompletion).toBeGreaterThan(4);
            expect(daysUntilCompletion).toBeLessThan(8);
        });

        it('deve ser mais conservador que média simples', () => {
            const completedMinutes = 280;
            const remainingMinutes = 2910;
            const daysActive = 3;

            const bayesResult = SmartForecastEngine.quickForecast(
                completedMinutes,
                remainingMinutes,
                daysActive
            );

            // Média simples seria: 280 / 3 = 93.3 min/dia
            const simpleMeanVelocity = completedMinutes / daysActive;

            // Bayes deve ser MUITO menor (mais conservador)
            expect(bayesResult.velocity).toBeLessThan(simpleMeanVelocity * 0.5);
        });

        it('deve funcionar com Prior diferente', () => {
            // Simula calibração para Prior = 60 min/dia
            const originalPrior = FORECAST_CONFIG.GLOBAL_VELOCITY_PRIOR;
            FORECAST_CONFIG.GLOBAL_VELOCITY_PRIOR = 60;

            const result = SmartForecastEngine.quickForecast(240, 300, 2);

            // Velocidade: (7 * 60 + 240) / (7 + 2) = 53.3 min/dia
            expect(result.velocity).toBeCloseTo(53.3, 1);

            // Restaura config original
            FORECAST_CONFIG.GLOBAL_VELOCITY_PRIOR = originalPrior;
        });
    });

    describe('Maturidade (> 14 dias)', () => {
        it('deve usar Mediana para ignorar zero isolado (Cenário 2: Pausa de 1 Dia)', () => {
            const completedMinutes = 1400; // 100 dias * 14 min/dia (média)
            const remainingMinutes = 300;
            const daysActive = 20; // Fase madura

            // Últimos 7 dias: [14, 14, 0, 14, 14, 14, 14]
            const recentDays = [14, 14, 0, 14, 14, 14, 14];

            const result = SmartForecastEngine.quickForecast(
                completedMinutes,
                remainingMinutes,
                daysActive,
                recentDays
            );

            expect(result.phase).toBe('MATURITY');

            // Mediana de [0, 14, 14, 14, 14, 14, 14] = 14 (ignora o zero!)
            // Velocidade EWMA ≈ 14 min/dia (não deve cair para ~12 como na média simples)
            expect(result.velocity).toBeGreaterThan(12); // > média com zero
            expect(result.velocity).toBeLessThan(15);    // ≈ mediana sem zero
        });

        it('deve usar Mediana para ignorar pico isolado (Cenário 3: Maratona)', () => {
            const completedMinutes = 1400;
            const remainingMinutes = 300;
            const daysActive = 20;

            // Últimos 7 dias: [14, 14, 600, 14, 14, 14, 14] (600 = maratona de 10h)
            const recentDays = [14, 14, 600, 14, 14, 14, 14];

            const result = SmartForecastEngine.quickForecast(
                completedMinutes,
                remainingMinutes,
                daysActive,
                recentDays
            );

            // Mediana de [14, 14, 14, 14, 14, 14, 600] = 14 (ignora o pico!)
            // Não deve saltar para ~100 min/dia (média simples)
            expect(result.velocity).toBeLessThan(30); // Não deve explodir
            expect(result.velocity).toBeGreaterThan(10); // Mantém ritmo normal
        });

        it('deve usar EWMA para detectar mudança de ritmo (Cenário 4: Virada de Chave)', () => {
            const completedMinutes = 1400;
            const remainingMinutes = 300;
            const daysActive = 20;

            // Últimos 7 dias: TODOS aceleraram para 180 min (3h/dia)
            const recentDays = [180, 180, 180, 180, 180, 180, 180];
            const previousEwma = 14; // Ritmo antigo (antes da virada)

            const result = SmartForecastEngine.quickForecast(
                completedMinutes,
                remainingMinutes,
                daysActive,
                recentDays,
                previousEwma // ✅ Passa velocidade anterior
            );

            // EWMA: 0.2 * 180 + 0.8 * 14 = 36 + 11.2 = 47.2 min/dia
            // Deve detectar aceleração e aumentar velocidade
            expect(result.velocity).toBeGreaterThan(40); // Detectou mudança
            expect(result.velocity).toBeLessThan(180);   // Mas não acredita 100%
        });

        it('deve usar média simples como fallback quando não há histórico recente', () => {
            const completedMinutes = 1400;
            const remainingMinutes = 300;
            const daysActive = 100;

            const result = SmartForecastEngine.quickForecast(
                completedMinutes,
                remainingMinutes,
                daysActive
                // Sem recentDays = fallback para média simples
            );

            expect(result.phase).toBe('MATURITY');

            // Velocidade: 1400 / 100 = 14 min/dia (média simples)
            expect(result.velocity).toBeCloseTo(14, 1);
        });
    });

    describe('Casos Extremos', () => {
        it('deve retornar data futura distante se velocidade = 0', () => {
            const result = SmartForecastEngine.quickForecast(0, 1000, 10);

            const daysUntilCompletion = differenceInDays(result.date, new Date());

            // Deve projetar 1 ano no futuro (fallback)
            expect(daysUntilCompletion).toBeGreaterThan(300);
        });

        it('deve retornar data imediata se remainingMinutes = 0', () => {
            const result = SmartForecastEngine.quickForecast(1000, 0, 10);

            const daysUntilCompletion = differenceInDays(result.date, new Date());

            // Deve completar em 0 dias (hoje)
            expect(daysUntilCompletion).toBe(0);
        });

        it('deve lidar com 1 dia ativo', () => {
            // Primeiro dia: 120 min
            const result = SmartForecastEngine.quickForecast(120, 600, 1);

            // Velocidade: (7 * 5 + 120) / (7 + 1) = 18.75 min/dia
            expect(result.velocity).toBeCloseTo(18.75, 1);
            expect(result.phase).toBe('COLD_START');
        });
    });

    describe('Cálculo de Mediana (Helper)', () => {
        it('deve calcular mediana de array ímpar', () => {
            const values = [1, 3, 2];
            // Acesso via reflexão (teste privado)
            const median = SmartForecastEngine['calculateMedian'](values);
            expect(median).toBe(2);
        });

        it('deve calcular mediana de array par', () => {
            const values = [1, 2, 3, 4];
            const median = SmartForecastEngine['calculateMedian'](values);
            expect(median).toBe(3); // Mediana de [1,2,3,4] = floor(4/2) = 3
        });

        it('deve retornar 0 para array vazio', () => {
            const median = SmartForecastEngine['calculateMedian']([]);
            expect(median).toBe(0);
        });
    });

    describe('Criação de Estado Inicial', () => {
        it('deve criar ForecastState válido', () => {
            const state = SmartForecastEngine.createInitialState(
                'user-123',
                '2026-01-01'
            );

            expect(state.userId).toBe('user-123');
            expect(state.startDate).toBe('2026-01-01');
            expect(state.itemsCompletedTotal).toBe(0);
            expect(state.lastEwmaVelocity).toBeNull();
            expect(state.velocityBuffer).toEqual([]);
            expect(state.seasonalIndices).toEqual([]);
        });
    });

    describe('Integração com Configurações', () => {
        it('deve respeitar BAYES_C customizado', () => {
            const originalC = FORECAST_CONFIG.BAYES_C;
            FORECAST_CONFIG.BAYES_C = 14; // Inércia alta

            const result = SmartForecastEngine.quickForecast(280, 2910, 3);

            // Velocidade: (14 * 5 + 280) / (14 + 3) = 20.5 min/dia
            expect(result.velocity).toBeCloseTo(20.5, 1);

            FORECAST_CONFIG.BAYES_C = originalC;
        });
    });
});

describe('Comparação com Média Simples (Regressão)', () => {
    it('Caso de Teste do Relatório C: Dia 3 com Zero', () => {
        // ANTES (Média Simples):
        const simpleMean = (240 + 40 + 0) / 3; // 93.3 min/dia
        const simpleDaysRemaining = Math.ceil(2910 / simpleMean); // ≈ 31 dias

        // DEPOIS (Smart Forecast V2):
        const bayesResult = SmartForecastEngine.quickForecast(280, 2910, 3);
        const bayesDaysRemaining = Math.ceil(2910 / bayesResult.velocity); // ≈ 92 dias

        // Bayes deve ser MUITO mais conservador (±3x)
        expect(bayesDaysRemaining).toBeGreaterThan(simpleDaysRemaining * 2);

        // Volatilidade: Bayes deve ser estável
        expect(bayesResult.velocity).toBeLessThan(40); // < 40 min/dia (estável)
        expect(simpleMean).toBeGreaterThan(90); // > 90 min/dia (volátil)
    });
});
