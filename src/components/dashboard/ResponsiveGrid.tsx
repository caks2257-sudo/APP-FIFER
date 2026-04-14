"use client";
import { useEffect, useState } from "react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

export default function ResponsiveGrid(props: any) {
  const [Grid, setGrid] = useState<any>(null);

  useEffect(() => {
    try {
      const RGL = require("react-grid-layout");
      const Responsive = RGL.Responsive || RGL.default?.Responsive || RGL.default?.default?.Responsive;
      const WidthProvider = RGL.WidthProvider || RGL.default?.WidthProvider || RGL.default?.default?.WidthProvider;
      
      if (WidthProvider && Responsive) {
        setGrid(() => WidthProvider(Responsive));
      } else {
        setGrid("CSS_FALLBACK"); // Plan B
      }
    } catch (e) {
      setGrid("CSS_FALLBACK");
    }
  }, []);

  if (!Grid) return <div className="text-gray-500 animate-pulse p-4">Cargando motores visuales...</div>;
  
  // 🛡️ Si la librería externa falla, usamos CSS Nativo para no bloquear la UI
  if (Grid === "CSS_FALLBACK") {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">{props.children}</div>;
  }

  return <Grid {...props}>{props.children}</Grid>;
}
