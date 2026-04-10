"use client";

import { IngestorFeedBox } from "@/components/ingestor/IngestorFeedBox";
import type { FiferV0BoxProps } from "../types";

/** Socket v0 — Ingestor; `reloadNonce` lo inyecta `BoxLoader` vía `jitChildProps`. */
export default function FiferIngestorFeedV0(props: FiferV0BoxProps) {
  const nonce = typeof props.reloadNonce === "number" ? props.reloadNonce : 0;
  return <IngestorFeedBox reloadNonce={nonce} />;
}
