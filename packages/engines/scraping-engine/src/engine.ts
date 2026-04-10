import { ScrapingContext, ExtractorStrategy, NormalizedProduct } from './types';

export class ScrapingEngine {
  private strategies: ExtractorStrategy[] = [];

  registerStrategy(strategy: ExtractorStrategy) {
    this.strategies.push(strategy);
  }

  async runExtraction(context: ScrapingContext, rawData?: string): Promise<NormalizedProduct[]> {
    const strategy = this.strategies.find((s) => s.supports(context.storeType));

    if (!strategy) {
      throw new Error(`No hay una estrategia de extracción registrada para el tipo: ${context.storeType}`);
    }

    let dataToProcess = rawData;

    // Autonomía: Si no me pasan la data, voy a buscarla.
    if (!dataToProcess) {
      if (!context.url) throw new Error('Se requiere una URL para hacer el fetch de los datos.');

      try {
        // Usamos el fetch nativo de Node 18+
        const response = await fetch(context.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FiferBot/1.0' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        dataToProcess = await response.text();
      } catch (error: any) {
        throw new Error(`Fallo de red en el motor de scraping: ${error.message}`);
      }
    }

    return await strategy.extract(dataToProcess);
  }
}
