"use client";

import React, { useState } from "react";
import { PackageSearch, Sparkles, Diamond, Loader2 } from "lucide-react";

interface NormalizedProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stockStatus: string;
  images: string[];
  metadata: Record<string, unknown>;
}

interface CatalogBoxProps {
  data?: { products: NormalizedProduct[] };
  isLoading?: boolean;
  error?: Error | null;
}

export function FiferAffiliateCatalog({ data, isLoading, error }: CatalogBoxProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [contentResult, setContentResult] = useState<
    Record<string, { refined: string; final?: string }>
  >({});

  const handleAutoPost = async (product: NormalizedProduct) => {
    setGeneratingId(product.id);

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productTitle: product.title,
          productDescription: product.description,
          isProUser: true,
        }),
      });

      if (!res.ok) throw new Error("Error al generar");

      const result = await res.json();

      setTimeout(() => {
        setContentResult((prev) => ({
          ...prev,
          [product.id]: {
            refined: result.refinedPrompt,
            final: result.finalOutput,
          },
        }));
        setGeneratingId(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setGeneratingId(null);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-64 w-full animate-pulse items-center justify-center rounded-xl border border-[#EAB308]/20 bg-[#0A0F1E]">
        <span className="text-[#EAB308]/50">Sincronizando catálogo...</span>
      </div>
    );
  if (error || !data)
    return (
      <div className="w-full rounded-xl border border-red-900/50 bg-[#0A0F1E] p-6 text-red-400">
        Ghost Mode: Fallo de sincronización.
      </div>
    );

  return (
    <div className="w-full overflow-hidden rounded-[0.75rem] border border-[#EAB308]/30 bg-[#0A0F1E] font-sans shadow-xl">
      <div className="flex items-center justify-between border-b border-[#EAB308]/20 bg-gradient-to-r from-slate-900 to-[#0A0F1E] p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#EAB308]/10 p-2">
            <PackageSearch className="h-5 w-5 text-[#EAB308]" />
          </div>
          <div>
            <h3 className="font-bold tracking-wide text-white">Content Engine</h3>
            <p className="text-xs text-slate-400">ABKupfer Products Sincronizados</p>
          </div>
        </div>
        <span className="rounded-full border border-[#EAB308]/20 bg-[#EAB308]/10 px-3 py-1 text-xs font-bold text-[#EAB308]">
          {data.products.length} ITEMS
        </span>
      </div>

      <div className="space-y-4 p-5">
        {data.products.map((product) => {
          const isGenerating = generatingId === product.id;
          const hasContent = contentResult[product.id];

          return (
            <div
              key={product.id}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition-colors"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#2563EB]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                    {(product.metadata?.vendor as string) || "VENDOR"}
                  </span>
                  <h4 className="text-sm font-semibold text-white">{product.title}</h4>
                </div>
                <span className="text-lg font-bold text-white">
                  ${product.price.toLocaleString("es-CL")}
                </span>
              </div>

              {hasContent ? (
                <div className="mt-4 rounded border border-[#EAB308]/30 border-l-2 border-l-[#EAB308] bg-[#0A0F1E] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Diamond className="h-4 w-4 text-[#EAB308]" />
                    <span className="text-xs font-bold text-[#EAB308]">EJECUCIÓN PRO COMPLETADA</span>
                  </div>
                  <p className="text-sm italic text-slate-300">{hasContent.final}</p>
                </div>
              ) : isGenerating ? (
                <div className="mt-4 flex items-center gap-3 rounded border border-slate-700 bg-slate-800/50 p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[#EAB308]" />
                  <div>
                    <span className="block text-xs font-bold text-slate-300">
                      Refinando idea... (Etapa 1)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Preparando motor Pro para ejecución final...
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAutoPost(product)}
                    className="flex items-center gap-1.5 rounded-md bg-[#2563EB] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1D4ED8]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Auto-Post
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
