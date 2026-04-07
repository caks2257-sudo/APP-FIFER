const path = require("path");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "..", "..", ".env");
dotenv.config({ path: envPath });

const supabase = require("../../shared/supabase");
const { generateReel } = require("./src/services/reels_generator");
const { generatePost } = require("./src/services/post_generator");
const { generateCarousel } = require("./src/services/carousel_generator");

const VALID_TYPES = new Set(["reel", "post", "carousel"]);

function parseCliArgs(argv) {
    const out = { type: null, id: null };
    for (const raw of argv) {
        if (raw.startsWith("--type=")) {
            out.type = raw.slice("--type=".length).trim().toLowerCase();
        } else if (raw.startsWith("--id=")) {
            out.id = raw.slice("--id=".length).trim();
        }
    }
    return out;
}

async function runForProduct(type, producto) {
    if (type === "reel") {
        return generateReel(producto);
    }
    if (type === "post") {
        return generatePost(producto);
    }
    if (type === "carousel") {
        return generateCarousel(producto);
    }
    throw new Error(`Tipo no soportado: ${type}`);
}

async function main() {
    const { type, id } = parseCliArgs(process.argv.slice(2));

    if (!type || !id) {
        console.error("Uso: node main_orchestrator.js --type=reel|post|carousel --id=PRODUCT_ID");
        process.exit(1);
    }

    if (!VALID_TYPES.has(type)) {
        console.error(`--type inválido. Use: ${[...VALID_TYPES].join(", ")}`);
        process.exit(1);
    }

    if (!process.env.GOOGLE_AI_KEY) {
        console.error("❌ ERROR: Falta GOOGLE_AI_KEY en el .env de la raíz");
        process.exit(1);
    }

    console.log(`🚀 Orquestador: type=${type} id=${id}`);

    const { data: producto, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();

    if (error) {
        console.error("❌ ERROR Supabase:", error.message);
        process.exit(1);
    }
    if (!producto) {
        console.error("❌ No se encontró el producto con ese id.");
        process.exit(1);
    }

    const { error: procErr } = await supabase.from("products").update({ ai_status: "processing" }).eq("id", id);

    if (procErr) {
        console.error("❌ No se pudo marcar processing:", procErr.message);
        process.exit(1);
    }

    try {
        await runForProduct(type, producto);
        const { error: doneErr } = await supabase.from("products").update({ ai_status: "completed" }).eq("id", id);
        if (doneErr) {
            console.error("⚠️ Pipeline OK pero falló ai_status=completed:", doneErr.message);
            process.exit(1);
        }
        console.log("✅ ai_status: completed");
    } catch (e) {
        console.error("❌ ERROR:", e.message);
        await supabase.from("products").update({ ai_status: "error" }).eq("id", id);
        process.exit(1);
    }
}

main();
