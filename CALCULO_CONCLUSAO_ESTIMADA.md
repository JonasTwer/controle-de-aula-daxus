# 📐 Fluxo Completo do Cálculo da Conclusão Estimada (V3.0)

## 🎯 Visão Geral
O sistema usa o **SmartForecastEngine V3.0** com **Sistema de Créditos de Esforço** + algoritmos Bayesianos + EWMA (Exponential Weighted Moving Average) para prever a data de conclusão do curso.

**Mudança Principal V3.0:** Substituição de "contagem de aulas" por "créditos ponderados por duração".

---

## 📊 FLUXO COMPLETO (DashboardView.tsx → SmartForecastEngine.ts)

### **ETAPA 1: Preparação dos Dados** (DashboardView.tsx - linhas 80-102)

```typescript
// 1.1 Verificação Inicial
if (stats.remainingCount === 0) {
  return '✓ Completo';  // Sem aulas restantes
}

// 1.2 Filtra apenas logs completados válidos
const completedLogs = logs.filter(l => 
  l.status === 'completed' && (l.durationSec || 0) > 0
);

if (completedLogs.length === 0) {
  return '---';  // Ainda não começou
}

// 1.3 Calcula dias ativos
const firstCompletedDate = completedLogs
  .map(l => new Date(l.date + 'T00:00:00'))
  .sort((a, b) => a.getTime() - b.getTime())[0];

const today = new Date();
const daysActive = Math.max(1, 
  Math.ceil((today.getTime() - firstCompletedDate.getTime()) / (1000 * 60 * 60 * 24))
);
```

**Resultado:**
- `daysActive` = Número de dias desde a primeira aula até hoje
- **Jonas**: 1 dia (de 14/01 até hoje)
- **Edson**: 3 dias (de 12/01 até 14/01)

---

### **ETAPA 2: ⚠️ V3.0 - Cálculo de Créditos de Esforço** (DashboardView.tsx - linhas 103-127)

#### **2A. Fórmula de Peso**

```typescript
// Função calculateWeight (SmartForecastEngine.ts)
export const calculateWeight = (durationMinutes: number): number => {
  return Math.max(0.1, durationMinutes / 15);
};
```

**Tabela de Conversão:**
| Duração | Créditos |
|---------|----------|
| 5 min   | 0.33     |
| 10 min  | 0.67     |
| 15 min  | 1.00     |
| 30 min  | 2.00     |
| 1h      | 4.00     |
| 3h      | 12.00    |

**Por que 15 minutos como divisor?**
- ✅ Unidade padrão de "blocos de estudo" (Pomodoro adaptado)
- ✅ Evita créditos muito pequenos ou muito grandes
- ✅ Facilita interpretação: 1.0 crédito = ~15 min de esforço

---

#### **2B. Soma dos Créditos Concluídos**

```typescript
// 2A. Soma dos créditos das aulas CONCLUÍDAS
const completedCredits = completedLogs.reduce((sum, log) => {
  const durationMinutes = (log.durationSec || 0) / 60;
  const credit = calculateWeight(durationMinutes);
  return sum + credit;
}, 0);
```

**Exemplo (Jonas - 5 aulas):**
```
Aula 1: 169 sec = 2.82 min → 2.82/15 = 0.19 créditos
Aula 2: 167 sec = 2.78 min → 2.78/15 = 0.19 créditos
Aula 3: 476 sec = 7.93 min → 7.93/15 = 0.53 créditos
Aula 4: 347 sec = 5.78 min → 5.78/15 = 0.39 créditos
Aula 5: 862 sec = 14.37 min → 14.37/15 = 0.96 créditos
Total: 2.26 créditos
```

**Exemplo (Edson - 7 aulas):**
```
Aula 1: 677 sec = 11.28 min → 11.28/15 = 0.75 créditos
Aula 2: 347 sec = 5.78 min → 5.78/15 = 0.39 créditos
Aula 3: 862 sec = 14.37 min → 14.37/15 = 0.96 créditos
Aula 4: 443 sec = 7.38 min → 7.38/15 = 0.49 créditos
Aula 5: 255 sec = 4.25 min → 4.25/15 = 0.28 créditos
Aula 6: 896 sec = 14.93 min → 14.93/15 = 1.00 créditos
Aula 7: 960 sec = 16.00 min → 16.00/15 = 1.07 créditos
Total: 4.94 créditos
```

---

#### **2C. Estimativa de Créditos Restantes**

```typescript
// 2B. Estimativa de créditos restantes (média × quantidade)
const avgCreditPerLesson = completedCredits / completedLogs.length;
const remainingCredits = avgCreditPerLesson * stats.remainingCount;
```

**Por que usar média?**
- Aulas restantes não estão no `logs`, apenas em `lessons`
- Para simplificar, assumimos que aulas restantes têm complexidade similar
- **Melhoria futura (V3.1):** Passar `lessons` como prop e calcular créditos exatos

**Cálculo (Jonas):**
```
Crédito Médio = 2.26 / 5 = 0.45 créditos/aula
Créditos Restantes = 0.45 × 457 = 205.65 créditos
```

**Cálculo (Edson):**
```
Crédito Médio = 4.94 / 7 = 0.71 créditos/aula
Créditos Restantes = 0.71 × 455 = 323.05 créditos
```

---

### **ETAPA 3: Histórico de Progresso Diário** (DashboardView.tsx - linhas 128-148)

```typescript
// 3. Prepara array dos últimos 7 dias
const recentDailyProgress: number[] = [];
const last7Days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return formatDateLocal(d);
});

// ⚠️ V3.0: Calcula CRÉDITOS ACUMULADOS por dia (não contagem!)
last7Days.forEach(dateStr => {
  const dailyCredits = completedLogs
    .filter(l => l.date === dateStr)
    .reduce((sum, log) => {
      const durationMinutes = (log.durationSec || 0) / 60;
      return sum + calculateWeight(durationMinutes);
    }, 0);
  recentDailyProgress.push(dailyCredits);
});
```

**Resultado (exemplo Jonas):**
- `[0, 0, 0, 0, 0, 0, 2.26]` → 2.26 créditos só hoje

**Resultado (exemplo Edson):**
- `[0, 0, 0, 0, 0.75, 1.84, 2.35]` → Distribuído em 3 dias

---

### **ETAPA 4: Recuperação de Velocidade EWMA Anterior** (DashboardView.tsx - linhas 149-152)

```typescript
// 4. Busca velocidade anterior no localStorage (para continuidade)
const storedEwmaKey = 'forecast_ewma_velocity';
const previousEwmaVelocity = localStorage.getItem(storedEwmaKey)
  ? parseFloat(localStorage.getItem(storedEwmaKey)!)
  : undefined;
```

**Por quê?**
- Em fase `MATURITY`, o EWMA cria "memória" entre sessões
- Evita saltos bruscos na previsão quando o usuário recarrega a página

---

### **ETAPA 5: Chamada do SmartForecastEngine** (DashboardView.tsx - linhas 154-161)

```typescript
const { date, phase, velocity } = SmartForecastEngine.quickForecast(
  completedCredits,      // ✅ V3.0: CRÉDITOS concluídos (não contagem!)
  remainingCredits,      // ✅ V3.0: CRÉDITOS restantes (não contagem!)
  daysActive,
  recentDailyProgress,   // ✅ Array de [créditos/dia] dos últimos 7 dias
  previousEwmaVelocity   // ✅ Ativa continuidade do EWMA
);
```

---

## 🧠 ALGORITMO DO SmartForecastEngine (SmartForecastEngine.ts)

### **FASE 1: Roteamento de Fase** (linhas 162-168)

```typescript
if (daysActive <= FORECAST_CONFIG.COLD_START_DAYS) {
  // ✅ FASE INICIAL: Bayesian Smoothing (Âncora de Segurança)
  phase = 'COLD_START';
  const C = FORECAST_CONFIG.BAYES_C;           // C = 7
  const prior = FORECAST_CONFIG.GLOBAL_VELOCITY_PRIOR; // Prior = 5.0 créditos/dia
  velocity = (C * prior + completedItems) / (C + daysActive);
} else {
  // ✅ FASE MADURA: Cascata de Filtros (Mediana → EWMA)
  phase = 'MATURITY';
  // ... (ver FASE 2)
}
```

**Limites de Fase:**
- **COLD_START**: daysActive ≤ 14 dias
- **MATURITY**: daysActive > 14 dias

**Jonas e Edson estão em COLD_START!**

---

### **FASE 1A: Cálculo Bayesiano (COLD_START)** (linhas 164-167)

```typescript
// ⚠️ V3.0: Fórmula Bayesiana com Créditos
const C = 7;              // Inércia (peso do conhecimento prévio)
const prior = 5.0;        // ⚠️ V3.0: 5.0 CRÉDITOS/DIA (não aulas!)
velocity = (C * prior + completedItems) / (C + daysActive);
```

**Fórmula:**
```
Velocidade = (C × Prior + Créditos_Obtidos) / (C + Dias_Ativos)
```

**Calibração do Prior:**
- **5.0 créditos/dia** = 5.0 × 15 min = **75 minutos/dia**
- Equivale a:
  - ~5 aulas de 15 min
  - ~2.5 aulas de 30 min
  - ~1.25 aulas de 1h

**Aplicando:**

**Jonas:**
```
C = 7, Prior = 5.0, Créditos = 2.26, Dias = 1
Velocidade = (7 × 5.0 + 2.26) / (7 + 1)
           = (35 + 2.26) / 8
           = 37.26 / 8
           = 4.66 créditos/dia
```

**Edson:**
```
C = 7, Prior = 5.0, Créditos = 4.94, Dias = 3
Velocidade = (7 × 5.0 + 4.94) / (7 + 3)
           = (35 + 4.94) / 10
           = 39.94 / 10
           = 3.99 créditos/dia
```

**Interpretação:**
- **Jonas**: 4.66 créd/dia ≈ 70 min/dia projetado
- **Edson**: 3.99 créd/dia ≈ 60 min/dia projetado

**Por que Jonas tem velocidade maior?**
- Ele estudou 2.26 créditos em apenas 1 dia → ritmo inicial explosivo
- O prior "puxa" para 5.0, mas o desempenho real está abaixo
- Edson distribuiu 4.94 créditos em 3 dias = 1.65 créd/dia real
- O prior "empresta" força, elevando para 3.99

---

### **FASE 2: Filtro de Mediana (MATURITY - linhas 173-176)**

```typescript
// 1. FILTRO DE MEDIANA (Anti-Outlier)
let cleanVelocity: number;
if (recentDailyProgress && recentDailyProgress.length >= MEDIAN_WINDOW_SIZE) {
  cleanVelocity = this.calculateMedian(recentDailyProgress);
} else {
  cleanVelocity = completedItems / daysActive;
}
```

**Objetivo:** Eliminar outliers (dias muito produtivos ou zerados)

---

### **FASE 3: EWMA (MATURITY - linhas 182-185)**

```typescript
// 2. EWMA (Exponential Weighted Moving Average)
const alpha = FORECAST_CONFIG.EWMA_ALPHA; // 0.2 = 20% novo
const prevVelocity = previousEwmaVelocity || cleanVelocity;
velocity = alpha * cleanVelocity + (1 - alpha) * prevVelocity;
```

**Fórmula:**
```
Velocidade_Nova = (0.2 × Velocidade_Hoje) + (0.8 × Velocidade_Anterior)
```

**Objetivo:** Suavizar flutuações, dar peso ao histórico

---

### **FASE 4: Projeção de Data** (linhas 189-190)

```typescript
// Projeção simples (sem sazonalidade no quickForecast)
const days = Math.ceil(remainingItems / Math.max(velocity, EPSILON));
const date = addDays(new Date(), days);
```

**Fórmula:**
```
Dias_Restantes = ⌈Créditos_Restantes / Velocidade⌉
Data_Conclusão = Hoje + Dias_Restantes
```

**Aplicando:**

**Jonas:**
```
Dias = ⌈205.65 / 4.66⌉ = ⌈44.13⌉ = 45 dias
Data = 18/01/2026 + 45 dias ≈ 04/03/2026
```

**Edson:**
```
Dias = ⌈323.05 / 3.99⌉ = ⌈80.96⌉ = 81 dias
Data = 18/01/2026 + 81 dias ≈ 09/04/2026
```

---

### **ETAPA 6: Salvar Velocidade EWMA** (DashboardView.tsx - linhas 163-165)

```typescript
// Salva nova velocidade EWMA para próxima execução (se fase madura)
if (phase === 'MATURITY') {
  localStorage.setItem(storedEwmaKey, velocity.toString());
}
```

**Objetivo:** Criar continuidade entre sessões

---

### **ETAPA 7: Formatação Final** (DashboardView.tsx - linha 168)

```typescript
// 5. RETORNAR DATA FORMATADA
return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
```

**Resultado:**
- **Jonas**: `"04/03"`
- **Edson**: `"09/04"`

---

## 📈 RESUMO VISUAL DO FLUXO V3.0

```
┌─────────────────────────────────────────────┐
│ 1. DashboardView.tsx                        │
│    ↓ Prepara dados brutos                   │
│    - Filtra logs completados                │
│    - Calcula daysActive                     │
│    - ⚠️ V3.0: CALCULA CRÉDITOS              │
│       • completedCredits (soma ponderada)   │
│       • remainingCredits (média × qty)      │
│    - Monta histórico de créditos/dia        │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. SmartForecastEngine.quickForecast()      │
│    ↓ Aplica lógica inteligente              │
│                                             │
│    A. Roteamento de Fase                    │
│       ├─ COLD_START (≤14 dias)              │
│       │  └─ Bayesian Smoothing              │
│       │     Velocidade = (C×Prior + Créd)   │
│       │                  / (C + Dias)       │
│       │     Prior = 5.0 CRÉDITOS/DIA ⚠️     │
│       │                                     │
│       └─ MATURITY (>14 dias)                │
│          ├─ Filtro de Mediana               │
│          └─ EWMA (suavização temporal)      │
│                                             │
│    B. Projeção                              │
│       Dias = Créditos_Restantes / Velocidade│
│       Data = Hoje + Dias                    │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 3. Retorno para Dashboard                   │
│    ↓ Exibe data formatada                   │
│    "04/03" ou "09/04"                       │
└─────────────────────────────────────────────┘
```

---

## 🔢 EXEMPLO PRÁTICO: JONAS vs EDSON (V3.0)

### **JONAS RAMOS**

**Entrada:**
- completedCredits = 2.26 créditos
- remainingCredits = 205.65 créditos
- daysActive = 1 dia
- recentDailyProgress = [0,0,0,0,0,0,2.26]

**Processamento:**
```
Fase: COLD_START
C = 7, Prior = 5.0

Velocidade = (7×5.0 + 2.26) / (7+1)
          = 37.26 / 8
          = 4.66 créditos/dia

Dias = ⌈205.65 / 4.66⌉ = 45 dias
Data = 18/01/2026 + 45 = 04/03/2026
```

**Saída:** `"04/03"`

---

### **EDSON FURTADO**

**Entrada:**
- completedCredits = 4.94 créditos
- remainingCredits = 323.05 créditos
- daysActive = 3 dias
- recentDailyProgress = [0,0,0,0,0.75,1.84,2.35]

**Processamento:**
```
Fase: COLD_START
C = 7, Prior = 5.0

Velocidade = (7×5.0 + 4.94) / (7+3)
          = 39.94 / 10
          = 3.99 créditos/dia

Dias = ⌈323.05 / 3.99⌉ = 81 dias
Data = 18/01/2026 + 81 = 09/04/2026
```

**Saída:** `"09/04"`

---

## ⚙️ CONFIGURAÇÃO DO SISTEMA (FORECAST_CONFIG V3.0)

```typescript
export const FORECAST_CONFIG = {
  BAYES_C: 7,                    // Inércia de 7 dias (peso do prior)
  GLOBAL_VELOCITY_PRIOR: 5.0,    // ⚠️ V3.0: 5.0 CRÉDITOS/DIA = 75 min/dia
  CREDIT_DIVISOR: 15,            // ⚠️ V3.0: 15 minutos = 1.0 crédito
  EWMA_ALPHA: 0.2,               // 20% novo, 80% histórico
  MEDIAN_WINDOW_SIZE: 3,         // Janela anti-outlier
  COLD_START_DAYS: 14,           // Limite entre fases
  SEASONALITY_LEARNING_RATE: 0.05,
  EPSILON: 0.1                   // Proteção contra divisão por zero
};
```

---

## 🎯 PONTOS-CHAVE V3.0

1. **O cálculo USA CRÉDITOS**, não contagem de aulas
2. **Crédito = Duração(min) / 15** → Peso proporcional ao esforço
3. **Prior de 5.0 créditos/dia** = 75 min/dia (âncora realista)
4. **Fase COLD_START** usa **Bayesian Smoothing** para estabilizar
5. **Velocidade do Jonas** (4.66) > **Velocidade do Edson** (3.99) porque:
   - Jonas tem ritmo inicial explosivo (2.26 créditos em 1 dia)
   - Edson distribuiu esforço (1.65 créd/dia real)
   - Prior "empresta força" mais para Jonas neste caso
6. **Jonas termina antes** porque:
   - Menos créditos restantes (205.65 vs 323.05)
   - Aulas médias mais curtas (0.45 vs 0.71 créd/aula)
   - Velocidade projetada maior (4.66 vs 3.99)

---

## 🔍 DIFERENÇAS V2.2 → V3.0

| Aspecto | V2.2 | V3.0 |
|---------|------|------|
| **Unidade de Medida** | Contagem de aulas | Créditos (duração/15) |
| **Prior** | 5 aulas/dia | 5.0 créditos/dia (~75 min) |
| **Progresso** | `logs.length` | `sum(duração/15)` |
| **Restante** | `stats.remainingCount` | `média × qty` |
| **Velocidade Jonas** | 5.00 aulas/dia | 4.66 créd/dia |
| **Velocidade Edson** | 4.20 aulas/dia | 3.99 créd/dia |
| **Distorção** | ❌ Incentiva "checks" | ✅ Modela esforço real |

---

## � **CONCLUSÃO**

O sistema V3.0 é **matematicamente justo**: 
- ✅ Aulas longas têm peso maior
- ✅ Aulas curtas não inflacionam velocidade
- ✅ Previsão baseada em **esforço real**, não em **metas superficiais**
- ✅ Prior calibrado para ~75 min/dia (padrão realista)

**Jonas ainda termina antes do Edson** porque:
- Tem menos trabalho pela frente (205 vs 323 créditos)
- Aulas mais curtas em média (0.45 vs 0.71 créd/aula)
- **MAS agora a previsão é JUSTA**, refletindo esforço real! ✅

---

**Criado em:** 18/01/2026  
**Versão do Engine:** SmartForecastEngine V3.0  
**Algoritmo:** Bayesian Smoothing + EWMA + Median Filter + **Credit-Based Weighting**
