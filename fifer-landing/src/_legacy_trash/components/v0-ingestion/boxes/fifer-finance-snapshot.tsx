"use client";

import { FinanceSnapshotBox } from "@/components/finance/FinanceSnapshotBox";
import type { FiferV0BoxProps } from "../types";

/** Socket v0 — pieza Finance (snapshot ROI). */
export default function FiferFinanceSnapshotV0(props: FiferV0BoxProps) {
  void props.manifest;
  return <FinanceSnapshotBox />;
}
