# 🎛️ Guia de Calibração - Smart Forecast V2

Este guia ajuda a ajustar os parâmetros do motor de previsão conforme o comportamento observado dos usuários.

---

## 📋 Parâmetros Disponíveis

```typescript
export const FORECAST_CONFIG = {
  BAYES_C: 7,              // Inércia Bayesiana
  GLOBAL_VELOCITY_PRIOR: 5, // Velocidade esperada (default)
  EWMA_ALPHA: 0.2,         // Reatividade EWMA
  MEDIAN_WINDOW_SIZE: 3,   // Janela do filtro de mediana
  COLD_START_DAYS: 14      // Dias para sair do modo Cold Start
};
```

---

## 🎯 1. BAYES_C (Inércia)

### O Que Faz:
Controla o **peso do conhecimento prévio** vs. dados reais.

### Valores Recomendados:
| Valor | Comportamento              | Quando Usar                     |
|-------|----------------------------|---------------------------------|
| 3-5   | Baixa inércia              | Usuários muito consistentes     |
| **7** | **Balanceado (Default)**   | **Maioria dos casos**           |
| 10-14 | Alta inércia               | Usuários muito intermitentes    |

### Como Testar:
1. Crie um usuário teste
2. Dia 1: 4h, Dia 2: 40min, Dia 3: 0h
3. Ajuste `BAYES_C` e observe a previsão no Dia 3

**Exemplo:**
```typescript
// C = 3 → Previsão: 25/04 (mais reativa)
// C = 7 → Previsão: 18/04 (balanceado)
// C = 14 → Previsão: 12/04 (mais conservador)
```

---

## 🚀 2. GLOBAL_VELOCITY_PRIOR (Velocidade Padrão)

### O Que Faz:
Define a **expectativa inicial** de quanto o usuário progride por dia.

### Calibração:

#### Opção A: Baseado em Minutos
```typescript
// Se a média global é 60 min/dia:
GLOBAL_VELOCITY_PRIOR: 60
```

#### Opção B: Baseado em Aulas
```typescript
// Se a média global é 3 aulas/dia:
GLOBAL_VELOCITY_PRIOR: 3
```

### Como Calibrar:
1. Analise os últimos 30 dias de todos os usuários
2. Calcule a mediana da velocidade diária:
   ```sql
   SELECT MEDIAN(daily_progress) FROM study_logs
   WHERE created_at >= NOW() - INTERVAL '30 days'
   ```
3. Use esse valor como `GLOBAL_VELOCITY_PRIOR`

**Importante:** O Prior deve estar na **mesma unidade** que `itemsCompleted` (minutos ou aulas).

---

## ⚡ 3. EWMA_ALPHA (Reatividade)

### O Que Faz:
Controla o **peso de dados novos** vs. tendência histórica (após 14 dias).

### Valores Recomendados:
| Valor | Comportamento              | Quando Usar                     |
|-------|----------------------------|---------------------------------|
| 0.1   | Muito suave                | Dados muito ruidosos            |
| **0.2** | **Balanceado (Default)**   | **Maioria dos casos**           |
| 0.3-0.5 | Mais reativo               | Usuários com mudanças reais     |

### Exemplo Prático:
```
Histórico: 2h/dia (velocidade)
Dia Novo: 0h (outlier)

α = 0.1 → Nova velocidade: 0.1*0 + 0.9*2 = 1.8h ✅ (ignora quase totalmente)
α = 0.5 → Nova velocidade: 0.5*0 + 0.5*2 = 1.0h ⚠️ (reage demais)
```

---

## 🪟 4. MEDIAN_WINDOW_SIZE (Janela de Mediana)

### O Que Faz:
Define quantos dias recentes são usados para calcular a mediana (filtro anti-outlier).

### Valores Recomendados:
| Valor | Comportamento              | Quando Usar                     |
|-------|----------------------------|---------------------------------|
| 3     | **Padrão semanal**         | **Recomendado (Default)**       |
| 5     | Janela maior               | Dados muito ruidosos            |
| 7     | Proteção máxima            | Usuários com muitos outliers    |

### Exemplo:
```typescript
// Últimos 7 dias: [2h, 2h, 0h, 2h, 0h, 2h, 2h]

MEDIAN_WINDOW_SIZE: 3 → Mediana([0h, 2h, 2h]) = 2h ✅
MEDIAN_WINDOW_SIZE: 7 → Mediana([2h, 2h, 0h, ...]) = 2h ✅

// NOTA: Janelas maiores consomem mais memória no buffer
```

---

## 📅 5. COLD_START_DAYS (Transição)

### O Que Faz:
Define após **quantos dias** o sistema muda de **Bayes → EWMA**.

### Valores Recomendados:
| Valor | Comportamento              | Quando Usar                     |
|-------|----------------------------|---------------------------------|
| 7     | Transição rápida           | Usuários super consistentes     |
| **14** | **Balanceado (Default)**   | **Maioria dos casos**           |
| 21    | Transição lenta            | Usuários muito intermitentes    |

### Como Decidir:
- **Menos dias:** Use se os usuários rapidamente estabilizam o ritmo
- **Mais dias:** Use se os primeiros dias têm muito ruído

---

## 🧪 Procedimento de Calibração Completo

### Passo 1: Análise Inicial
```sql
-- Velocidade Mediana Global
SELECT MEDIAN(total_minutes / days_active) as median_velocity
FROM user_stats;

-- Distribuição de Atividade
SELECT 
  PERCENTILE_CONT(0.25) as p25,
  PERCENTILE_CONT(0.50) as median,
  PERCENTILE_CONT(0.75) as p75
FROM daily_activity;
```

### Passo 2: Configuração Inicial
```typescript
FORECAST_CONFIG = {
  BAYES_C: 7,
  GLOBAL_VELOCITY_PRIOR: <median_velocity>,  // Do SQL acima
  EWMA_ALPHA: 0.2,
  MEDIAN_WINDOW_SIZE: 3,
  COLD_START_DAYS: 14
};
```

### Passo 3: Teste A/B
1. Mantenha 50% dos usuários no algoritmo atual
2. Ative V2 para outros 50%
3. Compare após 7 dias:
   - **Métrica 1:** Desvio médio absoluto (MAE)
   - **Métrica 2:** Satisfação do usuário (NPS)

### Passo 4: Ajuste Fino
```typescript
// Se previsões forem MUITO VOLÁTEIS:
BAYES_C: 10,           // ⬆️ Aumentar inércia
EWMA_ALPHA: 0.1        // ⬇️ Reduzir reatividade

// Se previsões forem MUITO LENTAS para reagir:
BAYES_C: 5,            // ⬇️ Reduzir inércia
EWMA_ALPHA: 0.3        // ⬆️ Aumentar reatividade
```

---

## 🎓 Casos de Uso Específicos

### Caso 1: Escola/Universidade (Aulas)
```typescript
FORECAST_CONFIG = {
  BAYES_C: 7,
  GLOBAL_VELOCITY_PRIOR: 3,  // 3 aulas/dia
  EWMA_ALPHA: 0.2,
  MEDIAN_WINDOW_SIZE: 3,
  COLD_START_DAYS: 14
};
```

### Caso 2: Plataforma de Estudo (Minutos)
```typescript
FORECAST_CONFIG = {
  BAYES_C: 7,
  GLOBAL_VELOCITY_PRIOR: 60,  // 60 min/dia
  EWMA_ALPHA: 0.2,
  MEDIAN_WINDOW_SIZE: 3,
  COLD_START_DAYS: 14
};
```

### Caso 3: Leitura de Livros (Páginas)
```typescript
FORECAST_CONFIG = {
  BAYES_C: 10,               // Mais inércia (leitura é irregular)
  GLOBAL_VELOCITY_PRIOR: 20,  // 20 páginas/dia
  EWMA_ALPHA: 0.15,          // Menos reativo
  MEDIAN_WINDOW_SIZE: 5,      // Janela maior
  COLD_START_DAYS: 21         // Transição lenta
};
```

---

## 📊 Métricas de Validação

### 1. Mean Absolute Error (MAE)
```typescript
// Calcula quanto a previsão erra em média
MAE = Σ|data_prevista - data_real| / n
```

### 2. Volatilidade (Desvio Padrão)
```typescript
// Quanto a previsão oscila dia a dia
σ = √(Σ(previsão_hoje - previsão_ontem)² / n)
```

### 3. Taxa de Acerto (±3 dias)
```typescript
// % de previsões que acertaram dentro de ±3 dias
Acerto = (previsões_corretas / total_previsões) * 100
```

**Meta de Qualidade:**
- MAE < 5 dias ✅
- σ < 2 dias ✅
- Acerto > 80% ✅

---

## 🔧 Ferramentas de Debug

### Console de Calibração
Adicione logs temporários no `SmartForecastEngine.ts`:

```typescript
console.log('[FORECAST DEBUG]', {
  phase,
  velocity,
  daysActive,
  completedTotal: newState.itemsCompletedTotal,
  buffer: newState.velocityBuffer
});
```

### Dashboard de Calibração (Futuro)
```typescript
// Endpoint para análise
GET /api/forecast/analytics
{
  "median_mae": 3.2,
  "median_volatility": 1.5,
  "accuracy_rate": 87.3,
  "config": { /* FORECAST_CONFIG atual */ }
}
```

---

## ✅ Checklist de Calibração

- [ ] Analisar velocidade mediana global
- [ ] Definir unidade (minutos, aulas, páginas)
- [ ] Configurar `GLOBAL_VELOCITY_PRIOR`
- [ ] Testar com usuário real (3 dias)
- [ ] Validar volatilidade (< 2 dias)
- [ ] Validar MAE (< 5 dias)
- [ ] Documentar configuração final
- [ ] Revisar a cada 3 meses

---

**Última Atualização:** Janeiro 2026  
**Versão:** 1.0.0
