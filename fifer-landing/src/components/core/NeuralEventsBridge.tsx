"use client";

import { useNeuralEvents } from "@/hooks/useNeuralEvents";

/** Monta el Neural Event Trigger en el shell del dashboard (sin UI). */
export function NeuralEventsBridge() {
  useNeuralEvents();
  return null;
}
