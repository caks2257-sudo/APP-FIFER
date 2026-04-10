export interface NormalizedProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  images: string[];
  metadata: Record<string, any>;
}

export interface ScrapingContext {
  url: string;
  targetHtml?: string;
  storeType: 'SHOPIFY' | 'MERCADOLIBRE' | 'CUSTOM' | 'GENERIC';
}

export interface ExtractorStrategy {
  supports(storeType: string): boolean;
  extract(htmlOrData: string): Promise<NormalizedProduct[]>;
}
