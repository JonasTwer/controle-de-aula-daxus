// Serviço de IA usando Groq (Llama 3)
const apiKey = import.meta.env.VITE_GROQ_API_KEY;

if (!apiKey) {
    console.error('CRITICAL ERROR: VITE_GROQ_API_KEY is not defined in the environment variables!');
}

export const getStudyAdvice = async (prompt: string, context: string) => {
    if (!apiKey || apiKey === "") {
        console.warn('Tentativa de uso do Mentor sem chave API do Groq configurada.');
        return "CONFIGURAÇÃO PENDENTE: Por favor, adicione sua VITE_GROQ_API_KEY no arquivo .env e reinicie o servidor.";
    }

    try {
        const systemInstruction = "Você é o mentor de estudos do CoursePlanner AI. Seu objetivo é ajudar estudantes a gerenciar seu currículo, sugerir estratégias de aprendizagem e fornecer motivação. Responda sempre em Português, de forma prestativa, concisa (3-4 frases) e acionável. Use linguagem clara.";

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Modelo mais recente e rápido do Groq
                messages: [
                    {
                        role: "system",
                        content: systemInstruction
                    },
                    {
                        role: "user",
                        content: `Contexto do Estudante:\n${context}\n\nPergunta do Usuário: ${prompt}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Groq API Error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
            throw new Error("Resposta vazia do modelo.");
        }

        return text;
    } catch (error: any) {
        console.error("Groq API Error Details:", error);
        let errorMessage = "Erro ao conectar com o assistente.";

        const errorDetails = error instanceof Error ? error.message : String(error);

        if (errorDetails.includes("401") || errorDetails.includes("invalid")) {
            errorMessage = "Chave API do Groq INVÁLIDA.";
        } else if (errorDetails.includes("429")) {
            errorMessage = "Limite de requisições EXCEDIDO (aguarde 1 minuto).";
        } else if (errorDetails.includes("timeout")) {
            errorMessage = "TEMPO ESGOTADO. Tente novamente.";
        }

        return `${errorMessage}\n\nPor favor, verifique se a chave VITE_GROQ_API_KEY está configurada corretamente no .env\n\n(Erro: ${errorDetails.substring(0, 200)}...)`;
    }
};
