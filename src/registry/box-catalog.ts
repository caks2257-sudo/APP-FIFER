export type BoxId =
  | 'finance-cashflow-chart'
  | 'finance-liquidity-forecast'
  | 'content-ingestion-form'
  | 'system-health-monitor'
  | 'fifer-contratos-main'
  | 'fifer-inmobiliario-main'
  | 'fifer-misbots-main';

export type BoxModule =
  | 'finance'
  | 'content'
  | 'contracts'
  | 'system'
  | 'inmobiliario'
  | 'bots';

type BoxCatalogEntry = {
  boxId: BoxId;
  module: BoxModule;
  component:
    | 'chart-box'
    | 'activity-box'
    | 'system-monitor'
    | 'contratos-main'
    | 'inmobiliario-main'
    | 'misbots-main'
    | 'liquidity-forecast-box';
};

/** Alias genómico — mismo objeto que `boxCatalog`. */
export const BOX_CATALOG: Record<BoxId, BoxCatalogEntry> = {
  'finance-cashflow-chart': {
    boxId: 'finance-cashflow-chart',
    module: 'finance',
    component: 'chart-box',
  },
  'finance-liquidity-forecast': {
    boxId: 'finance-liquidity-forecast',
    module: 'finance',
    component: 'liquidity-forecast-box',
  },
  'content-ingestion-form': {
    boxId: 'content-ingestion-form',
    module: 'content',
    component: 'activity-box',
  },
  'system-health-monitor': {
    boxId: 'system-health-monitor',
    module: 'system',
    component: 'system-monitor',
  },
  'fifer-contratos-main': {
    boxId: 'fifer-contratos-main',
    module: 'finance',
    component: 'contratos-main',
  },
  'fifer-inmobiliario-main': {
    boxId: 'fifer-inmobiliario-main',
    module: 'inmobiliario',
    component: 'inmobiliario-main',
  },
  'fifer-misbots-main': {
    boxId: 'fifer-misbots-main',
    module: 'bots',
    component: 'misbots-main',
  },
};

export const boxCatalog = BOX_CATALOG;
