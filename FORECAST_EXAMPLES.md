# 💡 Exemplos Práticos - Smart Forecast Engine V2

Este guia contém exemplos reais de como usar o Smart Forecast Engine em diferentes contextos.

---

## 📚 Exemplo 1: Integração Simples (QuickForecast)

### Contexto:
Sistema legado que não armazena `ForecastState`, apenas calcula previsão on-the-fly.

### Código:

```typescript
import { SmartForecastEngine } from './utils/SmartForecastEngine';

// Dados do usuário (vindo do banco)
const completedMinutes = 680; // Total estudado
const remainingMinutes = 1200; // Total restante
const daysActive = 5; // Dias desde o início

// Previsão instantânea
const { date, phase, velocity } = SmartForecastEngine.quickForecast(
  completedMinutes,
  remainingMinutes,
  daysActive
);

console.log(`📅 Previsão: ${date.toLocaleDateString('pt-BR')}`);
console.log(`🚀 Fase: ${phase}`);
console.log(`⚡ Velocidade: ${velocity.toFixed(1)} min/dia`);

// Output:
// 📅 Previsão: 25/03/2026
// 🚀 Fase: COLD_START
// ⚡ Velocidade: 28.0 min/dia
```

---

## 🎓 Exemplo 2: Plataforma de Aulas (Unidade: Aulas)

### Contexto:
Sistema que rastreia aulas concluídas (não minutos).

### Configuração:

```typescript
// utils/SmartForecastEngine.ts
export const FORECAST_CONFIG = {
  BAYES_C: 7,
  GLOBAL_VELOCITY_PRIOR: 3, // ⬅️ CALIBRADO: 3 aulas/dia (média global)
  EWMA_ALPHA: 0.2,
  MEDIAN_WINDOW_SIZE: 3,
  COLD_START_DAYS: 14
};
```

### Código:

```typescript
const completedLessons = 12; // 12 aulas concluídas
const remainingLessons = 88; // 88 aulas restantes
const daysActive = 4;

const { date } = SmartForecastEngine.quickForecast(
  completedLessons,
  remainingLessons,
  daysActive
);

console.log(`🎯 Conclusão estimada: ${date.toLocaleDateString('pt-BR')}`);
// Output: 🎯 Conclusão estimada: 15/05/2026
```

---

## 📖 Exemplo 3: App de Leitura (Unidade: Páginas)

### Contexto:
Usuário quer terminar um livro de 500 páginas.

### Configuração:

```typescript
export const FORECAST_CONFIG = {
  BAYES_C: 10,              // ⬆️ Leitura é irregular (mais inércia)
  GLOBAL_VELOCITY_PRIOR: 20, // 20 páginas/dia (média global)
  EWMA_ALPHA: 0.15,         // Menos reativo
  MEDIAN_WINDOW_SIZE: 5,     // Janela maior
  COLD_START_DAYS: 21        // Transição mais lenta
};
```

### Código:

```typescript
const pagesRead = 150;
const pagesRemaining = 350;
const daysActive = 7;

const { date, velocity } = SmartForecastEngine.quickForecast(
  pagesRead,
  pagesRemaining,
  daysActive
);

console.log(`📚 Você terminará o livro em: ${date.toLocaleDateString('pt-BR')}`);
console.log(`📖 Ritmo: ${velocity.toFixed(1)} páginas/dia`);

// Output:
// 📚 Você terminará o livro em: 10/03/2026
// 📖 Ritmo: 18.2 páginas/dia
```

---

## 🏋️ Exemplo 4: Academia (Unidade: Treinos)

### Contexto:
Usuário com meta de 90 treinos em 3 meses.

### Configuração:

```typescript
export const FORECAST_CONFIG = {
  BAYES_C: 7,
  GLOBAL_VELOCITY_PRIOR: 4, // 4 treinos/semana = 0.57 treinos/dia
  EWMA_ALPHA: 0.2,
  MEDIAN_WINDOW_SIZE: 7,     // Janela semanal
  COLD_START_DAYS: 14
};
```

### Código:

```typescript
const completedWorkouts = 8;
const remainingWorkouts = 82;
const daysActive = 14; // 2 semanas

const { date } = SmartForecastEngine.quickForecast(
  completedWorkouts,
  remainingWorkouts,
  daysActive
);

console.log(`💪 Meta de treinos alcançada em: ${date.toLocaleDateString('pt-BR')}`);
// Output: 💪 Meta de treinos alcançada em: 25/06/2026
```

---

## 🔄 Exemplo 5: Processamento Diário (StateFul)

### Contexto:
Sistema que processa atualizações diárias e mantém estado persistido.

### Setup Inicial:

```typescript
import { SmartForecastEngine, ForecastState } from './utils/SmartForecastEngine';

// 1. Criar estado inicial (1x na vida do usuário)
let userState: ForecastState = SmartForecastEngine.createInitialState(
  'user-456',
  '2026-01-01'
);

// Persistir no banco:
// await db.updateForecastState(userId, userState);
```

### Atualização Diária:

```typescript
// 2. A cada dia, processar nova atividade
const todayActivity = {
  date: new Date('2026-01-15'),
  itemsCompleted: 45 // 45 minutos estudados hoje
};

const totalItems = 3000; // Total de minutos no curso

const { newState, prediction } = SmartForecastEngine.processDailyUpdate(
  todayActivity,
  userState,
  totalItems
);

// 3. Salvar novo estado
userState = newState;
// await db.updateForecastState(userId, newState);

console.log(`📅 Nova previsão: ${prediction.date.toLocaleDateString('pt-BR')}`);
console.log(`⚡ Velocidade: ${prediction.velocity.toFixed(1)} min/dia`);
console.log(`🚀 Fase: ${prediction.phase}`);
```

---

## 📊 Exemplo 6: Dashboard com Múltiplas Métricas

### Contexto:
Painel administrativo que exibe estatísticas de vários usuários.

### Código:

```typescript
interface UserProgress {
  userId: string;
  completedMinutes: number;
  remainingMinutes: number;
  daysActive: number;
}

const users: UserProgress[] = [
  { userId: 'user-1', completedMinutes: 1200, remainingMinutes: 800, daysActive: 10 },
  { userId: 'user-2', completedMinutes: 300, remainingMinutes: 1700, daysActive: 3 },
  { userId: 'user-3', completedMinutes: 2500, remainingMinutes: 100, daysActive: 25 }
];

// Processar em batch
const forecasts = users.map(user => {
  const result = SmartForecastEngine.quickForecast(
    user.completedMinutes,
    user.remainingMinutes,
    user.daysActive
  );

  return {
    userId: user.userId,
    estimatedCompletion: result.date,
    velocity: result.velocity,
    phase: result.phase
  };
});

// Exibir tabela
console.table(forecasts.map(f => ({
  'User': f.userId,
  'Conclusão': f.estimatedCompletion.toLocaleDateString('pt-BR'),
  'Velocidade': `${f.velocity.toFixed(1)} min/dia`,
  'Fase': f.phase
})));

// Output:
// ┌─────────┬────────────┬──────────────┬─────────────────┬─────────────┐
// │ (index) │    User    │   Conclusão  │   Velocidade    │    Fase     │
// ├─────────┼────────────┼──────────────┼─────────────────┼─────────────┤
// │    0    │  'user-1'  │  '15/03/2026' │  '24.3 min/dia' │ 'COLD_START'│
// │    1    │  'user-2'  │  '25/06/2026' │  '28.8 min/dia' │ 'COLD_START'│
// │    2    │  'user-3'  │  '20/01/2026' │  '100.0 min/dia'│ 'MATURITY'  │
// └─────────┴────────────┴──────────────┴─────────────────┴─────────────┘
```

---

## 🧪 Exemplo 7: Teste A/B (Comparação com Média Simples)

### Contexto:
Validar se Smart Forecast V2 reduz volatilidade.

### Código:

```typescript
const testUser = {
  history: [
    { day: 1, minutes: 240 },
    { day: 2, minutes: 40 },
    { day: 3, minutes: 0 }
  ],
  remaining: 2910
};

// Método Antigo (Média Simples)
const totalMinutes = testUser.history.reduce((sum, d) => sum + d.minutes, 0);
const simpleMeanVelocity = totalMinutes / testUser.history.length;
const simpleDaysRemaining = Math.ceil(testUser.remaining / simpleMeanVelocity);

console.log('❌ MÉDIA SIMPLES:');
console.log(`   Velocidade: ${simpleMeanVelocity.toFixed(1)} min/dia`);
console.log(`   Dias restantes: ${simpleDaysRemaining}`);

// Método Novo (Smart Forecast V2)
const bayesResult = SmartForecastEngine.quickForecast(
  totalMinutes,
  testUser.remaining,
  testUser.history.length
);

console.log('\n✅ SMART FORECAST V2:');
console.log(`   Velocidade: ${bayesResult.velocity.toFixed(1)} min/dia`);
console.log(`   Dias restantes: ${Math.ceil(testUser.remaining / bayesResult.velocity)}`);

// Output:
// ❌ MÉDIA SIMPLES:
//    Velocidade: 93.3 min/dia
//    Dias restantes: 32
//
// ✅ SMART FORECAST V2:
//    Velocidade: 31.5 min/dia
//    Dias restantes: 92
//
// 🎯 Redução de volatilidade: 66%
```

---

## 🎨 Exemplo 8: Formatação para UI

### Contexto:
Exibir previsão de forma amigável na interface.

### Código:

```typescript
function formatForecastForUI(
  completedMinutes: number,
  remainingMinutes: number,
  daysActive: number
) {
  const { date, velocity, phase } = SmartForecastEngine.quickForecast(
    completedMinutes,
    remainingMinutes,
    daysActive
  );

  // Cálculo de dias restantes
  const today = new Date();
  const daysRemaining = Math.ceil(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Badge de fase
  const phaseBadge = phase === 'COLD_START' 
    ? '🌱 Fase Inicial'
    : '🚀 Fase Matura';

  return {
    date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    daysRemaining,
    velocity: `${velocity.toFixed(1)} min/dia`,
    phaseBadge,
    tooltip: `Cálculo estabilizado por IA (${phase === 'COLD_START' ? 'Bayes' : 'EWMA'})`
  };
}

// Uso:
const forecast = formatForecastForUI(400, 1600, 5);

console.log(`📅 ${forecast.date} (em ${forecast.daysRemaining} dias)`);
console.log(`⚡ ${forecast.velocity}`);
console.log(`${forecast.phaseBadge}`);
console.log(`ℹ️  ${forecast.tooltip}`);

// Output:
// 📅 10 de abr (em 85 dias)
// ⚡ 18.8 min/dia
// 🌱 Fase Inicial
// ℹ️  Cálculo estabilizado por IA (Bayes)
```

---

## 🔧 Exemplo 9: Debugging e Logging

### Contexto:
Adicionar logs para troubleshooting.

### Código:

```typescript
function debugForecast(
  completedMinutes: number,
  remainingMinutes: number,
  daysActive: number
) {
  const startTime = Date.now();

  const result = SmartForecastEngine.quickForecast(
    completedMinutes,
    remainingMinutes,
    daysActive
  );

  const executionTime = Date.now() - startTime;

  console.log('🔍 FORECAST DEBUG:');
  console.log('  Input:', {
    completedMinutes,
    remainingMinutes,
    daysActive
  });
  console.log('  Config:', FORECAST_CONFIG);
  console.log('  Output:', {
    date: result.date.toISOString(),
    velocity: result.velocity,
    phase: result.phase
  });
  console.log(`  Performance: ${executionTime}ms`);

  return result;
}

debugForecast(280, 2910, 3);

// Output:
// 🔍 FORECAST DEBUG:
//   Input: { completedMinutes: 280, remainingMinutes: 2910, daysActive: 3 }
//   Config: { BAYES_C: 7, GLOBAL_VELOCITY_PRIOR: 5, ... }
//   Output: { date: '2026-04-18T...', velocity: 31.5, phase: 'COLD_START' }
//   Performance: 0.8ms
```

---

## 🚀 Exemplo 10: Otimização para Produção

### Contexto:
Cache de cálculos para reduzir processamento.

### Código:

```typescript
// Cache simples (em memória)
const forecastCache = new Map<string, { result: any, timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

function cachedForecast(
  userId: string,
  completedMinutes: number,
  remainingMinutes: number,
  daysActive: number
) {
  const cacheKey = `${userId}-${completedMinutes}-${remainingMinutes}-${daysActive}`;
  const cached = forecastCache.get(cacheKey);

  // Verifica cache
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('✅ Cache hit');
    return cached.result;
  }

  // Calcula
  console.log('🔄 Cache miss, recalculando...');
  const result = SmartForecastEngine.quickForecast(
    completedMinutes,
    remainingMinutes,
    daysActive
  );

  // Salva no cache
  forecastCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });

  return result;
}

// Uso:
cachedForecast('user-1', 500, 1500, 7); // Cache miss
cachedForecast('user-1', 500, 1500, 7); // Cache hit ✅
```

---

## 📚 Recursos Adicionais

- **Documentação:** `SMART_FORECAST_ENGINE_V2.md`
- **Calibração:** `FORECAST_CALIBRATION_GUIDE.md`
- **Testes:** `utils/SmartForecastEngine.test.ts`

---

**Última Atualização:** 15/01/2026  
**Versão:** 1.0.0
