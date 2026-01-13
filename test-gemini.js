// Script de diagnóstico da API Gemini
// Execute com: node test-gemini.js

const apiKey = "AIzaSyBWTZvVrgcgkXrM7i2fPmWx914P4rgNgZ8"; // Sua chave hardcoded para teste

async function testGeminiAPI() {
    console.log("🔍 Testando conexão com Gemini API...\n");

    // Teste 1: Listar modelos disponíveis
    console.log("📋 Teste 1: Listando modelos disponíveis...");
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (!response.ok) {
            console.log(`❌ Erro ${response.status}: ${response.statusText}`);
            const error = await response.text();
            console.log("Detalhes:", error);
        } else {
            const data = await response.json();
            console.log("✅ Modelos encontrados:");
            data.models?.forEach(model => {
                console.log(`   - ${model.name}`);
            });
        }
    } catch (error) {
        console.log("❌ Erro de rede:", error.message);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Teste 2: Tentar gerar conteúdo com gemini-1.5-flash
    console.log("💬 Teste 2: Tentando gerar conteúdo com gemini-1.5-flash...");
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: "Diga olá em português" }]
                    }]
                })
            }
        );

        if (!response.ok) {
            console.log(`❌ Erro ${response.status}: ${response.statusText}`);
            const error = await response.text();
            console.log("Detalhes:", error);
        } else {
            const data = await response.json();
            console.log("✅ Resposta da IA:", data.candidates[0].content.parts[0].text);
        }
    } catch (error) {
        console.log("❌ Erro de rede:", error.message);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Teste 3: Informações sobre a chave
    console.log("🔑 Informações da Chave:");
    console.log(`   Formato: ${apiKey.startsWith('AIza') ? '✅ Correto' : '❌ Inválido'}`);
    console.log(`   Tamanho: ${apiKey.length} caracteres`);
}

testGeminiAPI().then(() => {
    console.log("\n✨ Diagnóstico concluído!");
}).catch(error => {
    console.error("💥 Erro fatal:", error);
});
