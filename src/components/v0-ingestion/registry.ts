import type { ReactNode } from 'react';
import type { BoxId } from '@/registry/box-catalog';
import type { V0BoxProps } from './box-types';
import ContentIngestionForm from './boxes/ContentIngestionForm';
import ContratosBox from './boxes/ContratosBox';
import FiferContratosMain from './boxes/FiferContratosMain';
import FinanceCashflowChart from './boxes/FinanceCashflowChart';
import FinanceLiquidityForecastBox from './boxes/FinanceLiquidityForecastBox';
import FiferInmobiliarioMain from './boxes/FiferInmobiliarioMain';
import FiferMisbotsMain from './boxes/FiferMisbotsMain';
import SystemHealthMonitor from './boxes/SystemHealthMonitor';

export type BoxProps = V0BoxProps;

type BoxRenderer = (props: BoxProps) => ReactNode;

const renderers: Record<BoxId, BoxRenderer> = {
  'finance-cashflow-chart': (props) => FinanceCashflowChart(props),
  'finance-liquidity-forecast': (props) => FinanceLiquidityForecastBox(props),
  'content-ingestion-form': (props) => ContentIngestionForm(props),
  'system-health-monitor': (props) => SystemHealthMonitor(props),
  'fifer-contratos-main': (props) => FiferContratosMain(props),
  'fifer-inmobiliario-main': (props) => FiferInmobiliarioMain(props),
  'fifer-misbots-main': (props) => FiferMisbotsMain(props),
};

export function renderBoxById(boxId: BoxId, props: BoxProps) {
  return renderers[boxId](props);
}

export {
  FinanceCashflowChart,
  FinanceLiquidityForecastBox,
  ContentIngestionForm,
  SystemHealthMonitor,
  FiferContratosMain,
  FiferInmobiliarioMain,
  FiferMisbotsMain,
  ContratosBox,
};
