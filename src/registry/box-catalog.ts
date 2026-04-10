export type BoxId =
  | 'finance-cashflow-chart'
  | 'content-ingestion-form'
  | 'affiliate-hero-summary';

export type BoxModule = 'finance' | 'content' | 'affiliates';

type BoxCatalogEntry = {
  boxId: BoxId;
  module: BoxModule;
  component: 'chart-box' | 'activity-box' | 'stat-card';
};

export const boxCatalog: Record<BoxId, BoxCatalogEntry> = {
  'finance-cashflow-chart': {
    boxId: 'finance-cashflow-chart',
    module: 'finance',
    component: 'chart-box',
  },
  'content-ingestion-form': {
    boxId: 'content-ingestion-form',
    module: 'content',
    component: 'activity-box',
  },
  'affiliate-hero-summary': {
    boxId: 'affiliate-hero-summary',
    module: 'affiliates',
    component: 'stat-card',
  },
};
