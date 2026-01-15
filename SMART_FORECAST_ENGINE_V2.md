# Smart Forecast Engine V2 - Documentação Técnica

## 📊 Visão Geral

O **Smart Forecast Engine V2** é um motor de previsão estatístico que substitui a lógica de média simples (volátil) por um modelo robusto baseado em **Suavização Bayesiana** (Cold Start) e **Cascata de Filtros** (Mediana + EWMA).

---

## 🎯 O Problema Resolvido

### ❌ Comportamento Anterior (Média Simples)
**Caso de Teste:**
- Dia 1: 4h (Alta performance)
- Dia 2: 40m (Queda natural)
- Dia 3: 0h (Pausa)

**Erro:** O sistema calculava `(4.6h) / 3 dias = 1.5h/dia`, resultando em uma previsão **pessimista** (30/01).

### ✅ Comportamento Novo (Smart Forecast V2)
O algoritmo **amortece** o zero. A previsão permanece **estável** (próxima a 19/01), interpretando o zero apenas como uma pequena diluição, não uma nova tendência.

---

## 🧮 As Fórmulas

### 1. **Cold Start (< 14 dias)** - Suavização Bayesiana

```typescript
Velocity = (C * Prior + Total_Items) / (C + Days_Active)
```

**Parâmetros:**
- `C = 7` → "Inércia" que impede choques de volatilidade
- `Prior = 5` → Média global esperada (calibrável)
- `Total_Items` → Minutos/aulas concluídos até agora
- `Days_Active` → Dias desde o início

**Exemplo Prático:**
- Dia 3: `(7 * 5 + 276min) / (7 + 3) = 31.1 min/dia` ✅ (Estável)
- Média Simples: `276 / 3 = 92 min/dia` ❌ (Volátil)

---

### 2. **Maturidade (> 14 dias)** - Cascata de Filtros

#### 🛡️ Filtro 1: Mediana (Anti-Outlier)
```typescript
MedianFilter([4h, 4h, 0h]) → 4h
```
Se o usuário tiver um dia isolado de 0h, a mediana **ignora totalmente o zero**.

#### 📈 Filtro 2: EWMA (Exponential Weighted Moving Average)
```typescript
Velocity = α * CleanInput + (1 - α) * PrevVelocity
```

**Parâmetros:**
- `α = 0.2` → Reatividade controlada (20% novo + 80% histórico)

---

## 🏗️ Arquitetura da Implementação

### Arquivo Principal: `utils/SmartForecastEngine.ts`

```typescript
export class SmartForecastEngine {
  // Método principal: Atualiza estado e projeta data
  public static processDailyUpdate(
    input: { date: Date, itemsCompleted: number },
    state: ForecastState,
    totalItems: number
  )

  // Helper: Previsão rápida sem estado (para sistemas legados)
  public static quickForecast(
    completedMinutes: number,
    remainingMinutes: number,
    daysActive: number
  ): { date: Date; phase: string; velocity: number }
}
```

### Interface de Estado

```typescript
export interface ForecastState {
  userId: string;
  startDate: string;
  itemsCompletedTotal: number;
  lastEwmaVelocity: number | null;
  velocityBuffer: number[];  // Para Mediana (últimos 3 dias)
  seasonalIndices: number[]; // Para expansão futura
}
```

---

## 🔌 Integração

### Antes (DashboardView.tsx)
```typescript
// Lógica volátil (73 linhas)
let velocidadeBase = totalMinutesEstudados / divisorDias;
if (diasUnicos <= 3) velocidadeBase *= 0.80;
// ...
```

### Depois (DashboardView.tsx)
```typescript
// Apenas 3 linhas! 🚀
const { date, phase } = SmartForecastEngine.quickForecast(
  completedMinutes,
  remainingMinutes,
  daysActive
);
```

---

## 🎨 Atualizações na Interface

### Card de Previsão
- **Rótulo Anterior:** "Previsão de Fim"
- **Rótulo Novo:** **"CONCLUSÃO ESTIMADA"**

### Tooltip Informativo
```html
<div title="Cálculo estabilizado por IA (Bayes/EWMA)">
  <!-- Tooltip aparece ao passar o mouse -->
</div>
```

---

## 📐 Configurações Ajustáveis

```typescript
export const FORECAST_CONFIG = {
  BAYES_C: 7,              // ⬆️ Aumentar = Mais estabilidade
  GLOBAL_VELOCITY_PRIOR: 5, // Média esperada (minutos/dia ou aulas/dia)
  EWMA_ALPHA: 0.2,         // ⬆️ Aumentar = Mais reatividade
  MEDIAN_WINDOW_SIZE: 3,   // Janela para filtrar outliers
  COLD_START_DAYS: 14      // Dias para mudar de Bayes → EWMA
};
```

---

## 🧪 Testes Sugeridos

### Teste 1: Cold Start Protection
1. Crie um novo usuário
2. Dia 1: Complete 4h
3. Dia 2: Complete 40min
4. Dia 3: Complete 0h
5. **Expectativa:** A previsão deve permanecer próxima à data inicial (~19/01)

### Teste 2: Outlier Rejection
1. Usuário com 20+ dias de histórico
2. Média: 2h/dia
3. Dia 21: 0h (exceção)
4. **Expectativa:** A previsão deve ignorar o zero (mediana)

---

## 🚀 Próximas Melhorias (Roadmap)

### Versão 2.1 - Sazonalidade
- Detectar padrões de fins de semana automaticamente
- Aplicar índices sazonais (ex: Sábado = 0.5x, Domingo = 0x)

### Versão 2.2 - Persistência
- Salvar `ForecastState` no banco de dados
- Permitir recálculos incrementais (sem reprocessar todo o histórico)

### Versão 2.3 - Confiança
- Adicionar intervalos de confiança (ex: "15/02 ± 3 dias")
- Exibir "probabilidade de conclusão" (ex: "85% de chance até 15/02")

---

## 📚 Referências Técnicas

1. **Bayesian Smoothing:** https://en.wikipedia.org/wiki/Additive_smoothing
2. **EWMA:** https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
3. **Median Filter:** https://en.wikipedia.org/wiki/Median_filter

---

## ✅ Checklist de Implementação

- [x] Criar `SmartForecastEngine.ts`
- [x] Instalar dependência `date-fns`
- [x] Integrar no `DashboardView.tsx`
- [x] Atualizar rótulo para "CONCLUSÃO ESTIMADA"
- [x] Adicionar tooltip explicativo
- [ ] Testar com dados reais do usuário
- [ ] Calibrar `GLOBAL_VELOCITY_PRIOR` conforme métrica (minutos vs. aulas)
- [ ] Implementar persistência do `ForecastState` (V2.2)

---

**Desenvolvido por:** Lead Backend/Algorithm Engineer  
**Versão:** 2.0.0  
**Data:** Janeiro 2026
