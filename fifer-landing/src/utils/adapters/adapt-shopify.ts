import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { ShopifyApiPayloadSchema } from "@/utils/adapters/schemas-zod";
import { buildZodDegradedNormalized, isRecord } from "@/utils/adapters/safe-fallback";

export function adaptShopifyToBoxData(payload: unknown): FiferBoxDataNormalized {
  if (!isRecord(payload)) {
    return {
      source: "shopify",
      title: "Shopify",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: "Respuesta no es objeto" },
      raw: payload,
    };
  }
  const parsed = ShopifyApiPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return buildZodDegradedNormalized("shopify", "Shopify", parsed.error, payload);
  }
  const p = parsed.data;
  const series: Array<{ label: string; value: number }> = [];
  if (Array.isArray(p.orders)) {
    p.orders.slice(0, 12).forEach((o, i) => {
      if (typeof o.total_price === "string") {
        const n = Number.parseFloat(o.total_price);
        if (!Number.isNaN(n)) series.push({ label: `Pedido ${i + 1}`, value: n });
      }
    });
  }
  return {
    source: "shopify",
    title: p.shop_name ?? "Tienda",
    series,
    metrics: typeof p.order_count === "number" ? { orders: p.order_count } : {},
    raw: payload,
  };
}
