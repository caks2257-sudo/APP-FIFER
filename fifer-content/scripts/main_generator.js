const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// 1. Carga blindada del .env desde la raíz
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const supabase = require('../../shared/supabase');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const audioService = require('./services/audio_service');
const videoService = require('./services/video_service');
const publishService = require('./services/publish_service');

const { GOOGLE_AI_KEY } = process.env;
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const SUPABASE_VIDEO_BUCKET = 'fifer-videos';

if (!GOOGLE_AI_KEY) {
    console.error("❌ ERROR: Falta GOOGLE_AI_KEY en el .env de la raíz");
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ ERROR: Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para fase cloud.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const supabaseStorage = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- SISTEMA DE RESPALDO DE MODELOS IA ---
const MODELOS_RESPALDO = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite-001",
    "gemini-2.5-flash-lite"
];

async function generarContenidoConRespaldo(promptTexto, genAILocal) {
    for (const nombreModelo of MODELOS_RESPALDO) {
        try {
            console.log(`🧠 Intentando generar guion con: ${nombreModelo}...`);
            const model = genAILocal.getGenerativeModel(
                { model: nombreModelo },
                { apiVersion: 'v1' }
            );
            
            const result = await model.generateContent(promptTexto);
            return result.response.text(); 
            
        } catch (error) {
            // Detectar si el error es por límite de cuota (429)
            if (error.status === 429 || (error.message && error.message.includes("429")) || (error.message && error.message.includes("Quota"))) {
                console.log(`⚠️ Cuota agotada para ${nombreModelo}. Cambiando al siguiente modelo en la lista...`);
                continue; // Pasa al siguiente modelo del array
            } else {
                // Si es otro error grave, lo lanzamos
                throw error;
            }
        }
    }
    throw new Error("❌ CRÍTICO: Todos los modelos gratuitos han agotado su cuota diaria.");
}
// -----------------------------------------

function parseGeminiJson(rawText) {
    if (!rawText) return null;
    
    const cleanText = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '') 
        .trim();

    try {
        return JSON.parse(cleanText);
    } catch (_) {
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
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

async function uploadToSupabase(localFilePath, productId) {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada para uploads.");
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    const fileName = `video_${productId}_${Date.now()}.mp4`;
    console.log(`🚀 Intentando subir al bucket: ${SUPABASE_VIDEO_BUCKET} en la URL: ${SUPABASE_URL}`);

    const { error: uploadError } = await supabaseStorage
        .storage
        .from(SUPABASE_VIDEO_BUCKET)
        .upload(fileName, fileBuffer, { contentType: 'video/mp4', upsert: true });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabaseStorage.storage.from(SUPABASE_VIDEO_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
}

async function procesarSiguiente() {
    console.log("🚀 [FIFER-ENGINE] Iniciando producción IA...");

    const { data: producto, error } = await supabase
        .from('products')
        .select('*')
        .eq('ai_status', 'pending')
        .limit(1)
        .maybeSingle();

    if (error) return console.error("❌ ERROR Supabase:", error.message);
    if (!producto) return console.log("☕ Todo procesado. No hay pendientes.");

    console.log(`🎬 Trabajando en: ${producto.name.substring(0, 50)}...`);

    try {
        await supabase.from('products').update({ ai_status: 'processing' }).eq('id', producto.id);

        const prompt = `
            Actúa como un experto en TikTok Ads. 
            Crea un guion de 15 segundos para el producto: ${producto.name}.
            Responde EXCLUSIVAMENTE con este formato JSON:
            {
                "hook": "gancho inicial potente de 3 segundos",
                "script": "texto persuasivo para el locutor"
            }
        `;

        // Llamamos a la nueva función blindada
        const aiResponse = await generarContenidoConRespaldo(prompt, genAI);

        const scriptData = parseGeminiJson(aiResponse);
        if (!scriptData || !scriptData.script) throw new Error("Guion malformado o JSON inválido.");

        // --- FASE MULTIMEDIA ---
        const voiceId = await getPreferredVoiceId(producto);
        
        console.log(`🎙️ 2. Generando Audio con ElevenLabs (Voz: ${voiceId})...`);
        const audioInfo = await audioService.generateAudio(scriptData.script, voiceId, producto.id);
        
        console.log(`🎞️ 3. Renderizando Video 9:16 con FFmpeg...`);
        
        let imagenesParaVideo = [];
        if (producto.image_url) {
            imagenesParaVideo.push(producto.image_url);
        }

        // Paracaídas: Si no hay URL, usamos imágenes de prueba
        if (imagenesParaVideo.length === 0) {
            console.log("⚠️ Base de datos sin foto en 'image_url'. Inyectando foto de prueba...");
            imagenesParaVideo = [
                "https://picsum.photos/1080/1920?random=1",
                "https://picsum.photos/1080/1920?random=2"
            ];
        }

        const localVideoPath = await videoService.generateVideo(
            audioInfo.outputPath,
            imagenesParaVideo,
            producto.id,
            audioInfo.srtPath
        );

        // --- FASE CLOUD (AISLADA): subida + distribución ---
        try {
            let publicUrl;
            try {
                publicUrl = await uploadToSupabase(localVideoPath, producto.id);
            } catch (uploadError) {
                console.error('❌ Error en Subida Supabase:', uploadError);
                throw uploadError;
            }

            const textoPost = [
                scriptData.hook,
                scriptData.script,
                '#ecommerce',
                '#shoppingonline',
                '#ofertas',
                '#viralproducts',
                '#tiktokmademebuyit'
            ].join('\n\n');

            try {
                console.log('📡 Enviando a Make...');
                await publishService.publishVideo(publicUrl, textoPost);
            } catch (publishError) {
                console.error('❌ Error en Publicación Make:', publishError.response?.data || publishError.message);
                throw publishError;
            }

            await supabase
                .from('products')
                .update({
                ai_script: aiResponse,
                ai_status: 'completed',
                video_url: publicUrl
                })
                .eq('id', producto.id);
        } catch (cloudError) {
            console.error("❌ ERROR EN FASE CLOUD (UPLOAD/PUBLISH):", cloudError.message);
            await supabase.from('products').update({
                ai_script: aiResponse,
                ai_status: 'publish_error'
            }).eq('id', producto.id);
        }

        console.log(`✅ PRODUCTO FINALIZADO: video_${producto.id}.mp4`);

    } catch (e) {
        console.error("❌ ERROR CRÍTICO EN EL PROCESO:", e.message);
        await supabase.from('products').update({ ai_status: 'error' }).eq('id', producto.id);
    }
}

async function getPreferredVoiceId(producto) {
    const SAFE_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel (Seguro)
    const ownerId = producto.user_id || producto.owner_id || producto.supabase_id || producto.user_supabase_id;
    
    if (!ownerId) return SAFE_VOICE_ID;

    const { data: userRow } = await supabase
        .from('profiles')
        .select('voice_id')
        .eq('id', ownerId)
        .maybeSingle();

    const dbVoice = userRow?.voice_id;

    if (dbVoice && dbVoice !== 'pNInz6obpg8ndEao7m8D') {
        return dbVoice; 
    }

    console.log("⚠️ Voz no configurada o ID roto. Usando voz de respaldo...");
    return SAFE_VOICE_ID;
}

procesarSiguiente();