export type ModuleKey = "finance" | "content" | "ingestor";

export type BoxProps<TData = unknown> = {
  data?: TData;
  isLocked?: boolean;
  config?: Record<string, unknown>;
};

export type BoxManifest = {
  boxId: string;
  sourceModule: ModuleKey;
  targetSlot: "slot-stats-grid" | "slot-main-content" | "slot-sidebar-nav";
  layout: { minWidth: number; minHeight: number; isResizable: boolean };
};

export type ModuleConfig = {
  key: ModuleKey;
  title: string;
  route: `/${ModuleKey}`;
  defaultSlots: BoxManifest[];
};
