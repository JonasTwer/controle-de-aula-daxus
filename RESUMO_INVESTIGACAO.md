# 🔍 Resumo: Por que Dashboard mostra 01/04?

## ❓ Pergunta
Dashboard mostra **01/04** mas o cálculo manual deu **05/03**. Por quê?

## ✅ Dados Confirmados
- **Jonas CORRETO**: jonas.ramos@trt14.jus.br (JONAS FERREIRA) ✅
- **5 aulas, 33.68 min** - Bate com dashboard "0h 33m" ✅
- **Dias ativos**: 6 dias (de 14/01 até 19/01/2026) ✅

## 🎯 Causa Mais Provável

### **CACHE/DADOS ANTIGOS NO NAVIGATOR**

O código do `DashboardView.tsx` **salva velocidade EWMA no localStorage**:
```typescript
localStorage.setItem('forecast_ewma_velocity', velocity.toString());
```

**Problema:** Se houver velocidade antiga no cache, ela distorce o cálculo!

## 📊 Cálculos Comparados

| Cenário | Data Base | Dias Ativos | Velocidade | Data Conclusão |
|---------|-----------|-------------|-----------|----------------|
| **Cálculo V3.0 Correto** | 19/01 | 6 | 4.11 créd/dia | **11/03** |
| **Com dias=1** | 19/01 | 1 | 4.66 créd/dia | **05/03** |
| **Dashboard (?)** | ? | ? | ? | **01/04** ❓ |

### **Cálculo Reverso:**
Para dar **01/04** (72 dias):
- Velocidade necessária: **2.86 créd/dia**
- MUITO MAIS BAIXA que o esperado (4.11)!

Isso indica:
1. **EWMA antigo reduzindo velocidade**
2. **Cache desatualizado**
3. **Ou screenshot não é de hoje**

## 🔧 SOLUÇÃO

Pedir ao usuário para:

1. **Ctrl+Shift+R** (hard reload da página)
2. **Limpar localStorage:**
   ```javascript
   localStorage.clear()
   ```
3. **Verificar data/hora do screenshot**

Após limpar cache, a data deve atualizar para **~11/03** (com 6 dias ativos) ou **~05/03** (se recalcular como 1 dia)!

## 📋 Checklist de Verificação

- [ ] Confirmar que screenshot é de hoje (19/01/2026)
- [ ] Limpar localStorage do navegador
- [ ] Recarregar página (Ctrl+Shift+R)
- [ ] Verificar se versão do Vercel está atualizada com V3.0
- [ ] Comparar nova data exibida

---

**Arquivo Completo:** `INVESTIGACAO_DIFERENCA_DATA.md`  
**Criado em:** 19/01/2026 14:44 BRT
