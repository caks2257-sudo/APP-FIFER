"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";

const EMERALD = "#10b981";

/**
 * Fifer Heartbeat — micro-interacciones ambientales (THINKING / SUCCESS / SYNCING)
 * reaccionan a `useLayoutStore` (`isLoading`, `isDemoMode`) y al saldo (ROI / recargas).
 */
export function AmbientFeedback() {
  const isLoading = useLayoutStore((s) => s.isLoading);
  const isDemoMode = useLayoutStore((s) => s.isDemoMode);
  const successPulseAt = useLayoutStore((s) => s.successPulseAt);
  const walletBalance = useFinanceStore((s) => s.walletBalance);

  const [syncing, setSyncing] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const prevDemo = useRef(isDemoMode);
  const prevBalance = useRef(walletBalance);
  const balanceReady = useRef(false);

  /** SYNCING: al cambiar Demo ↔ Real (re-sync de datos mock). */
  useEffect(() => {
    if (prevDemo.current === isDemoMode) return;
    prevDemo.current = isDemoMode;
    setSyncing(true);
    const t = window.setTimeout(() => setSyncing(false), 2800);
    return () => window.clearTimeout(t);
  }, [isDemoMode]);

  /** SUCCESS: pulso explícito desde el shell. */
  useEffect(() => {
    if (successPulseAt <= 0) return;
    setSuccessFlash(true);
    const t = window.setTimeout(() => setSuccessFlash(false), 720);
    return () => window.clearTimeout(t);
  }, [successPulseAt]);

  /** SUCCESS: subida de saldo / “ROI” (Chispas). */
  useEffect(() => {
    if (!balanceReady.current) {
      balanceReady.current = true;
      prevBalance.current = walletBalance;
      return;
    }
    if (walletBalance > prevBalance.current) {
      setSuccessFlash(true);
      const t = window.setTimeout(() => setSuccessFlash(false), 720);
      prevBalance.current = walletBalance;
      return () => window.clearTimeout(t);
    }
    prevBalance.current = walletBalance;
  }, [walletBalance]);

  return (
    <div
      aria-hidden
      data-fifer-heartbeat="root"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10032,
        overflow: "hidden",
      }}
    >
      {/* THINKING — resplandor en esquinas (Electric Yellow) */}
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ position: "absolute", inset: 0 }}
          >
            {(
              [
                { top: -72, left: -72 },
                { top: -72, right: -72 },
                { bottom: -72, left: -72 },
                { bottom: -72, right: -72 },
              ] as const
            ).map((pos, i) => (
              <motion.div
                key={i}
                style={{
                  position: "fixed",
                  width: "min(44vw, 300px)",
                  height: "min(44vw, 300px)",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${FIFER_ELECTRIC_YELLOW}50 0%, transparent 72%)`,
                  filter: "blur(3px)",
                  ...pos,
                }}
                animate={{ opacity: [0.38, 0.78, 0.38] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.18,
                }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* SUCCESS — destello esmeralda */}
      <AnimatePresence>
        {successFlash ? (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.22, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, times: [0, 0.35, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse 80% 55% at 50% 40%, ${EMERALD} 0%, transparent 65%)`,
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* SYNCING — línea 1px superior indeterminada */}
      <AnimatePresence>
        {syncing ? (
          <motion.div
            key="sync"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              overflow: "hidden",
              background: "linear-gradient(90deg, transparent, rgba(234,179,8,0.15), transparent)",
            }}
          >
            <motion.div
              style={{
                position: "absolute",
                top: 0,
                left: "-40%",
                width: "40%",
                height: "100%",
                background: `linear-gradient(90deg, transparent, ${FIFER_ELECTRIC_YELLOW}, transparent)`,
                opacity: 0.85,
              }}
              animate={{ left: ["-40%", "140%"] }}
              transition={{ duration: 1.15, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
