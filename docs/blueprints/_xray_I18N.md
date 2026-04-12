# X-Ray — Internacionalización (i18n) FIFER

## UBICACIÓN LÓGICA

`FIFER://platform/i18n`

## Espejo técnico (código)

| Artefacto | Ruta / propósito |
|-----------|------------------|
| Routing locales | `src/i18n/routing.ts` — `locales`: `es-CL` (default), `en-US`; `localePrefix`: `as-needed` |
| Request config | `src/i18n/request.ts` — `getRequestConfig`, carga `messages/<locale>.json` |
| Navegación | `src/i18n/navigation.ts` — `createNavigation(routing)` → `Link`, `useRouter`, `usePathname`, `redirect` |
| Middleware | `src/middleware.ts` — `createIntlMiddleware(routing)` + Supabase SSR; rutas privadas evaluadas tras quitar prefijo `/en-US` |
| Layout locale | `src/app/[locale]/layout.tsx` — `NextIntlClientProvider`, `setRequestLocale`, `LocalePreferencesProvider`, `HtmlLangSetter` |
| Preferencias UI | `src/providers/LocalePreferencesProvider.tsx` — `locale`, `currency` (`CLP` \| `USD`) derivada del locale |
| Mensajes | `messages/es-CL.json`, `messages/en-US.json` — namespaces anidados (`finanzas`, `dom`, `common`, `sidebar`, `topbar`, `login`, `landing`) |
| Plugin Next | `next.config.mjs` — `createNextIntlPlugin('./src/i18n/request.ts')` |

## Hubs priorizados (copy)

- **Finanzas:** namespace `finanzas.*` — cubre hub, facturación DTE, movimientos, saldo, sync bancaria, checkout, modal de movimiento, liquidez.
- **DOM:** namespace `dom.*` — hub, spokes (recepción, permisos, regularizaciones, normativa), formulario y reporte normativo.

## Convenciones

- Texto de UI: `useTranslations` / `getTranslations` + claves bajo namespaces; sin strings literales en JSX salvo datos de API o constantes técnicas.
- Fechas y números: `toLocaleString` / `Intl` con `useLocale()` del request.
- Dinero: `formatMoneyAmount(amount, currency, intlLocale)` en `src/app/[locale]/(dashboard)/finanzas/formatMoney.ts`.

## Coherencia GPS

Tras cambios en rutas bajo `src/app/[locale]/` o anclas de este documento, ejecutar `npm run sync:gps` desde la raíz del repo.
