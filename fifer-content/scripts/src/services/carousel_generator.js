const supabase = require("../../../../shared/supabase");
const publishService = require("../../services/publish_service");
const { getGenAI, generarContenidoConRespaldo, parseGeminiJson } = require("../lib/gemini_helpers");

const TARGET_SLIDES = 3;

// Mantenemos tu función original de Picsum (pero ajustada a 1080x1350 para mejor feed)
function picsumUrl(seed) {
    return `https://picsum.photos/1080/1350?random=carousel_${seed}_${Date.now()}`;
}

// Mantenemos tu lógica de construcción de array de imágenes intacta
function buildCarouselImages(producto) {
    const urls = [];
    if (producto.image_url && String(producto.image_url).trim()) {
        urls.push(String(producto.image_url).trim());
    }
    let extra = 0;
    while (urls.length < TARGET_SLIDES) {
        urls.push(picsumUrl(extra++));
    }
    return urls.slice(0, TARGET_SLIDES);
}

/**
 * Carrusel: hasta 3 imágenes (relleno con picsum si faltan).
 * Narrativa IA: gancho, beneficio, CTA en un solo caption para Make.
 * Make: { type: "carousel", images, caption }.
 */
async function generateCarousel(producto) {
    const genAI = getGenAI();
    
    console.log(`🎠 [LINEA-CAROUSEL] Iniciando narrativa para: ${producto.name.substring(0, 40)}...`);

    try {
        // 1. Marcar inicio en las NUEVAS columnas de estado
        await supabase.from("products").update({ 
            status_carousel: 'processing',
            ai_status: 'processing' 
        }).eq("id", producto.id);

        const images = buildCarouselImages(producto);

        if (!producto.image_url) {
            console.log("⚠️ Sin image_url del producto: carrusel rellenado con picsum.");
        }

        const prompt = `
Eres estratega de contenido para Instagram Carousel (3 slides).
Producto: ${producto.name}.
${producto.description ? `Contexto: ${String(producto.description).slice(0, 400)}` : ""}

Escribe una narrativa de exactamente 3 pasos para las diapositivas:
1) Gancho fuerte
2) Beneficio claro del producto
3) CTA directa (llamar a comprar / enlace en bio / swipe)

Responde EXCLUSIVAMENTE con JSON válido:
{
  "hook": "texto slide 1",
  "benefit": "texto slide 2",
  "cta": "texto slide 3"
}
`;

        // Lógica original de generación con respaldo
        const aiResponse = await generarContenidoConRespaldo(prompt, genAI);
        const parsed = parseGeminiJson(aiResponse);

        let caption;
        if (parsed && (parsed.hook || parsed.benefit || parsed.cta)) {
            caption = [parsed.hook, parsed.benefit, parsed.cta].filter(Boolean).join("\n\n");
        } else {
            caption = String(aiResponse || "").trim();
        }

        if (!caption) {
            throw new Error("No se pudo generar el caption del carrusel.");
        }

        console.log("📡 Enviando a Make (carousel)...");
        
        // Despacho al Webhook con el contrato nuevo
        await publishService.publishMake({
            type: "carousel",
            productId: producto.id,
            images,
            caption,
        });

        // 2. Guardar en las nuevas columnas JSONB y estados específicos
        await supabase.from("products").update({ 
            ai_script: aiResponse,                 // Mantenemos compatibilidad con el JSON original
            ai_caption_carousel: caption,          // Nueva columna de texto unificado
            ai_carousel_urls: images,              // Nueva columna JSONB con el array de fotos
            status_carousel: 'completed',          // Estado específico de la línea
            ai_status: 'completed'                 // Estado general
        }).eq("id", producto.id);

        console.log(`✅ CARRUSEL FINALIZADO: ${producto.id}`);

        return { ai_script: aiResponse, images, caption };

    } catch (error) {
        console.error("❌ ERROR EN CAROUSEL_GENERATOR:", error.message);
        
        // En caso de falla, marcamos el error en la columna de carrusel
        await supabase.from("products").update({ 
            status_carousel: 'error',
            ai_status: 'error' 
        }).eq("id", producto.id);
        
        throw error;
    }
}

module.exports = { generateCarousel };