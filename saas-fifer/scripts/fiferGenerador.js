const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { preguntarAFifer } = require('../services/aiService');
const supabase = require('../services/dbService');

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function solucionDefinitiva() {
    console.log("🚀 FIFER: Iniciando Extracción Universal (Bypass de Selectores)...");
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--start-maximized', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    // Simulamos una pantalla real para que no nos bloqueen por "resolución de bot"
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log("📡 Navegando a la vitrina de ClickBank...");
        // Usamos la URL de la tienda, pero con un parámetro de búsqueda para forzar la carga de la grilla
        await page.goto('https://www.clickbank.com/shop/health-fitness/', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        console.log("⏳ Esperando renderizado de elementos dinámicos...");
        await esperar(10000);

        const productosExtraidos = await page.evaluate(() => {
            const data = [];
            // MÉTODO AGRESIVO: Buscamos TODOS los h3 y h4 que tengan texto
            const titulos = document.querySelectorAll('h3, h4, .title, [class*="product-title"]');
            
            titulos.forEach(el => {
                const title = el.innerText.trim();
                
                // Filtramos: debe ser un título real, no un link de menú como "Privacy" o "Support"
                if (title.length > 5 && title.length < 60 && 
                    !title.toLowerCase().includes('clickbank') && 
                    !title.toLowerCase().includes('soporte') &&
                    !title.toLowerCase().includes('terms')) {
                    
                    // Intentamos capturar el párrafo descriptivo más cercano
                    const parent = el.closest('div, section, article');
                    const desc = parent?.querySelector('p')?.innerText.trim() || 
                                 "Solución de alto impacto en el nicho de Salud.";

                    if (!data.find(p => p.title === title)) {
                        data.push({ title, description: desc });
                    }
                }
            });
            return data;
        });

        if (productosExtraidos.length === 0) {
            console.log("❌ Error crítico: ClickBank no entregó datos. Revisar si la página cargó vacía en el navegador.");
            await browser.close();
            return;
        }

        console.log(`✅ ¡Éxito! Rastreados ${productosExtraidos.length} productos potenciales.`);
        
        // Cerramos el navegador para liberar RAM antes de llamar a la IA
        await browser.close();

        // Procesamos los primeros 5 para tu base de datos
        const muestra = productosExtraidos.slice(0, 5);

        for (const prod of muestra) {
            const { data: existente } = await supabase
                .from('productos_fifer')
                .select('id')
                .eq('nombre', prod.title)
                .maybeSingle();

            if (existente) {
                console.log(`⏩ Saltando: "${prod.title}" (Ya existe).`);
                continue;
            }

            console.log(`🧠 FIFER IA trabajando en: ${prod.title}...`);
            
            // PROMPT ACTUALIZADO: ENFOQUE EN MECANISMO ÚNICO
            const prompt = `
            Eres un copywriter A-List experto en marketing de respuesta directa. 
            Producto: ${prod.title}.
            Descripción base: ${prod.description}.
            
            Escribe un copy de ventas de 3 líneas en español. 
            REGLA DE ORO: Vende el "Mecanismo Único" (el proceso científico o lógico que hace que funcione). 
            No uses saludos, ve directo al grano. Solo entrega el texto.
            `;

            let copyIA;
            try {
                copyIA = await preguntarAFifer(prompt);
                await esperar(5500); // Evitamos el error 429 de cuota excedida
            } catch (e) {
                console.log("⏳ Límite de IA alcanzado. Esperando pausa de seguridad...");
                await esperar(15000);
                continue;
            }

            if (!copyIA || copyIA.includes("RECHAZADO")) continue;

            const { error } = await supabase.from('productos_fifer').insert([{
                nombre: prod.title,
                nicho: "Salud y Fitness",
                descripcion_original: prod.description,
                copy_ventas_ia: copyIA.trim().replace(/^["']|["']$/g, ''),
                comision: "Variable"
            }]);

            if (!error) console.log(`✨ ¡Guardado en Supabase! -> ${prod.title}`);
            else console.error("❌ Error Supabase:", error.message);
        }

        console.log("\n🏁 ARQUITECTURA COMPLETADA. FIFER TIENE DATOS REALES.");

    } catch (error) {
        console.error("❌ Error de ejecución:", error.message);
        if (browser) await browser.close();
    }
}

solucionDefinitiva();