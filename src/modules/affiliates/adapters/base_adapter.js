/**
 * Multi-Store Universal Connectors — interfaz base (v2.8).
 * Cada adaptador traduce la API externa al esquema FIFER normalizado.
 *
 * Métodos abstractos: getProduct, getPrice, checkStock.
 */
class BaseAffiliateAdapter {
  /** @returns {string} p.ej. "shopify" | "mercadolibre" */
  get providerId() {
    throw new Error(`${this.constructor.name} must implement providerId`);
  }

  /**
   * Producto normalizado FIFER (v2.8 + compat ingest).
   * Contrato unificado v3.6 (FiferNormalizedProduct):
   * external_id, name, price, currency, main_image_url, source_store,
   * commission_rate, stock_status, raw_data.
   * @param {string} productId - ID en la plataforma origen
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async getProduct(productId, options = {}) {
    void productId;
    void options;
    throw new Error(`${this.constructor.name} must implement getProduct`);
  }

  /**
   * @param {string} productId
   * @param {object} [options]
   * @returns {Promise<{ available: boolean, quantity: number | null, stock_status?: string, raw?: object }>}
   */
  async checkStock(productId, options = {}) {
    void productId;
    void options;
    throw new Error(`${this.constructor.name} must implement checkStock`);
  }

  /**
   * @param {string} productId
   * @param {object} [options]
   * @returns {Promise<{ amount: number, currency: string, raw?: object }>}
   */
  async getPrice(productId, options = {}) {
    void productId;
    void options;
    throw new Error(`${this.constructor.name} must implement getPrice`);
  }
}

module.exports = {
  BaseAffiliateAdapter,
};
