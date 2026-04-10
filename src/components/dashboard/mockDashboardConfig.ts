// Deprecated as source of truth.
// Runtime dashboard configuration now comes from `/api/v1/dashboard` via `useDashboard`.
import type { BoxId, BoxModule } from '@/registry/box-catalog';

type WidgetState = {
  isLoading?: boolean;
  hasError?: boolean;
  isLocked?: boolean;
};

export type DashboardWidget =
  | {
      id: string;
      boxId: BoxId;
      module: BoxModule;
      colSpan: 4 | 6 | 12;
      state?: WidgetState;
      data: Record<string, unknown>;
      config?: Record<string, unknown>;
    }
  | {
      id: string;
      boxId: BoxId;
      module: BoxModule;
      colSpan: 8 | 12;
      state?: WidgetState;
      data: Record<string, unknown>;
      config?: Record<string, unknown>;
    }
  | {
      id: string;
      boxId: BoxId;
      module: BoxModule;
      colSpan: 4 | 6 | 12;
      state?: WidgetState;
      data: Record<string, unknown>;
      config?: Record<string, unknown>;
    };
