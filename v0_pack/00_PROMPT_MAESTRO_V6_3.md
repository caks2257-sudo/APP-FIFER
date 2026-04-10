# Prompt Maestro v6.3 — Dual-Stage AI Support (Fifer Living OS Shell)

**Uso:** Tras subir `01`–`09` al chat de v0, pega el bloque siguiente (o sube este archivo como contexto adicional).

**Cambio vs v6.1 / v6.2:** soporte explícito para **dos motores** (refinamiento base + ejecución Pro), feedback visual en chat, `isRefining` en contrato, y **Upgrade Suggestion** JIT para FREE en campañas complejas.

---

```
Rol: Eres el Principal System Architect de FIFER.
Tarea: Construir el "Fifer Living OS Shell" con soporte para "Dual-Stage AI" — Una piel de UI orgánica, interactiva y autogestionada donde se perciban dos capas de inteligencia colaborando.

CONTEXTO:
He subido un paquete de inteligencia numerado del 01 al 09. No inventes estilos; DEBES seguir estrictamente lo definido en '02_MASTER_STYLE.md' y '08_STYLEGUIDE_TOKENS.md'.

### 1. OBJETIVO TÉCNICO
Genera un único archivo maestro 'FiferLivingOS.tsx' que actúe como el Canvas principal.

### 2. ARQUITECTURA DE DATOS (Protocolo Shell)
- El componente DEBE aceptar las props del archivo '03_PROTOCOL_SHELL.md': { data, config, isLoading, error, isLocked, isRefining, boxId } (layout/manifiesto según integración con el shell).
- Cuando `isRefining === true`, el chat del Box NO debe mostrar aún la respuesta final: debe mostrar el estado de "Pulido de Prompt" (Etapa 1 del pipeline dual).
- Usa '04_INTEGRATIONS_HEALTH.md' para diseñar los estados de error del DiscoveryBox.

### 3. IDENTIDAD VISUAL POR MÓDULO (Local X-Rays)
Consulta los archivos 05, 06 y 07 para aplicar los colores de acento dinámicos:
- Módulo Finanzas (05_LOCAL_FINANCE.md): Esmeralda Inmobiliario.
- Módulo Contenido (06_LOCAL_CONTENT.md): Azul Editorial ABKupfer.
- Módulo Afiliados (07_LOCAL_AFFILIATES.md): Yellow Electric.

### 4. INTERFAZ VIVA (Living OS Features)
- BOX INTERACTION: Cada Box debe tener handle de arrastre, botón "Chispa IA" y el modo 'AI-Flip' (giro 180°).
- PERSONALIDAD: El chat interno debe usar el tono y la "Colaboración Jerárquica" descritos en '09_AI_PERSONA.md' (motor base + motor Pro como equipo).
- HEARTBEAT: Implementa micro-interacciones sutiles (pulsos en bordes) cuando la IA esté en estado 'Thinking' o en refinamiento (`isRefining`).

### 5. GLOBAL COMMANDER (Spotlight UI)
- Diseña la barra de comandos flotante (Cmd+K) con fondo Deep Navy (#0A0F1E) y Glassmorphism, sugiriendo comandos como '/uf', '/stock' o '/status'.

### 6. RESTRICCIÓN DE CÓDIGO
- Usa Tailwind puro y Lucide-React.
- No incluyas lógica de negocio real (llamadas a APIs de pago con texto crudo del usuario); toda orquestación dual-stage se delega a props y al runtime FIFER — la UI solo refleja estados.
- El código debe seguir el estándar de 'atomización' para que Cursor lo integre fácilmente.

### 7. DUAL-STAGE AI FEEDBACK (Nuevo)
- Implementa una animación visual en el chat de los Boxes que muestre el flujo de inteligencia:
    1. **'Refinando tu idea...'** — Icono de **chispa** amarilla suave (acento cercano a Electric Yellow #EAB308, sin quemar el contraste sobre Deep Navy).
    2. **'Generando con Motor Pro...'** — Icono de **diamante** con resplandor Electric Yellow (#EAB308).
- El usuario debe sentir que hay una **"IA de pensamiento"** (refinamiento / Master Prompt) y una **"IA de ejecución"** (Motor Pro) colaborando, no un solo bloque opaco de texto.
- Enlaza estos estados con `isRefining` y, si aplica, un flag explícito de "ejecución Pro" en curso (p. ej. derivado de props o de un sub-estado de chat), sin acoplar a un backend concreto.

### 8. INTERFAZ DE SUSCRIPCIÓN JIT
- Si un usuario **FREE** intenta una acción de **campaña compleja** que, tras el refinamiento gratuito, requeriría el Motor Pro para ejecutar con calidad de estudio, el Box debe mostrar un **Upgrade Suggestion** elegante (card o banner dentro del chat, estilo Fifer Box / glass sobre Deep Navy):
  - Copy sugerido: **"Refinamiento completado. Desbloquea el Motor Pro para ejecutar esta campaña con calidad de estudio."**
- El CTA debe ser claro (p. ej. "Ver planes" / "Desbloquear Pro") como placeholder sin implementar pasarela de pago.
- Mantén la accesibilidad: foco, contraste AA sobre #0A0F1E, y no bloquear el scroll del chat completo con un modal intrusivo salvo que el producto lo exija.

Resultado: Entrega el "Cascarón Vacío Inteligente" definitivo con **Dual-Stage AI** en la superficie de chat, listo para recibir los datos de ABKupfer y los proyectos de Chicureo.
```

---

**Checklist rápido**

1. Subir `01_REPORT_MAESTRO.md` … `09_AI_PERSONA.md` a v0 (incluye **03** con `isRefining` y **09** con Colaboración Jerárquica).
2. Pegar el bloque entre comillas invertidas arriba **o** subir este archivo `00_PROMPT_MAESTRO_V6_3.md`.
3. Validar que la salida respete **02** + **08**, el protocolo **03**, y las secciones **7**–**8** (feedback dual + upgrade JIT).
