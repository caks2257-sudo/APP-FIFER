const fs = require("fs");
const path = require("path");
const { ElevenLabsClient } = require("elevenlabs");

const DEFAULT_VOICE_ID = "pNInz6obpg8ndEao7m8D"; // Antoni

function _buildOutputPath(productId) {
    return path.join(__dirname, "..", "..", "..", "data", "audio", `script_${productId}.mp3`);
}

function _buildSrtPath(productId) {
    return path.join(__dirname, "..", "..", "..", "data", "audio", `script_${productId}.srt`);
}

function _toSrtTime(seconds) {
    const safeMs = Math.max(0, Math.round(Number(seconds || 0) * 1000));
    const h = Math.floor(safeMs / 3600000);
    const m = Math.floor((safeMs % 3600000) / 60000);
    const s = Math.floor((safeMs % 60000) / 1000);
    const ms = safeMs % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function _buildWordTimings(alignment) {
    const chars = alignment?.characters || [];
    const starts = alignment?.character_start_times_seconds || [];
    const ends = alignment?.character_end_times_seconds || [];
    const words = [];
    let buffer = "";
    let start = null;
    let end = null;

    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i] || "";
        const isWhitespace = /\s/.test(ch);
        if (!isWhitespace) {
            if (start === null) start = starts[i] ?? 0;
            end = ends[i] ?? starts[i] ?? start ?? 0;
            buffer += ch;
            continue;
        }
        if (buffer) {
            words.push({ text: buffer, start: start ?? 0, end: end ?? start ?? 0 });
            buffer = "";
            start = null;
            end = null;
        }
    }
    if (buffer) {
        words.push({ text: buffer, start: start ?? 0, end: end ?? start ?? 0 });
    }
    return words;
}

function _writeSrtFromAlignment(alignment, srtPath) {
    const words = _buildWordTimings(alignment);
    const entries = [];
    const maxWordsPerLine = 6;
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
        const chunk = words.slice(i, i + maxWordsPerLine);
        if (chunk.length === 0) continue;
        const line = chunk.map((w) => w.text).join(" ");
        const start = chunk[0].start;
        const end = Math.max(chunk[chunk.length - 1].end, start + 0.2);
        entries.push({
            index: entries.length + 1,
            start: _toSrtTime(start),
            end: _toSrtTime(end),
            text: line,
        });
    }

    const content = entries.map((e) => `${e.index}\n${e.start} --> ${e.end}\n${e.text}\n`).join("\n");
    fs.writeFileSync(srtPath, content || "1\n00:00:00,000 --> 00:00:02,000\n\n");
}

async function generateAudio(text, voiceId, productId) {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
        throw new Error("Falta ELEVENLABS_API_KEY en el .env.");
    }

    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
    const outputPath = _buildOutputPath(productId);
    const srtPath = _buildSrtPath(productId);
    
    // Asegurar que la carpeta existe
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    console.log(`🎙️ Llamando a ElevenLabs para el producto ${productId}...`);

    try {
        const client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
        
        const ttsPayload = {
            model_id: "eleven_multilingual_v2",
            output_format: "mp3_44100_128",
            text: text,
        };
        const ttsResult = await client.textToSpeech.convertWithTimestamps(selectedVoiceId, ttsPayload);
        const audioBuffer = Buffer.from(ttsResult.audio_base64, "base64");
        fs.writeFileSync(outputPath, audioBuffer);
        _writeSrtFromAlignment(ttsResult.normalized_alignment || ttsResult.alignment, srtPath);

        console.log(`✅ Audio generado: data/audio/script_${productId}.mp3`);
        console.log(`✅ Subtítulos generados: data/audio/script_${productId}.srt`);
        return { outputPath, srtPath, voiceId: selectedVoiceId };

    } catch (error) {
        if (error.status === 404) {
            throw new Error(`La voz ID '${selectedVoiceId}' no fue encontrada. Intenta con otra voz desde tu panel de ElevenLabs.`);
        }
        throw error;
    }
}

module.exports = { generateAudio, DEFAULT_VOICE_ID };