# 🎯 Smart Forecast V3.0 - Quick Reference

## 📐 **FÓRMULA DE CRÉDITOS**

```
Crédito = Duração_em_Minutos / 15
```

## 📊 **TABELA DE CONVERSÃO**

| Duração da Aula | Créditos | Equivalente |
|----------------|----------|-------------|
| **5 min**      | 0.33     | 1/3 unidade |
| **10 min**     | 0.67     | 2/3 unidade |
| **15 min** ⭐  | **1.00** | **1 unidade base** |
| **30 min**     | 2.00     | 2 unidades |
| **45 min**     | 3.00     | 3 unidades |
| **1h (60 min)**| 4.00     | 4 unidades |
| **1h30 (90 min)** | 6.00  | 6 unidades |
| **2h (120 min)** | 8.00   | 8 unidades |
| **3h (180 min)** | 12.00  | 12 unidades |

---

## 🧮 **CÁLCULO DA VELOCIDADE (Bayesian)**

```
Velocidade = (C × Prior + Créditos_Obtidos) / (C + Dias_Ativos)

Onde:
C = 7 (inércia bayesiana)
Prior = 5.0 créditos/dia (75 min/dia)
```

---

## 💡 **EXEMPLOS PRÁTICOS**

### **Exemplo 1: Usuário "Velocista"**
```
Perfil: Muitas aulas curtas
- 10 aulas de 10 min = 10 × (10/15) = 6.67 créditos
- Tempo Total: 100 minutos
- Crédito por Aula: 0.67
```

### **Exemplo 2: Usuário "Maratonista"**
```
Perfil: Poucas aulas longas
- 2 aulas de 3h = 2 × (180/15) = 24.00 créditos
- Tempo Total: 360 minutos
- Crédito por Aula: 12.00
```

### **Comparação:**
| Métrica | Velocista | Maratonista | Vencedor |
|---------|-----------|-------------|----------|
| Aulas Completas | 10 | 2 | Velocista ❌ |
| Créditos Obtidos | 6.67 | 24.00 | **Maratonista ✅** |
| Tempo Real | 100 min | 360 min | Maratonista (3.6x) |

**V2.2 diria:** Velocista é 5x mais rápido ❌  
**V3.0 diz:** Maratonista tem 3.6x mais esforço ✅

---

## 🎯 **PRIOR BAYESIANO (5.0 créditos/dia)**

### **Equivalências:**
```
5.0 créditos/dia = 75 minutos/dia

Exemplos:
- 5 aulas de 15 min
- 2.5 aulas de 30 min
- 1.67 aulas de 45 min
- 1.25 aulas de 1h
```

### **Por que 5.0?**
- ✅ Padrão realista de estudo diário
- ✅ Protege contra previsões irrealistas
- ✅ "Âncora de segurança" para usuários novos

---

## 📈 **FLUXO SIMPLIFICADO**

```
1. CALCULAR CRÉDITOS CONCLUÍDOS
   └─ Soma: Σ (duração_i / 15)

2. ESTIMAR CRÉDITOS RESTANTES
   └─ Média × Quantidade

3. APLICAR BAYESIAN SMOOTHING
   └─ Velocidade = (7×5.0 + Créditos) / (7 + Dias)

4. PROJETAR DATA
   └─ Dias = Créditos_Restantes / Velocidade
```

---

## 🚀 **BENEFÍCIOS V3.0**

### ✅ **Justiça Matemática**
- Aulas longas = Mais peso
- Aulas curtas = Menos peso
- Peso proporcional ao esforço

### ✅ **Fim do "Efeito Flash"**
- Marcar aulas rápidas ≠ Produtividade
- Sistema premia esforço real

### ✅ **Precisão Industrial**
- Modelagem de carga de trabalho
- Calibração baseada em tempo real

---

## 🔧 **CONFIGURAÇÃO**

```typescript
FORECAST_CONFIG = {
  BAYES_C: 7,                  // Inércia bayesiana
  GLOBAL_VELOCITY_PRIOR: 5.0,  // 75 min/dia
  CREDIT_DIVISOR: 15,          // 15 min = 1 crédito
  EWMA_ALPHA: 0.2,             // 20% novo, 80% histórico
  COLD_START_DAYS: 14          // Fase inicial
}
```

---

## 📊 **CASO REAL: JONAS vs EDSON**

### **JONAS**
```
✅ Dados:
   - 5 aulas, média 6.74 min
   - Total: 33.68 min
   
✅ Créditos:
   - Obtidos: 2.26 (0.45/aula)
   - Restantes: 205.65
   
✅ Previsão:
   - Velocidade: 4.66 créd/dia
   - Conclusão: 04/03/2026 (45 dias)
```

### **EDSON**
```
✅ Dados:
   - 7 aulas, média 10.57 min
   - Total: 74.00 min
   
✅ Créditos:
   - Obtidos: 4.94 (0.71/aula)
   - Restantes: 323.05
   
✅ Previsão:
   - Velocidade: 3.99 créd/dia
   - Conclusão: 09/04/2026 (81 dias)
```

### **Análise:**
- Edson tem aulas **55% mais densas** (reconhecido! ✅)
- Edson tem **57% mais trabalho** pela frente (323 vs 205 créd)
- Jonas termina antes porque tem menos créditos restantes

---

## 🎓 **INTERPRETAÇÃO**

### **Para Usuários:**
```
Velocidade = 4.5 créd/dia
Significa: ~67 minutos de estudo efetivo/dia
```

### **Para Desenvolvedores:**
```
Crédito = Métrica de esforço normalizada
1.0 crédito = 15 minutos de trabalho
Prior = 5.0 créd/dia = 75 min/dia (âncora bayesiana)
```

---

## 🛡️ **GARANTIAS V3.0**

✅ **Não há distorção** entre velocistas e maratonistas  
✅ **Esforço real é reconhecido** proporcionalmente  
✅ **Prior calibrado** para padrão realista (75 min/dia)  
✅ **Bayesian Smoothing** estabiliza previsões iniciais  
✅ **EWMA** suaviza flutuações sem perder tendências  

---

**Versão:** 3.0.0  
**Algoritmo:** Bayesian + EWMA + Credit-Based Weighting  
**Divisor de Crédito:** 15 minutos = 1.0 crédito  
**Prior:** 5.0 créditos/dia (~75 min/dia)
