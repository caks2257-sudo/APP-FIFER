# Plano Visual — Afiliados

## Shell

- Página: `src/app/(dashboard)/afiliados/page.tsx` (cliente); contenedor acotado por `src/app/(dashboard)/layout.tsx` (`max-w-7xl` en el wrapper del grupo).

## Componentes montados

- **`BaseBoxTemplate`:** título configurado como «Afiliados».
- **`SmartInsightWidget`:** `moduleId="afiliados"`, `boxId="afiliados-page"`, instrucción de sistema alineada a insights operativos FIFER v6.0.
- **`BoxErrorBoundary`:** envuelve el contenido principal.
- **Control de acceso:** si `coreProfile.role` no es `admin`, se muestra panel de «Acceso Denegado» con borde rojo semitransparente sobre fondo `#0A0F1E`.

## Paleta

- Fondo coherente con el shell del dashboard: **Deep Navy** `#0A0F1E`.
- Tipografía clara sobre fondo oscuro; sin amarillo en esta pantalla salvo lo que aporten plantillas hijas de `BaseBoxTemplate` / widgets.
