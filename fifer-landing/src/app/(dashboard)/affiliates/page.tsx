import React from "react";
import { headers } from "next/headers";
import { FiferAffiliateCatalog } from "@/components/v0-ingestion/fifer-affiliate-catalog";

export const dynamic = "force-dynamic";

async function getCatalogData() {
  try {
    const headersList = headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const res = await fetch(`${protocol}://${host}/api/affiliates/sync`, { cache: "no-store" });
    if (!res.ok) throw new Error("Fallo al obtener catálogo");
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function AffiliatesDashboard() {
  const response = await getCatalogData();

  return (
    <main className="min-h-screen bg-[#050810] p-8 text-white">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="font-fifer-heading text-3xl font-bold">Affiliate & Content Hub</h1>
        <p className="mt-2 text-slate-400">Sincronización orquestada por @fifer/scraping-engine</p>
      </header>

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-10 lg:col-span-8">
          <FiferAffiliateCatalog
            data={response?.data}
            error={!response ? new Error("Fetch failed") : null}
          />
        </div>
      </section>
    </main>
  );
}
