import { NextResponse } from "next/server";
import { ScrapingEngine, ShopifyExtractor } from "@fifer/scraping-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const engine = new ScrapingEngine();
    engine.registerStrategy(new ShopifyExtractor());

    const mockShopifyData = JSON.stringify({
      products: [
        {
          id: 101,
          title: "Piso SPC Roble Nórdico",
          body_html: "Piso vinílico de alta resistencia al agua. Sistema click.",
          vendor: "ABKupfer",
          product_type: "Pisos",
          variants: [{ price: "24990", available: true }],
          images: [
            {
              src: "https://images.unsplash.com/photo-1581858326456-6164fb0b7afb?auto=format&fit=crop&w=300&q=80",
            },
          ],
        },
        {
          id: 102,
          title: "Revestimiento WPC Exterior",
          body_html: "Tabla composite para terrazas. Libre de mantenimiento.",
          vendor: "ABKupfer",
          product_type: "Revestimientos",
          variants: [{ price: "32500", available: true }],
          images: [
            {
              src: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80",
            },
          ],
        },
      ],
    });

    const extractedProducts = await engine.runExtraction(
      { url: "mock", storeType: "SHOPIFY" },
      mockShopifyData
    );

    const fiferBoxPayload = {
      boxId: "fifer-affiliate-catalog",
      meta: { timestamp: new Date().toISOString(), ghostMode: false },
      data: { products: extractedProducts },
    };

    return NextResponse.json(fiferBoxPayload);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      {
        error: "Error procesando extracción de catálogo",
        details: msg,
        meta: { ghostMode: true },
      },
      { status: 500 }
    );
  }
}
