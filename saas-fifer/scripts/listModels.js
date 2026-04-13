/**
 * Referencia de modelos; la generación vive en el orquestador FIFER.
 * Para inspeccionar modelos habilitados en tu clave, usa: node scripts/diagnosticoIA.js
 */
async function verModelos() {
  console.log('🔍 Modelos típicos (elegir vía pipeline centralizado, no vía saas-fifer/services):');
  console.log('- gemini-2.0-flash');
  console.log('- gemini-2.0-flash-lite-001');
  console.log('- gemini-1.5-flash-latest');
  console.log('\n📌 Listado en vivo con tu API key: node scripts/diagnosticoIA.js');
}

verModelos();
