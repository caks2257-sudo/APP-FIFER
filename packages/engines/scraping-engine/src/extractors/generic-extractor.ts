import * as cheerio from 'cheerio';
import { ExtractorStrategy, NormalizedProduct } from '../types';

export class GenericExtractor implements ExtractorStrategy {
  supports(storeType: string): boolean {
    return storeType === 'CUSTOM' || storeType === 'GENERIC';
  }

  async extract(html: string): Promise<NormalizedProduct[]> {
    try {
      const $ = cheerio.load(html);

      // Extracción basada en OpenGraph y Schema orgánico
      const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Sin Título';
      const description =
        $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
      const image = $('meta[property="og:image"]').attr('content');

      // Intento genérico de buscar un precio (muy básico, la IA lo mejorará luego)
      const priceText = $('meta[property="product:price:amount"]').attr('content') || '0';

      const product: NormalizedProduct = {
        id: Math.random().toString(36).substr(2, 9),
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(priceText),
        currency: $('meta[property="product:price:currency"]').attr('content') || 'CLP',
        stockStatus: 'UNKNOWN',
        images: image ? [image] : [],
        metadata: { source: 'generic_extractor' },
      };

      return [product]; // El genérico suele devolver el producto de la URL actual
    } catch (error) {
      throw new Error('Fallo al parsear HTML con GenericExtractor.');
    }
  }
}
