import { ExtractorStrategy, NormalizedProduct } from '../types';

export class ShopifyExtractor implements ExtractorStrategy {
  supports(storeType: string): boolean {
    return storeType === 'SHOPIFY';
  }

  async extract(rawData: string): Promise<NormalizedProduct[]> {
    try {
      const payload = JSON.parse(rawData);
      const products = payload.products || [];

      return products.map((p: any) => ({
        id: p.id ? p.id.toString() : Math.random().toString(),
        title: p.title || 'Producto Sin Título',
        description: p.body_html || '',
        price: parseFloat(p.variants?.[0]?.price || '0'),
        currency: 'CLP',
        stockStatus: p.variants?.[0]?.available ? 'IN_STOCK' : 'OUT_OF_STOCK',
        images: p.images?.map((img: any) => img.src) || [],
        metadata: { vendor: p.vendor, product_type: p.product_type },
      }));
    } catch (error) {
      throw new Error('Fallo al parsear datos de Shopify. El formato no es válido.');
    }
  }
}
