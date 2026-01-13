
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('CRITICAL ERROR: VITE_GEMINI_API_KEY is not defined in the environment variables! Mentor AI will not work.');
}

// Lista de modelos para tentar (em ordem de preferência)
const MODEL_FALLBACK = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.0-pro-latest",
  "gemini-1.0-pro",
  "gemini-pro"
];

let workingModel: string | null = null;

// Função para testar qual modelo funciona
async function findWorkingModel(): Promise<string> {
  if (workingModel) return workingModel;

  for (const model of MODEL_FALLBACK) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "teste" }] }]
          })
        }
      );

      if (response.ok) {
        console.log(`✅ Modelo funcionando: ${model}`);
        workingModel = model;
        return model;
      }
    } catch (e) {
      console.log(`❌ Modelo ${model} falhou, tentando próximo...`);
    }
  }

  throw new Error("Nenhum modelo Gemini disponível para esta chave de API");
}

export const getStudyAdvice = async (prompt: string, context: string) => {
  if (!apiKey || apiKey === "") {
    console.warn('Tentativa de uso do Mentor sem chave API configurada.');
    return "CONFIGURAÇÃO PENDENTE: Por favor, adicione sua VITE_GEMINI_API_KEY no arquivo .env e reinicie o servidor.";
  }

  try {
    // Encontra um modelo que funcione
    const model = await findWorkingModel();

    const systemInstruction = "Você é o mentor de estudos do CoursePlanner AI. Seu objetivo é ajudar estudantes a gerenciar seu currículo, sugerir estratégias de aprendizagem e fornecer motivação. Responda sempre em Português, de forma prestativa, concisa (3-4 frases) e acionável. Use linguagem clara.";

    const fullPrompt = `${systemInstruction}\n\nContexto do Estudante:\n${context}\n\nPergunta do Usuário: ${prompt}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("Resposta vazia do modelo.");

    return text;
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    let errorMessage = "Erro ao conectar com o assistente.";

    const errorDetails = error instanceof Error ? error.message : String(error);

    if (errorDetails.includes("API_KEY_INVALID") || errorDetails.includes("expired")) {
      errorMessage = "Chave API INVÁLIDA ou EXPIRADA.";
    } else if (errorDetails.includes("quota")) {
      errorMessage = "Cota de uso EXCEDIDA.";
    } else if (errorDetails.includes("location")) {
      errorMessage = "Região NÃO SUPORTADA pela Google AI.";
    } else if (errorDetails.includes("not found")) {
      errorMessage = "Nenhum modelo de IA disponível para esta conta.";
    }

    return `${errorMessage} Por favor, verifique:\n1. Se a chave está correta no .env\n2. Se o projeto Google Cloud tem billing ativado\n3. Se sua região é suportada\n\n(Erro: ${errorDetails.substring(0, 200)}...)`;
  }
};
