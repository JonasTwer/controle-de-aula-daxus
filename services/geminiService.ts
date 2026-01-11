
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export const getStudyAdvice = async (prompt: string, context: string) => {
  if (!apiKey) {
    console.warn('Chave API não configurada no .env');
    return "Configuração da IA pendente";
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
    return "Erro ao conectar com o assistente. Verifique sua chave de API ou conexão.";
  }
};
