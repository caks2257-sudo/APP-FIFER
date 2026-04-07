const supabase = require("../../../../shared/supabase");
const publishService = require("../../services/publish_service");
const { getGenAI, generarContenidoConRespaldo, parseGeminiJson } = require("../lib/gemini_helpers");

// Ajustamos a 1080x1350 (4:5) que es el estándar que definimos para Instagram Feed
const PICSUM_SINGLE = "https://picsum.photos/1080/1350?random=post";

/**
 * Post ligero: sin audio ni video. Una imagen + copy corto estilo Instagram.
 * Make: { type: "post", imageUrl, caption }.
 */
async function generatePost(producto) {
    const genAI = getGenAI();

    console.log(`📸 [LINEA-POST] Iniciando producción para: ${producto.name.substring(0, 40)}...`);

    try {
        // 1. Marcar inicio en las NUEVAS columnas de estado
        await supabase.from("products").update({ 
            status_post: 'processing',
            ai_status: 'processing' 
        }).eq("id", producto.id);

        const prompt = `
Eres copywriter experto en Instagram Shopping.
Producto: ${producto.name}.
${producto.description ? `Descripción breve: ${String(producto.description).slice(0, 500)}` : ""}

Genera un copy de venta MUY corto y persuasivo (máximo ~280 caracteres), tono Instagram: directo, emojis con moderación opcional, sin saludos largos.
Responde EXCLUSIVAMENTE con JSON válido:
{ "caption": "texto final listo para publicar" }
`;

        // Mantenemos tu lógica original de generación con respaldo
        const aiResponse = await generarContenidoConRespaldo(prompt, genAI);
        const parsed = parseGeminiJson(aiResponse);
        const caption = (parsed && parsed.caption && String(parsed.caption).trim()) || String(aiResponse || "").trim();

        if (!caption) {
            throw new Error("No se pudo obtener caption para el post.");
        }

        // Definición de imagen con tu lógica original de respaldo
        const imageUrl = producto.image_url && String(producto.image_url).trim()
            ? String(producto.image_url).trim()
            : PICSUM_SINGLE;

        if (!producto.image_url) {
            console.log("⚠️ Sin image_url: usando imagen de respaldo (picsum).");
        }

        console.log("📡 Enviando a Make (post)...");
        
        // Despacho al Webhook (mantenemos el contrato que Make ya entiende)
        await publishService.publishMake({
            type: "post",
            productId: producto.id, // Añadimos el ID para tracking en Make
            imageUrl,
            caption,
        });

        // 2. Guardar TODO en las nuevas columnas sin borrar ai_script original
        await supabase.from("products").update({ 
            ai_script: aiResponse,         // Mantenemos compatibilidad
            ai_caption_post: caption,      // Nueva columna de texto
            ai_post_url: imageUrl,         // Nueva columna de URL imagen
            status_post: 'completed',      // Estado específico de la línea
            ai_status: 'completed'         // Estado general
        }).eq("id", producto.id);

        console.log(`✅ POST FINALIZADO: ${producto.id}`);

        return { ai_script: aiResponse, imageUrl, caption };

    } catch (error) {
        console.error("❌ ERROR EN GENERATE_POST:", error.message);
        
        // En caso de falla, marcamos el error en la columna correspondiente
        await supabase.from("products").update({ 
            status_post: 'error',
            ai_status: 'error' 
        }).eq("id", producto.id);
        
        throw error;
    }
}

module.exports = { generatePost };