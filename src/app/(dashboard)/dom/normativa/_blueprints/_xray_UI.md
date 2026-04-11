# Plano Visual — Normativa DOM

## Página

- **`src/app/(dashboard)/dom/normativa/page.tsx`:** layout en dos columnas (`lg:grid-cols-2`): formulario a la izquierda, reporte a la derecha; cabecera con título y disclaimer de carácter orientativo.

## AnalisisTerrenoForm

- Contenedor `rounded-xl` con borde `#1E293B` y fondo `#0A0F1E`.
- Etiquetas en mayúsculas pequeñas (`#94A3B8`); inputs: fondo `#111827`, borde `#1E293B`, texto claro; foco con borde y anillo **`#EAB308`**.
- **Un único botón primario** «Ejecutar Análisis Normativo»: fondo `#EAB308`, texto `#0A0F1E`; estado deshabilitado con opacidad reducida.

## ReporteFactibilidad

- Vacío: borde discontinuo `#1E293B`, texto gris secundario.
- Error: panel con borde rojo apagado y fondo oscuro cálido (`bg-[#1c0f0f]/90`), texto rojo legible sin saturación chillona.
- Resultado **no factible**: tarjeta con borde/naranja técnico apagado (`#9a3412` / `bg-[#1a100c]`), texto coral suave (`#fecaca`); badges de estado esmerilados (no factible en tono ámbar/ladrillo).
- Resultado **factible**: badge verde esmeralda apagado; superficie máxima en `font-mono` grande.
- Observaciones: lista con viñetas si el array viene de la IA; párrafo si es string.
