"use client";

import { ContentPipelineBox } from "@/components/content/ContentPipelineBox";
import type { FiferV0BoxProps } from "../types";

/** Socket v0 — sustituye el cuerpo por el código exportado desde v0 manteniendo este default export. */
export default function FiferContentPipelineV0(props: FiferV0BoxProps) {
  void props.manifest;
  return <ContentPipelineBox />;
}
