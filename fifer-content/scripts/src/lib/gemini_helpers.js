const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODELOS_RESPALDO = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite-001",
    "gemini-2.5-flash-lite",
];

function getGenAI() {
    const key = process.env.GOOGLE_AI_KEY;
    if (!key) {
        throw new Error("Falta GOOGLE_AI_KEY en el .env de la raíz");
    }
    return new GoogleGenerativeAI(key);
}

async function generarContenidoConRespaldo(promptTexto, genAILocal) {
    for (const nombreModelo of MODELOS_RESPALDO) {
        try {
            console.log(`🧠 Intentando generar guion con: ${nombreModelo}...`);
            const model = genAILocal.getGenerativeModel(
                { model: nombreModelo },
                { apiVersion: "v1" }
            );

            const result = await model.generateContent(promptTexto);
            return result.response.text();
        } catch (error) {
            if (
                error.status === 429 ||
                (error.message && error.message.includes("429")) ||
                (error.message && error.message.includes("Quota"))
            ) {
                console.log(
                    `⚠️ Cuota agotada para ${nombreModelo}. Cambiando al siguiente modelo en la lista...`
                );
                continue;
            }
            throw error;
        }
    }
    throw new Error("❌ CRÍTICO: Todos los modelos gratuitos han agotado su cuota diaria.");
}

function parseGeminiJson(rawText) {
    if (!rawText) return null;

    const cleanText = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim();

    try {
        return JSON.parse(cleanText);
    } catch (_) {
        const firstBrace = cleanText.indexOf("{");
        const lastBrace = cleanText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const candidate = cleanText.slice(firstBrace, lastBrace + 1);
            try {
                return JSON.parse(candidate);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
}

module.exports = {
    MODELOS_RESPALDO,
    getGenAI,
    generarContenidoConRespaldo,
    parseGeminiJson,
};
