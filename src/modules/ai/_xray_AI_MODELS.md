# FIFER — Currículum de modelos conectados (`_xray_AI_MODELS`)

> **Rol:** Benchmark y especialización de todas las inteligencias enlazadas al producto: coste, tier, fortalezas y **mejor caso de uso** para no mezclar “modelo barato” con tareas que requieren precisión o realismo.

**Convención:** **Tier** = FREE (cuota gratuita o capa demo) · PRO (pago o créditos de plataforma). **Costo/Acción** = unidad de referencia (tokens, créditos, $0); alinear con facturación real en consola del proveedor.

---

## Benchmarking

| Modelo | Tier | Costo/Acción | Especialización | Eficiencia (1-10) | Mejor caso de uso |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Gemini 2.0 Flash** | FREE | $0 | Lógica rápida | 9 | Pre-procesamiento y mocks |
| **Claude 3.5 Sonnet** | PRO | 15 tokens | Código y UI | 10 | Integración de v0 y refactor |
| **Veo (Video)** | PRO | 1 crédito | Realismo cinematográfico | 9 | Videos de productos ABKupfer |
| **Lyria 3 (Música)** | PRO | 0.5 créd. | Ambientes sonoros | 8 | Audio para campañas de IG |

---

## Detalle de especialización

Qué IA conviene para cada tipo de tarea en el ecosistema FIFER / ABKupfer / Chicureo:

### Realismo

- **Veo (Video)** — Texturas de madera, materiales nobles, iluminación de producto y escenas tipo showroom; priorizar cuando el deliverable es **vídeo** y credibilidad visual.
- **Imagen de alta fidelidad (p. ej. Imagen 3 / flux según stack)** — Fotogramas estáticos de catálogo, fondos neutros, variantes de packshot.
- **Evitar** modelos pequeños o solo “chat” para generar assets finales de marca sin revisión humana.

### Caricatura / animación

- **Stable Diffusion + LoRA específico** — Estilos caricaturescos, mascotas, loops cortos para redes cuando la marca acepta un registro más **ilustrado** que fotorrealista.
- **Herramientas de animación ligera (p. ej. motion templates + IA)** — Stories y reels con personaje recurrente; mantener guía de marca (Deep Navy + acento amarillo FIFER).

### Lógica inmobiliaria

- **GPT-4o (o equivalente multimodal fuerte)** — Análisis de **leyes de regularización**, lectura asistida de normativa y síntesis de documentos largos (siempre con **verificación humana** y fuentes citadas).
- **Gemini 2.0 Flash** — Clasificación rápida de consultas, extracción de entidades (comuna, tipo de proyecto), routing hacia el modelo “pesado” solo cuando haga falta.

---

## Matriz rápida (cuándo no mezclar)

| Necesidad | Preferir | Evitar |
| :--- | :--- | :--- |
| Código + UI + ingestión v0 | Claude 3.5 Sonnet | Solo modelos FREE para PRs grandes |
| Latencia + volumen + mocks | Gemini 2.0 Flash | Sonnet para cada micro-paso |
| Vídeo producto ABKupfer | Veo | Solo texto → “imaginar” el vídeo |
| Banda sonora campaña IG | Lyria 3 | Stock genérico sin coherencia de marca |
| Normativa / regularización Chicureo | GPT-4o + revisión | Respuesta única sin fuente |

---

## Mantenimiento

- Al **añadir o retirar** un modelo del stack, actualizar la tabla de **Benchmarking** y una línea en la **Matriz rápida** si aplica.
- Tras cambios de precios en consola del proveedor, ajustar **Costo/Acción** sin pegar datos sensibles de contrato.
