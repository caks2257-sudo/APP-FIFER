import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';
import { boxCatalog, type BoxId, type BoxModule } from '@/registry/box-catalog';

type Biome = BoxModule | 'core';

type RawWidget =
  | {
      id: string;
      boxId: BoxId;
      colSpan: 4 | 6 | 12;
      biome: Biome;
      state?: {
        isLoading?: boolean;
        hasError?: boolean;
        isLocked?: boolean;
      };
      data: {
        title: string;
        value: string;
        caption: string;
      };
      config?: Record<string, unknown>;
    }
  | {
      id: string;
      boxId: BoxId;
      colSpan: 8 | 12;
      biome: Biome;
      state?: {
        isLoading?: boolean;
        hasError?: boolean;
        isLocked?: boolean;
      };
      data: {
        title: string;
        subtitle: string;
        series: Array<{ label: string; value: number }>;
      };
      config?: Record<string, unknown>;
    }
  | {
      id: string;
      boxId: BoxId;
      colSpan: 4 | 6 | 12;
      biome: Biome;
      state?: {
        isLoading?: boolean;
        hasError?: boolean;
        isLocked?: boolean;
      };
      data: {
        title: string;
        description: string;
        sourceLabel: string;
        placeholder: string;
      };
      config?: Record<string, unknown>;
    }
  | {
      id: string;
      boxId: 'fifer-contratos-main';
      colSpan: 6 | 12;
      biome: Biome;
      state?: {
        isLoading?: boolean;
        hasError?: boolean;
        isLocked?: boolean;
      };
      data: Record<string, unknown>;
      config?: Record<string, unknown>;
    };

export type RawDashboardPayload = {
  widgets: RawWidget[];
  isRefining?: boolean;
};

export type FiferDashboardData = {
  biomeColors: {
    finance: string;
    content: string;
  };
  widgetBiomes: Record<string, Biome>;
};

export type FiferDashboardState = {
  data: FiferDashboardData;
  config: { widgets: DashboardWidget[] };
  isRefining: boolean;
};

const BIOME_COLORS = {
  finance: '#10B981',
  content: '#3B82F6',
};

export function toFiferBoxData(raw: RawDashboardPayload): FiferDashboardState {
  const widgetBiomes: Record<string, Biome> = {};
  const widgets: DashboardWidget[] = raw.widgets.map((widget) => {
    const moduleFromCatalog = boxCatalog[widget.boxId].module;
    widgetBiomes[widget.id] = widget.biome;

    return {
      id: widget.id,
      boxId: widget.boxId,
      module: moduleFromCatalog,
      colSpan: widget.colSpan,
      state: widget.state,
      data: widget.data,
      config: widget.config,
    };
  });

  return {
    data: {
      biomeColors: BIOME_COLORS,
      widgetBiomes,
    },
    config: { widgets },
    isRefining: Boolean(raw.isRefining),
  };
}
