const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegStatic);

// Blindaje avanzado para rutas en Windows
function _escapeSrtPathForWindowsFilter(srtPath) {
    return path
        .resolve(srtPath)
        .replace(/\\/g, '/')
        .replace(/^([A-Za-z]):/, '$1\\:')
        .replace(/'/g, "\\'");
}

async function generateVideo(audioPath, rawImageUrls, productId, srtPath) {
    const outputDir = path.join(__dirname, "../../../data/video");
    const tempDir = path.join(__dirname, "../../../data/temp", productId);
    const outputPath = path.join(outputDir, `video_${productId}.mp4`);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
        console.log(`🎬 Iniciando montaje de video para el producto: ${productId}`);

        // 1. Normalizar las imágenes
        let imageUrls = [];
        if (typeof rawImageUrls === 'string') {
            try { imageUrls = JSON.parse(rawImageUrls); } catch(e) {}
        } else if (Array.isArray(rawImageUrls)) {
            imageUrls = rawImageUrls;
        }

        if (!imageUrls || imageUrls.length === 0) {
            throw new Error("El producto no tiene URLs de imágenes en Supabase.");
        }

        // 2. Descargar imágenes localmente
        const localImages = [];
        for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
            try {
                const imgPath = path.join(tempDir, `img_${i}.jpg`);
                const response = await axios({ url: imageUrls[i], responseType: 'stream', timeout: 5000 });
                
                const writer = fs.createWriteStream(imgPath);
                response.data.pipe(writer);
                
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                
                localImages.push(imgPath);
            } catch (imgErr) {
                console.warn(`⚠️ Saltando imagen ${i} (Enlace roto o lento)`);
            }
        }

        if (localImages.length === 0) {
            throw new Error("No se pudo descargar ninguna de las imágenes de este producto.");
        }

        // 3. Crear el video usando FFmpeg (Modo TikTok 9:16 + Subtítulos Seguros)
        return new Promise((resolve, reject) => {
            let command = ffmpeg();

            // Añadir fotos (3 segundos cada una)
            localImages.forEach(img => {
                command = command.input(img).loop(3); 
            });

            command
                .input(audioPath)
                .videoCodec('libx264')
                // ✅ CAMBIO CLAVE: Usar videoFilters en lugar de outputOptions para el -vf
                .videoFilters([
                    'scale=1080:1920:force_original_aspect_ratio=decrease',
                    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
                    `subtitles='${_escapeSrtPathForWindowsFilter(srtPath)}':force_style='FontSize=24,PrimaryColour=&H00FFFFFF,Outline=2,OutlineColour=&H00000000'`
                ])
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-shortest' // Cortar video cuando acabe el audio
                ])
                .on('start', () => console.log('🚀 FFmpeg trabajando (Renderizando Formato TikTok con Subtítulos)...'))
                .on('error', (err) => {
                    console.error('❌ Error de FFmpeg:', err.message);
                    reject(err);
                })
                .on('end', () => {
                    console.log(`✅ Video exportado: data/video/video_${productId}.mp4`);
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    resolve(outputPath);
                })
                .save(outputPath);
        });
    } catch (error) {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        throw error;
    }
}

module.exports = { generateVideo };