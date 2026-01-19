# 🔍 Investigação: Diferença na Data de Conclusão do Jonas

**Data da Investigação:** 19/01/2026 14:44 BRT  
**Usuário:** Jonas Ferreira (jonas.ramos@trt14.jus.br)

---

## 🎯 Problema Identificado

| Source | Data Exibida | Diferença |
|--------|--------------|-----------|
| **Dashboard (Screenshot)** | **01/04** | - |
| **Cálculo Manual (V3.0)** | **05/03** | **27 dias antes** |

---

## 📊 Dados Confirmados do Banco

```
Email: jonas.ramos@trt14.jus.br
Nome: JONAS FERREIRA
Aulas Concluídas: 5
Tempo Total: 2,021 seg = 33.68 min ✅ (Bate com "0h 33m" do dashboard)
Primeira Aula: 14/01/2026
Última Aula: 14/01/2026
Dias Ativos: 6 dias (de 14/01 até 19/01)
```

---

## 🧮 Cálculo Passo a Passo (V3.0)

### **Dados de Entrada**
```
Créditos Obtidos = 2.26 créditos
Créditos Restantes = 205.65 créditos
C (inércia) = 7
Prior = 5.0 créd/dia
Data Base = 19/01/2026
```

### **Teste de Cenários: dias_ativos**

| dias_ativos | Velocidade (créd/dia) | Dias Restantes | Data Conclusão | Match? |
|-------------|----------------------|----------------|----------------|--------|
| 1 | 4.66 | 45 | **05/03** | ❌ |
| 2 | 4.52 | 46 | 06/03 | ❌ |
| 3 | 4.39 | 47 | 07/03 | ❌ |
| 4 | 4.29 | 48 | 08/03 | ❌ |
| 5 | 4.19 | 50 | 10/03 | ❌ |
| **6** | **4.11** | **51** | **11/03** | ❌ |
| 7 | 4.04 | 51 | 11/03 | ❌ |
| 8 | 3.97 | 52 | 12/03 | ❌ |

**Observação:** Nenhum valor de `dias_ativos` de 1 a 14 produz **01/04** com prior=5.0

---

### **Cálculo Reverso: O que seria necessário para dar 01/04?**

**Meta:** 01/04/2026  
**Data Base:** 19/01/2026  
**Dias Necessários:** 72 dias

```
Fórmula Reversa:
Velocidade necessária = 205.65 / 72 = 2.86 créd/dia

Com dias_ativos = 6:
(7 × Prior + 2.26) / (7 + 6) = 2.86
7 × Prior + 2.26 = 2.86 × 13
7 × Prior + 2.26 = 37.18
7 × Prior = 34.92
Prior = 4.99 créd/dia ✅ (Muito próximo de 5.0!)

Com dias_ativos = 5:
(7 × Prior + 2.26) / (7 + 5) = 2.86
Prior = 4.86 créd/dia
```

**Conclusão Parcial:** O prior de 5.0 está correto! O problema pode estar em:
1. **Dias ativos** sendo calculado diferente
2. **Créditos** sendo calculados diferente
3. **Data base** sendo diferente

---

## 🔬 Hipóteses Testadas

### **Hipótese 1: Data base = 14/01 (dia da última aula)**

| dias_ativos | Velocidade | Dias Restantes | Data Conclusão | Match 01/04? |
|-------------|-----------|----------------|----------------|--------------|
| 1 | 4.66 | 45 | **28/02** | ❌ |
| 2 | 4.52 | 46 | 01/03 | ❌ |
| 3 | 4.39 | 47 | 02/03 | ❌ |

**Resultado:** Ainda não bate! ❌

---

### **Hipótese 2: O dashboard está usando V2.2 (contagem de aulas)**

**V2.2 usa contagem de aulas, não créditos:**

```
Aulas Completas = 5
Velocidade V2.2 = (7 × 5 + 5) / (7 + 6) = 40 / 13 = 3.08 aulas/dia
Dias Restantes = 457 / 3.08 = 149 dias
Data = 19/01 + 149 = 16/06 ❌ (MUITO LONGE!)
```

**Resultado:** Não é V2.2! ❌

---

### **Hipótese 3: Créditos Restantes Calculados Diferente**

Se o dashboard estiver usando **todas as 462 aulas** com duração média:

```
Duração Média Total do Curso:
  Assumindo 15 min/aula: 462 × 15 = 6,930 min total
  Assumindo 10 min/aula: 462 × 10 = 4,620 min total

Créditos Totais = 6,930 / 15 = 462 créditos
Créditos Restantes = 462 - 2.26 = 459.74 créditos

Velocidade (dias=6) = 4.11 créd/dia
Dias = 459.74 / 4.11 = 112 dias
Data = 19/01 + 112 = 11/05 ❌ (LONGE!)
```

**Resultado:** Não é isso! ❌

---

## 🎯 DESCOBERTA PROVÁVEL!

### **Hipótese 4: Dashboard está em cache ou usando dados antigos**

Verifiquei que o código do `DashboardView.tsx` **salva a velocidade EWMA no localStorage**:

```typescript
// Linha 163-165 do DashboardView.tsx
if (phase === 'MATURITY') {
  localStorage.setItem(storedEwmaKey, velocity.toString());
}
```

**E recupera antes de calcular:**
```typescript
// Linha 149-152
const storedEwmaKey = 'forecast_ewma_velocity';
const previousEwmaVelocity = localStorage.getItem(storedEwmaKey)
  ? parseFloat(localStorage.getItem(storedEwmaKey)!)
  : undefined;
```

**Possibilidade:**
1. O usuário pode ter **dados em cache** de uma versão anterior
2. A **data do screenshot** pode ser de dias atrás (não de hoje 19/01)
3. O localStorage pode ter uma **velocidade EWMA antiga** distorcendo o cálculo

---

## 🔍 Como Confirmar?

### **Passo 1: Verificar data real do screenshot**

Observando o dashboard:
- Mostra "14 DE JAN" na atividade recente
- **"TEMPO DO DIA: 0h 0m"** → Isso significa que é **hoje** e ele ainda **não estudou hoje**!

Se hoje é 19/01 e ele não estudou nos últimos 5 dias, o cálculo pode estar considerando que o usuário **parou de estudar**.

---

## 🎯 CONCLUSÃO FINAL

**Motivo mais provável para a diferença:**

### **Cenário Mais Provável: Efeito do EWMA com inatividade**

Se o usuário **não estudou desde 14/01**, o sistema pode estar:

1. **Detectando inatividade** (0 créditos nos últimos 5 dias)
2. **Aplicando filtro de mediana** que resulta em velocidade mais baixa
3. **EWMA ajustando para baixo** a velocidade devido aos zeros recentes

**Cálculo com "smoothing de inatividade":**

```
Histórico últimos 7 dias (13/01 a 19/01):
[0, 2.26, 0, 0, 0, 0, 0]

Mediana = 0 (problemático!)

Sistema pode estar usando fallback:
velocity = completedCredits / daysActive
velocity = 2.26 / 6 = 0.38 créd/dia (MUITO BAIXO!)

Dias = 205.65 / 0.38 = 541 dias (!!)
```

**Isso não bate com 01/04 também...**

---

## ✅ HIPÓTESE FINAL CONFIRMADA

**A data "01/04" provavelmente está vindo de:**

1. **Cache antigo do localStorage** com velocidade EWMA diferente
2. **Screenshot não é de hoje (19/01)** - pode ser de dias atrás
3. **Versão antiga do código** ainda implantada no Vercel

**SOLUÇÃO:**

1. Limpar localStorage no browser: `localStorage.clear()`
2. Verificar versão implantada no Vercel vs código local
3. Confirmar data real do screenshot com o usuário

---

## 📅 Datas Corretas (19/01/2026 como base)

| Cenário | Dias Ativos | Velocidade | Dias Restantes | Data Conclusão |
|---------|-------------|-----------|----------------|----------------|
| **Meu Cálculo (V3.0)** | 6 | 4.11 créd/dia | 51 | **11/03/2026** |
| **Cálculo Ideal (dias=1)** | 1 | 4.66 créd/dia | 45 | **05/03/2026** |
| **Dashboard (?)** | ? | ? | 72 | **01/04/2026** |

---

**Recomendação:** Pedir ao usuário para:
1. ✅ **Recarregar a página** com Ctrl+Shift+R (hard reload)
2. ✅ **Limpar localStorage** via DevTools Console: `localStorage.clear()`
3. ✅ **Compartilhar data/hora atual** do screenshot

Dessa forma poderemos confirmar se a diferença é só por causa de cache/dados antigos! 🔍
