# 📋 Sistema de Feedback Padronizado - FeedbackCard

## 🎯 Objetivo

Padronizar todas as mensagens de feedback do sistema (sucesso, erro, avisos) conforme o design visual da **Imagem 9**, garantindo consistência, profissionalismo e usabilidade.

---

## 🏗️ Arquitetura

### **1. Componente `FeedbackCard.tsx`**
Componente reutilizável que implementa o design system visual:

**Características:**
- Container escuro (`slate-800` a `slate-900`) com gradiente
- Bordas arredondadas (`rounded-2xl`)
- Sombra profissional (`shadow-2xl`)
- Ícones principais (⚠️ para erro, ✅ para sucesso)
- Estrutura hierárquica: **Título** → **Itens de Erro** → **Instruções**

**Interface:**
```typescript
interface FeedbackError {
  location: string;    // Ex: "Linha 3"
  field: string;       // Ex: "Tempo"
  issue: string;       // Ex: "o campo Tempo está inválido"
  value?: string;      // Ex: "f"
  instruction: string; // Ex: "Use apenas números ou o formato HH:MM:SS"
  action?: string;     // Ex: "Corrija e tente novamente."
}

interface FeedbackCardProps {
  type: 'error' | 'success';
  title: string;
  description?: string;
  errors?: FeedbackError[];
}
```

---

### **2. Utilitário `feedbackUtils.tsx`**

#### **`showFeedbackCard(props, options)`**
Exibe o FeedbackCard através do `react-hot-toast`:

```typescript
showFeedbackCard({
  type: 'error',
  title: '1 erro encontrado',
  errors: [
    {
      location: 'Linha 3',
      field: 'Tempo',
      issue: 'o campo Tempo está inválido.',
      value: '"f"',
      instruction: 'Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55).',
      action: 'Corrija e tente novamente.'
    }
  ]
}, {
  duration: 10000
});
```

#### **`parseImportError(errorMessage)`**
Converte mensagens de erro textuais em objetos `FeedbackError` estruturados:

**Entrada:**
```
"Linha 3: Campo 'Tempo' inválido ('f'). Use apenas números ou formato HH:MM:SS."
```

**Saída:**
```typescript
{
  location: "Linha 3",
  field: "Tempo",
  issue: "o campo Tempo está inválido.",
  value: "f",
  instruction: "Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55).",
  action: "Corrija e tente novamente."
}
```

---

## 🔄 Integração no `ConfigView.tsx`

### **Antes (Toast básico):**
```typescript
toast.error(`3 erros encontrados\n\nLinha 3: Campo vazio\nLinha 5: Tempo inválido`, {
  duration: 8000,
  style: { whiteSpace: 'pre-line' }
});
```

### **Depois (FeedbackCard):**
```typescript
const errorsStructured: FeedbackError[] = erros.slice(0, 5).map((erro) => {
  const parsed = parseImportError(erro);
  return parsed || fallbackError;
});

showFeedbackCard({
  type: 'error',
  title: `${erros.length} ${erros.length === 1 ? 'erro encontrado' : 'erros encontrados'}`,
  errors: errorsStructured,
}, {
  duration: 10000
});
```

---

## ✅ Casos de Uso

### **1. Erro de Validação (Imagem 9)**
![Referência: uploaded_image_1768325746886.png]

**Código:**
```typescript
showFeedbackCard({
  type: 'error',
  title: '1 erro encontrado',
  errors: [{
    location: 'Linha 3',
    field: 'Tempo',
    issue: 'o campo Tempo está inválido.',
    value: '"f"',
    instruction: 'Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55).',
    action: 'Corrija e tente novamente.'
  }]
});
```

---

### **2. Múltiplos Erros**
```typescript
showFeedbackCard({
  type: 'error',
  title: '3 erros encontrados',
  errors: [
    {
      location: 'Linha 2',
      field: 'Meta',
      issue: 'o campo Meta está vazio.',
      instruction: 'Preencha o campo Meta com um valor válido.',
      action: 'Corrija e tente novamente.'
    },
    {
      location: 'Linha 5',
      field: 'Tempo',
      issue: 'o campo Tempo está inválido.',
      value: '90x',
      instruction: 'Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55).',
      action: 'Corrija e tente novamente.'
    },
    {
      location: 'Linha 8',
      field: 'Assunto',
      issue: 'o campo Assunto está vazio.',
      instruction: 'Preencha o campo Assunto com um valor válido.',
      action: 'Corrija e tente novamente.'
    }
  ]
});
```

---

### **3. Sucesso na Importação**
```typescript
showFeedbackCard({
  type: 'success',
  title: '15 linhas importadas com sucesso',
  description: 'Revise os dados abaixo e clique em "Adicionar ao Plano".'
}, {
  duration: 5000
});
```

---

### **4. Arquivo Vazio**
```typescript
showFeedbackCard({
  type: 'error',
  title: 'Nenhum dado válido encontrado',
  description: 'Verifique se o arquivo contém linhas preenchidas após o cabeçalho.'
}, {
  duration: 6000
});
```

---

## 📐 Padrões Visuais (Baseado na Imagem 9)

### **Container**
- Fundo: `bg-gradient-to-br from-slate-800 to-slate-900`
- Borda: `border border-slate-700/50`
- Sombra: `shadow-2xl shadow-slate-900/50`
- Bordas arredondadas: `rounded-2xl`
- Padding: `p-6`

### **Cabeçalho (Título)**
- Ícone: `AlertTriangle` (amber-500) ou `CheckCircle2` (emerald-500)
- Fonte: `text-white font-semibold text-base`

### **Corpo (Erros)**
- Ícone: `XCircle` em círculo vermelho (`bg-red-500/20`, `text-red-400`)
- **Localização:** `font-bold text-white` (Ex: "Linha 3:")
- **Descrição:** `text-slate-100 text-sm`
- **Valor informado:** `text-red-300 font-mono font-semibold`
- **Instrução:** `text-slate-300 text-xs`
- **Ação:** `text-slate-400 text-xs italic`

---

## 🚀 Como Usar em Outros Locais

```typescript
import { showFeedbackCard } from '../utils/feedbackUtils';

// Erro simples
showFeedbackCard({
  type: 'error',
  title: 'Falha na operação',
  description: 'Não foi possível salvar os dados.'
});

// Sucesso
showFeedbackCard({
  type: 'success',
  title: 'Operação concluída',
  description: 'Os dados foram salvos com sucesso.'
});
```

---

## 📝 Checklist de Implementação

- [x] Componente `FeedbackCard.tsx` criado
- [x] Utilitário `feedbackUtils.tsx` implementado
- [x] Parser `parseImportError` funcionando
- [x] Integração no `handleExcelUpload` do `ConfigView.tsx`
- [x] Visual idêntico à **Imagem 9**
- [x] Gramática correta (singular/plural)
- [x] Instruções claras e orientativas
- [ ] Testes com arquivo Excel real
- [ ] Expandir uso para outros módulos (se necessário)

---

## 🎨 Resultado Final

O sistema agora exibe mensagens de erro **profissionais, estruturadas e orientativas**, seguindo exatamente o design da **Imagem 9**, com:

✅ **Título dinâmico** ("1 erro encontrado" / "X erros encontrados")  
✅ **Lista estruturada** com localização, problema e solução  
✅ **Valor informado** destacado em vermelho  
✅ **Instruções claras** de como corrigir  
✅ **Design moderno** com gradiente escuro e sombras

---

*Autor: Antigravity AI*  
*Data: 2026-01-13*
