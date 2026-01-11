
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('CRITICAL ERROR: VITE_GEMINI_API_KEY is not defined in the environment variables! Mentor AI will not work.');
}

console.log('Gemini Service Initialization - Key found:', !!apiKey);

const genAI = new GoogleGenerativeAI(apiKey || "");

export const getStudyAdvice = async (prompt: string, context: string) => {
  if (!apiKey || apiKey === "") {
    console.warn('Tentativa de uso do Mentor sem chave API configurada.');
    return "CONFIGURAÇÃO PENDENTE: Por favor, adicione sua VITE_GEMINI_API_KEY no arquivo .env e reinicie o servidor.";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "Você é o mentor de estudos do CoursePlanner AI. Seu objetivo é ajudar estudantes a gerenciar seu currículo, sugerir estratégias de aprendizagem e fornecer motivação. Responda sempre em Português, de forma prestativa, concisa (3-4 frases) e acionável. Use linguagem clara.",
    });

    const fullPrompt = `Contexto do Estudante:\n${context}\n\nPergunta do Usuário: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("Resposta vazia do modelo.");

    return text;
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    let errorMessage = "Erro ao conectar com o assistente.";

    // Capture specific error types
    const errorDetails = error instanceof Error ? error.message : String(error);

    if (errorDetails.includes("API_KEY_INVALID")) {
      errorMessage = "Chave API INVÁLIDA.";
    } else if (errorDetails.includes("quota")) {
      errorMessage = "Cota de uso EXCEDIDA.";
    } else if (errorDetails.includes("location")) {
      errorMessage = "Região NÃO SUPORTADA pela Google AI.";
    }

    return `${errorMessage} Por favor, confira se a chave VITE_GEMINI_API_KEY está configurada corretamente nas variáveis de ambiente. \n\n(Erro: ${errorDetails})`;
  }
};
