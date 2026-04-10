export interface BoxUIConfig {
  type: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "currency" | "badge" | "date" | "action";
}

export interface TableConfig extends BoxUIConfig {
  type: "table";
  columns: ColumnDef[];
  actions?: string[];
}

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
}

export interface ChartConfig extends BoxUIConfig {
  type: "chart";
  chartType: "line" | "bar" | "area";
  xAxisKey: string;
  series: SeriesDef[];
}

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "select" | "toggle";
  required?: boolean;
  options?: { label: string; value: string }[];
}

export interface FormConfig extends BoxUIConfig {
  type: "form";
  fields: FieldDef[];
  submitEndpoint?: string;
}