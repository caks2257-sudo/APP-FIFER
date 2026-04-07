const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const supabase = require("../../../../shared/supabase");
const audioService = require("../../services/audio_service");
const videoService = require("../../services/video_service");
const publishService = require("../../services/publish_service");
const {
    getGenAI,
    generarContenidoConRespaldo,
    parseGeminiJson,
} = require("../lib/gemini_helpers");

const SUPABASE_VIDEO_BUCKET = "fifer-videos";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

function getSupabaseStorage() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para fase cloud.");
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function uploadToSupabase(localFilePath, productId) {
    const supabaseStorage = getSupabaseStorage();
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileName = `video_${productId}_${Date.now()}.mp4`;
    console.log(`🚀 Intentando subir al bucket: ${SUPABASE_VIDEO_BUCKET}`);

    const { error: uploadError } = await supabaseStorage.storage
        .from(SUPABASE_VIDEO_BUCKET)
        .upload(fileName, fileBuffer, { contentType: "video/mp4", upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabaseStorage.storage.from(SUPABASE_VIDEO_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
}

async function getPreferredVoiceId(producto) {
    const SAFE_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
    const ownerId = producto.user_id || producto.owner_id || producto.supabase_id || producto.user_supabase_id;
    if (!ownerId) return SAFE_VOICE_ID;

    const { data: userRow } = await supabase.from("profiles").select("voice_id").eq("id", ownerId).maybeSingle();
    const dbVoice = userRow?.voice_id;

    if (dbVoice && dbVoice !== "pNInz6obpg8ndEao7m8D") return dbVoice;
    return SAFE_VOICE_ID;
}

/**
 * Línea de producción Reel: video 9:16, ElevenLabs + FFmpeg.
 * Actualiza status_reel y video_url en la tabla products.
 */
async function generateReel(producto) {
    const genAI = getGenAI();
    
    console.log(`🎬 [LINEA-REEL] Iniciando producción de video para: ${producto.id}`);

    try {
        // 1. Marcar inicio en las NUEVAS columnas de estado
        await supabase.from("products").update({ 
            status_reel: 'processing',
            ai_status: 'processing' 
        }).eq("id", producto.id);

        const prompt = `
            Actúa como un experto en TikTok Ads. 
            Crea un guion de 15 segundos para el producto: ${producto.name}.
            Responde EXCLUSIVAMENTE con este formato JSON:
            {
                "hook": "gancho inicial potente de 3 segundos",
                "script": "texto persuasivo para el locutor"
            }
        `;

        const aiResponse = await generarContenidoConRespaldo(prompt, genAI);
        const scriptData = parseGeminiJson(aiResponse);
        
        if (!scriptData || !scriptData.script) {
            throw new Error("Guion malformado o JSON inválido.");
        }

        const voiceId = await getPreferredVoiceId(producto);

        console.log(`🎙️ 2. Generando Audio con ElevenLabs...`);
        const audioInfo = await audioService.generateAudio(scriptData.script, voiceId, producto.id);

        console.log(`🎞️ 3. Renderizando Video con FFmpeg...`);
        let imagenesParaVideo = producto.image_url ? [producto.image_url] : [
            "https://picsum.photos/1080/1920?random=1",
            "https://picsum.photos/1080/1920?random=2"
        ];

        const localVideoPath = await videoService.generateVideo(
            audioInfo.outputPath,
            imagenesParaVideo,
            producto.id,
            audioInfo.srtPath
        );

        const publicUrl = await uploadToSupabase(localVideoPath, producto.id);

        const textoPost = [
            scriptData.hook,
            scriptData.script,
            "#ecommerce #ofertas #viralproducts #tiktokmademebuyit"
        ].join("\n\n");

        console.log("📡 Enviando a Make (reel)...");
        await publishService.publishMake({
            type: "reel",
            productId: producto.id,
            videoUrl: publicUrl,
            caption: textoPost,
        });

        // 2. Guardar en columnas clásicas y NUEVAS
        await supabase.from("products").update({
            ai_script: aiResponse,
            video_url: publicUrl, // Columna original
            status_reel: 'completed',
            ai_status: 'completed'
        }).eq("id", producto.id);

        console.log(`✅ REEL FINALIZADO: ${producto.id}`);
        return { ai_script: aiResponse, video_url: publicUrl };

    } catch (error) {
        console.error("❌ ERROR EN REELS_GENERATOR:", error.message);
        await supabase.from("products").update({ 
            status_reel: 'error',
            ai_status: 'error' 
        }).eq("id", producto.id);
        throw error;
    }
}

module.exports = { generateReel };