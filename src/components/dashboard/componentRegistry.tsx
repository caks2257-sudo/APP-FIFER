import type { DashboardWidget } from './mockDashboardConfig';
import BoxLoader from '@/components/core/BoxLoader';
import { renderBoxById } from '@/components/v0-ingestion/registry';

export function getWidgetColSpanClass(colSpan: DashboardWidget['colSpan']) {
  const colSpanMap: Record<DashboardWidget['colSpan'], string> = {
    4: 'col-span-12 xl:col-span-4',
    6: 'col-span-12 xl:col-span-6',
    8: 'col-span-12 xl:col-span-8',
    12: 'col-span-12 xl:col-span-12',
  };

  return colSpanMap[colSpan];
}

export function renderDashboardWidget(
  widget: DashboardWidget,
  isRefining = false,
  isLoading = false,
  hasError = false,
) {
  const renderedWidget = renderBoxById(widget.boxId, {
    data: widget.data,
    config: widget.config,
    isRefining,
    isLocked: widget.state?.isLocked,
  });

  return (
    <BoxLoader
      module={widget.module}
      isLoading={widget.state?.isLoading ?? isLoading}
      hasError={widget.state?.hasError ?? hasError}
      isLocked={widget.state?.isLocked}
    >
      {renderedWidget}
    </BoxLoader>
  );
}
