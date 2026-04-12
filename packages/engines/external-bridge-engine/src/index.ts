export * from './keys';
export * from './integration-types';
export * from './discovery';
export * from './bridge-latency';
export * from './bridge-proxy';
export * from './payment-webhook';
export * from './mocks';
export * from './adapters/payments';
export * from './adapters/billing';
export * from './adapters/banking';

import {
  BankingAdapter,
  type BankingTransactionsResult,
} from './adapters/banking';
import {
  BillingAdapter,
  type EmitInvoiceInput,
  type EmitInvoiceResult,
} from './adapters/billing';
import {
  PaymentsAdapter,
  type CreateCheckoutLinkInput,
  type CreateCheckoutLinkResult,
} from './adapters/payments';
import {
  BridgeProxy,
  type BridgeProxyConstructorOptions,
} from './bridge-proxy';
import { pingBridgeIntegrations } from './bridge-latency';
import type { BridgeActivePing } from './bridge-latency';
import {
  BRIDGE_ENV_BINDINGS,
} from './keys';
import type { IntegrationPublicStatus } from './integration-types';

type VaultOverride = BridgeProxyConstructorOptions['vaultByEnvKey'];

export const ENGINE_ID = 'external-bridge-engine' as const;

export type ExternalBridgeEngineApi = {
  readonly id: typeof ENGINE_ID;
  getHealthStatus: () => { ok: boolean; note: string; integrations: number };
  buildProxy: (vault?: VaultOverride) => BridgeProxy;
  getPublicIntegrationStatuses: (
    vault?: VaultOverride,
  ) => IntegrationPublicStatus[];
  getPaymentsAdapter: (vault?: VaultOverride) => PaymentsAdapter;
  getBillingAdapter: (vault?: VaultOverride) => BillingAdapter;
  getBankingAdapter: (vault?: VaultOverride) => BankingAdapter;
  /** Delegación en `BankingAdapter.getTransactions()` (Fintoc / mock). */
  getBankingTransactions: (
    vault?: VaultOverride,
  ) => Promise<BankingTransactionsResult>;
  /** Delegación en `PaymentsAdapter.createCheckoutLink()` (Flow / mock). */
  createCheckoutLink: (
    input: CreateCheckoutLinkInput,
    vault?: VaultOverride,
  ) => Promise<CreateCheckoutLinkResult>;
  /** Delegación en `BillingAdapter.emitInvoice()` (DTE / OpenFactura). */
  emitInvoice: (
    input: EmitInvoiceInput,
    vault?: VaultOverride,
  ) => Promise<EmitInvoiceResult>;
  /** Sondas ligeras de latencia (descubrimiento dinámico + ping factory por familia LIVE). */
  pingAllActiveIntegrations: () => Promise<BridgeActivePing[]>;
};

function toPublicStatuses(proxy: BridgeProxy): IntegrationPublicStatus[] {
  const snap = proxy.snapshotAll();
  return snap.map((s) => {
    const meta = BRIDGE_ENV_BINDINGS.find((b) => b.envKey === s.envKey);
    return {
      integrationId: s.integrationId,
      envKey: s.envKey,
      label: meta?.label ?? s.envKey,
      category: meta?.category ?? 'FINANZAS_PAGOS',
      mode: s.mode,
      source: s.source,
    };
  });
}

export class ExternalBridgeEngine implements ExternalBridgeEngineApi {
  readonly id = ENGINE_ID;

  getHealthStatus() {
    try {
      const p = new BridgeProxy();
      const n = p.snapshotAll().length;
      return {
        ok: true,
        note: 'external-bridge-engine operativo',
        integrations: n,
      };
    } catch (e) {
      return {
        ok: false,
        note: e instanceof Error ? e.message : 'error',
        integrations: 0,
      };
    }
  }

  buildProxy(vault?: VaultOverride) {
    return new BridgeProxy({ vaultByEnvKey: vault });
  }

  getPublicIntegrationStatuses(vault?: VaultOverride) {
    return toPublicStatuses(this.buildProxy(vault));
  }

  getPaymentsAdapter(vault?: VaultOverride) {
    const proxy = this.buildProxy(vault);
    const r = proxy.resolveKey('FLOW_API_KEY');
    return new PaymentsAdapter(r);
  }

  getBillingAdapter(vault?: VaultOverride) {
    const proxy = this.buildProxy(vault);
    const r = proxy.resolveKey('STRIPE_SECRET_KEY');
    return new BillingAdapter(r);
  }

  getBankingAdapter(vault?: VaultOverride) {
    const proxy = this.buildProxy(vault);
    const r = proxy.resolveKey('FINTOC_SECRET_KEY');
    return new BankingAdapter(r);
  }

  async getBankingTransactions(vault?: VaultOverride) {
    const adapter = this.getBankingAdapter(vault);
    return adapter.getTransactions();
  }

  async createCheckoutLink(
    input: CreateCheckoutLinkInput,
    vault?: VaultOverride,
  ) {
    const adapter = this.getPaymentsAdapter(vault);
    return adapter.createCheckoutLink(input);
  }

  async emitInvoice(input: EmitInvoiceInput, vault?: VaultOverride) {
    const adapter = this.getBillingAdapter(vault);
    return adapter.emitInvoice(input);
  }

  async pingAllActiveIntegrations() {
    return pingBridgeIntegrations();
  }
}
