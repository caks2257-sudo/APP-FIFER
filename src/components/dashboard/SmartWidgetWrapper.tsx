'use client';

import type { ReactNode } from 'react';
import type { Layout } from 'react-grid-layout';

type WidgetDimensions = {
  w: number;
  h: number;
};

type SmartWidgetWrapperProps = {
  layout: Pick<Layout, 'w' | 'h'>;
  className?: string;
  children: ReactNode | ((dimensions: WidgetDimensions) => ReactNode);
};

export default function SmartWidgetWrapper({
  layout,
  className,
  children,
}: SmartWidgetWrapperProps) {
  const dimensions: WidgetDimensions = { w: layout.w, h: layout.h };

  return (
    <div className={className}>
      {typeof children === 'function'
        ? (children as (d: WidgetDimensions) => ReactNode)(dimensions)
        : children}
    </div>
  );
}
