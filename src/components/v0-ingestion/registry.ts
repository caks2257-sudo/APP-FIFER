import type { ReactNode } from 'react';
import type { BoxId } from '@/registry/box-catalog';
import AffiliateHeroSummary from './boxes/AffiliateHeroSummary';
import ContentIngestionForm from './boxes/ContentIngestionForm';
import FinanceCashflowChart from './boxes/FinanceCashflowChart';

export type BoxProps = {
  data: Record<string, unknown>;
  config?: Record<string, unknown>;
  isRefining?: boolean;
  isLocked?: boolean;
};

type BoxRenderer = (props: BoxProps) => ReactNode;

const renderers: Record<BoxId, BoxRenderer> = {
  'finance-cashflow-chart': (props) => FinanceCashflowChart(props),
  'content-ingestion-form': (props) => ContentIngestionForm(props),
  'affiliate-hero-summary': (props) => AffiliateHeroSummary(props),
};

export function renderBoxById(boxId: BoxId, props: BoxProps) {
  return renderers[boxId](props);
}

export {
  FinanceCashflowChart,
  ContentIngestionForm,
  AffiliateHeroSummary,
};
