export type ExtractedCatalogItem = {
  id: string;
  title: string;
  category: "piso-madera" | "revestimiento";
  priceUsd: number;
  sourceUrl: string;
};

/** Mock JIT Hydration: simula 1s de latencia y devuelve catálogo de ejemplo. */
export async function getExtractedCatalog(url: string): Promise<ExtractedCatalogItem[]> {
  const sourceUrl = String(url || "https://catalogo-demo.fifer.local").trim() || "https://catalogo-demo.fifer.local";
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      id: "wood-floor-001",
      title: "Piso de Madera Roble Natural 12mm",
      category: "piso-madera",
      priceUsd: 44.9,
      sourceUrl,
    },
    {
      id: "wood-floor-002",
      title: "Piso de Madera Ingeniería Nogal 10mm",
      category: "piso-madera",
      priceUsd: 57.5,
      sourceUrl,
    },
    {
      id: "wall-cover-001",
      title: "Revestimiento Decorativo WPC Arena",
      category: "revestimiento",
      priceUsd: 29.99,
      sourceUrl,
    },
    {
      id: "wall-cover-002",
      title: "Revestimiento Interior PVC Mármol Gris",
      category: "revestimiento",
      priceUsd: 21.3,
      sourceUrl,
    },
    {
      id: "wall-cover-003",
      title: "Revestimiento Exterior Deck Composite",
      category: "revestimiento",
      priceUsd: 38.0,
      sourceUrl,
    },
  ];
}