'use client';

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Layout } from "react-grid-layout";

import SmartWidgetWrapper from '@/components/dashboard/SmartWidgetWrapper';
import { BankConnectionWidget } from '@/components/dashboard/widgets/BankConnectionWidget';
import { CashFlowWidget } from '@/components/dashboard/widgets/CashFlowWidget';
import type {
  CashFlowReport,
  FintocAccount,
} from '@/components/dashboard/widgets/contracts';
import type { DashboardLayoutPersisted } from '@/types/dashboard-layout-persisted';

type DashboardCanvasWidget = {
  id: string;
  defaultLayout: Pick<Layout, 'x' | 'y' | 'w' | 'h'>;
  children: ReactNode | ((dimensions: { w: number; h: number }) => ReactNode);
};

type DashboardCanvasProps = {
  initialLayout: DashboardLayoutPersisted | null;
  widgets: DashboardCanvasWidget[];
  fintocData?: FintocAccount;
  cashflowData?: CashFlowReport;
  /** Si se define, se pasa a los widgets financieros auto-inyectados (p. ej. sub-apps). */
  financeWidgetContext?: string;
  onPersist?: (layout: DashboardLayoutPersisted) => Promise<void>;
  className?: string;
};

const COLUMNS = 12;
const ResponsiveGrid = dynamic(() => import("./ResponsiveGrid"), {
  ssr: false,
  loading: () => <div className="p-4 text-gray-500 animate-pulse">Cargando dashboard...</div>
}
);

function buildLayout(
  widgets: DashboardCanvasWidget[],
  initialLayout: DashboardLayoutPersisted | null,
): Layout[] {
  return widgets.map((widget) => {
    const persistedCell = initialLayout?.cells?.[widget.id];
    const base = persistedCell ?? widget.defaultLayout;
    return {
      i: widget.id,
      x: base.x,
      y: base.y,
      w: base.w,
      h: base.h,
      minW: 2,
      minH: 1,
    };
  });
}

function toPersistedLayout(nextLayout: Layout[]): DashboardLayoutPersisted {
  return {
    cells: nextLayout.reduce<Record<string, { x: number; y: number; w: number; h: number }>>(
      (acc, cell) => {
        acc[cell.i] = { x: cell.x, y: cell.y, w: cell.w, h: cell.h };
        return acc;
      },
      {},
    ),
  };
}

export default function DashboardCanvas({
  initialLayout,
  widgets,
  fintocData,
  cashflowData,
  financeWidgetContext,
  onPersist,
  className,
}: DashboardCanvasProps) {
  const financeWidgets = useMemo<DashboardCanvasWidget[]>(
    () => [
      {
        id: 'finance-bank-connection',
        defaultLayout: { x: 0, y: 0, w: 6, h: 3 },
        children: (
          <BankConnectionWidget
            account={fintocData}
            context={financeWidgetContext}
            viewMode="global"
          />
        ),
      },
      {
        id: 'finance-cash-flow',
        defaultLayout: { x: 6, y: 0, w: 6, h: 3 },
        children: (
          <CashFlowWidget report={cashflowData} context={financeWidgetContext} viewMode="global" />
        ),
      },
    ],
    [cashflowData, fintocData, financeWidgetContext],
  );

  const allWidgets = useMemo(() => {
    const existingIds = new Set(widgets.map((widget) => widget.id));
    const extras = financeWidgets.filter((widget) => !existingIds.has(widget.id));
    return [...widgets, ...extras];
  }, [financeWidgets, widgets]);

  const [layout, setLayout] = useState<Layout[]>(() => buildLayout(allWidgets, initialLayout));
  const [hasHydrated, setHasHydrated] = useState(false);
  const lastSerializedRef = useRef<string>(JSON.stringify(toPersistedLayout(buildLayout(allWidgets, initialLayout))));

  useEffect(() => {
    const next = buildLayout(allWidgets, initialLayout);
    setLayout(next);
    lastSerializedRef.current = JSON.stringify(toPersistedLayout(next));
    setHasHydrated(true);
  }, [allWidgets, initialLayout]);

  useEffect(() => {
    if (!onPersist || !hasHydrated) return;
    const payload = toPersistedLayout(layout);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSerializedRef.current) return;

    const timer = window.setTimeout(() => {
      void onPersist(payload)
        .then(() => {
          lastSerializedRef.current = serialized;
        })
        .catch(() => {
          // Keep local layout and retry on next user change.
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [layout, onPersist, hasHydrated]);

  const layoutById = useMemo(() => {
    return layout.reduce<Record<string, Layout>>((acc, cell) => {
      acc[cell.i] = cell;
      return acc;
    }, {});
  }, [layout]);

  return (
    <div className={className}>
      <ResponsiveGrid
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200 }}
        cols={{ lg: COLUMNS }}
        rowHeight={84}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isResizable
        isDraggable
        onLayoutChange={(nextLayout) => setLayout(nextLayout)}
        draggableHandle=".widget-handle"
      >
        {allWidgets.map((widget) => (
          <div key={widget.id}>
            <SmartWidgetWrapper
              layout={layoutById[widget.id] ?? { w: widget.defaultLayout.w, h: widget.defaultLayout.h }}
              className="h-full"
            >
              {widget.children}
            </SmartWidgetWrapper>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
}
