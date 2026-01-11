
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export const getStudyAdvice = async (prompt: string, context: string) => {
  if (!apiKey) {
    console.error("Gemini API Key missing. Please set VITE_GEMINI_API_KEY in .env.local");
    return "O assistente não está configurado corretamente (chave de API ausente).";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "Você é um mentor de estudos especialista. Seu objetivo é ajudar estudantes a gerenciar seu currículo, sugerir estratégias de aprendizagem e fornecer motivação. Mantenha as respostas concisas (máximo 3-4 frases), acionáveis e em Português. Use linguagem clara, sem markdown complexo.",
    });

    const fullPrompt = `Contexto do Estudante:\n${context}\n\nPergunta do Usuário: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("Resposta vazia do modelo.");

    return text;
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);

    // Erros comuns de API Key
    if (error.message?.includes("API_KEY_INVALID")) {
      return "Erro: Sua chave de API do Gemini é inválida.";
    }
    if (error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
      return "Erro: Sem permissão para usar este modelo. Verifique se a API do Gemini está ativa no seu projeto Google Cloud.";
    }

    return "Erro ao conectar com o assistente. Verifique sua chave de API ou conexão.";
  }
};
