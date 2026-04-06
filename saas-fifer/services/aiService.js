const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../config');

// Inicializamos la API con la llave que centralizamos en nuestro config
const genAI = new GoogleGenerativeAI(config.ai.gemini);

/**
 * Función maestra para preguntarle cosas a FIFER
 * @param {string} prompt - Lo que quieres que la IA procese
 */
const preguntarAFifer = async (prompt) => {
    try {
        // 🔥 ACTUALIZADO: Usamos "gemini-2.5-flash" 
        // Confirmado por el diagnóstico para tu cuenta en 2026.
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return response.text();
    } catch (error) {
        console.error("❌ Error en el Cerebro de FIFER:", error.message);
        return null;
    }
};

module.exports = { preguntarAFifer };