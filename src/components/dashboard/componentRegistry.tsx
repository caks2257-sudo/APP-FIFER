import type { DashboardWidget } from './mockDashboardConfig';
import BoxLoader from '@/components/core/BoxLoader';
import { renderBoxById } from '@/components/v0-ingestion/registry';

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
