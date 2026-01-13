# 🚀 Guia de Deploy - CoursePlanner AI no Vercel

## ⚠️ Problema Identificado

A URL `courseplanner.vercel.app` está atualmente deployando um **projeto DIFERENTE** (um catálogo de cursos estático). Este guia mostrará como corrigir isso e fazer o deploy do projeto correto.

---

## 📋 Pré-requisitos

- ✅ Código já está no GitHub: `github.com/JonasTwr/controle-de-aula-daxus`
- ✅ Conta no Vercel conectada ao GitHub
- ✅ Variáveis de ambiente do Supabase configuradas

---

## 🔧 Solução 1: Reconectar o Projeto Existente

### Passo 1: Acessar o Dashboard do Vercel
1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Faça login se necessário

### Passo 2: Identificar o Projeto Errado
1. Localize o projeto chamado **"courseplanner"** (que está mostrando o catálogo de cursos)
2. Clique nele para abrir

### Passo 3: Verificar o Repositório Atual
1. Vá em **Settings** (no menu lateral)
2. Clique em **Git**
3. Verifique qual repositório está conectado
4. Se NÃO for `JonasTwr/controle-de-aula-daxus`, siga para o próximo passo

### Passo 4: Desconectar e Reconectar
1. Ainda em **Settings** → **Git**
2. Clique em **Disconnect** (se houver)
3. Clique em **Connect Git Repository**
4. Selecione: `JonasTwr/controle-de-aula-daxus`
5. Confirme a conexão

### Passo 5: Forçar Redeploy
1. Volte para a aba **Deployments**
2. Clique no botão **"Redeploy"** no último deployment
3. Marque a opção **"Use existing Build Cache"** como **DESMARCADA**
4. Clique em **"Redeploy"**

---

## 🆕 Solução 2: Criar um Novo Projeto (RECOMENDADO)

### Passo 1: Criar Novo Projeto
1. No [Dashboard do Vercel](https://vercel.com/dashboard), clique em **"Add New..."**
2. Selecione **"Project"**

### Passo 2: Importar do GitHub
1. Na lista de repositórios, encontre: **`controle-de-aula-daxus`**
2. Se não aparecer, clique em **"Adjust GitHub App Permissions"** e autorize o repositório
3. Clique em **"Import"** ao lado do repositório correto

### Passo 3: Configurar o Projeto
1. **Project Name**: `courseplanner-ai` (ou outro nome de sua escolha)
2. **Framework Preset**: `Vite` (deve detectar automaticamente)
3. **Root Directory**: `./` (deixar como está)
4. **Build Command**: `npm run build` (já configurado)
5. **Output Directory**: `dist` (já configurado)

### Passo 4: Configurar Variáveis de Ambiente
Clique em **"Environment Variables"** e adicione:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
VITE_GEMINI_API_KEY=sua-chave-gemini-aqui
```

⚠️ **IMPORTANTE**: Copie as variáveis do seu arquivo `.env` local!

### Passo 5: Deploy
1. Clique em **"Deploy"**
2. Aguarde o build completar (leva 1-3 minutos)
3. Quando aparecer ✅ **"Congratulations!"**, clique em **"Visit"**

### Passo 6: Copiar a Nova URL
1. A URL estará no formato: `courseplanner-ai-xxx.vercel.app`
2. **COPIE** esta URL para usar no próximo passo

---

## 🔐 Configurar Supabase com a Nova URL

### Passo 1: Acessar Supabase Dashboard
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto **"Controle de Aula Daxus"**

### Passo 2: Adicionar URL de Produção
1. Vá em **Authentication** → **URL Configuration**
2. Na seção **"Redirect URLs"**, clique em **"Add URL"**
3. Cole a URL do Vercel (exemplo: `https://courseplanner-ai-xxx.vercel.app`)
4. Clique em **"Save"**

### Resultado Final
Você deve ter **2 URLs** configuradas:
- ✅ `http://localhost:3000`
- ✅ `https://courseplanner-ai-xxx.vercel.app`

---

## 🧪 Testar a Recuperação de Senha

### Passo 1: Fazer Logout
1. Acesse sua aplicação no Vercel
2. Vá em **Config** → **Sair**

### Passo 2: Solicitar Recuperação
1. Na tela de login, clique em **"Esqueci minha senha"**
2. Digite seu email: `jonas10psn@gmail.com`
3. Clique em **"Enviar e-mail de recuperação"**

### Passo 3: Verificar Email
1. Abra seu email
2. Procure por email do Supabase (verifique spam se necessário)
3. **Clique no link de recuperação**

### Passo 4: Resultado Esperado ✅
Você DEVE ser redirecionado para a tela:
```
┌─────────────────────────────┐
│   CoursePlanner AI          │
│   Recuperação de Senha      │
├─────────────────────────────┤
│                             │
│   Definir nova senha        │
│                             │
│   NOVA SENHA           │
│   [••••••••••]             │
│                             │
│   CONFIRMAR NOVA SENHA     │
│   [••••••••••]             │
│                             │
│   [     Salvar     ]       │
│                             │
└─────────────────────────────┘
```

---

## ❌ Troubleshooting

### Problema: Ainda vejo o catálogo de cursos
**Solução**: Você está acessando o projeto ERRADO. Use a **Solução 2** e crie um novo projeto.

### Problema: Build falhou no Vercel
**Solução**: 
1. Verifique se as variáveis de ambiente estão configuradas
2. Vá em **Settings** → **Environment Variables**
3. Adicione as 3 variáveis necessárias

### Problema: Página em branco após deploy
**Solução**:
1. Abra o Console do navegador (F12)
2. Procure por erros de variáveis de ambiente
3. Certifique-se que as variáveis têm o prefixo `VITE_`

### Problema: Link de recuperação cai na página errada
**Solução**:
1. Verifique se a URL do Vercel está no **Supabase** → **Redirect URLs**
2. A URL deve ser **EXATAMENTE** igual (com https://)
3. Aguarde 1-2 minutos após salvar para propagar

---

## 📌 Checklist Final

Antes de considerar o deploy concluído:

- [ ] Projeto correto deployado no Vercel
- [ ] URL de produção copiada
- [ ] URL adicionada no Supabase → Redirect URLs
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Logout funciona
- [ ] Login funciona
- [ ] Recuperação de senha funciona
- [ ] Tela de "Definir nova senha" aparece ao clicar no link do email

---

## 🎯 URL Final Esperada

Após seguir este guia, você terá:

```
Localhost:  http://localhost:3000
Produção:   https://courseplanner-ai-xxx.vercel.app
```

E a recuperação de senha funcionará **perfeitamente** em ambos os ambientes! ✅

---

## 📞 Suporte

Se tiver problemas:
1. Verifique o Console do navegador (F12) na aba "Console"
2. Verifique os logs do Vercel em **Deployments** → Clique no deploy → **Build Logs**
3. Verifique se as variáveis de ambiente estão corretas

---

**Criado em**: 13/01/2026  
**Versão**: 1.0  
**Status**: ✅ Código funcionando corretamente em localhost
