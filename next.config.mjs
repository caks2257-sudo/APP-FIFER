import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

function normalizeFiferApiBase(raw) {
  let t = (raw ?? '').trim().replace(/\/+$/, '');
  t = t.replace(/\/api\/v1\/core$/i, '').replace(/\/+$/, '');
  return t;
}

/**
 * Origen del core FastAPI en Cloud Run (NEXT_PUBLIC_* para build y runtime del front).
 * Rutas del servicio: /api/v1/core/* (ver saas-fifer/ecosystem/core-service).
 * /api/python/* → mismo destino (útil si prefieres mismo origen y evitas CORS en el navegador).
 */
const pythonApiBase = normalizeFiferApiBase(process.env.NEXT_PUBLIC_FIFER_API_BASE ?? '');
const pythonCorePrefix = '/api/v1/core';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Imagen Docker / Cloud Run: genera `.next/standalone` + trace estáticos. */
  output: 'standalone',

  poweredByHeader: false,

  /**
   * El build de producción no ejecuta ESLint (evita fallos por reglas en CI si el lint va aparte).
   * Mantén calidad con `npm run lint` en pipeline. Forzar lint en build: NEXT_STRICT_BUILD=1.
   */
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_STRICT_BUILD !== '1',
  },

  /**
   * Por defecto los errores de TypeScript bloquean el build.
   * Solo en emergencias de despliegue: NEXT_IGNORE_TYPE_ERRORS=1 (no recomendado).
   */
  typescript: {
    ignoreBuildErrors: process.env.NEXT_IGNORE_TYPE_ERRORS === '1',
  },

  /**
   * Proxy: /api/python/<ruta> → ${NEXT_PUBLIC_FIFER_API_BASE}/api/v1/core/<ruta>
   * Sin variable, no se registra rewrite (desarrollo local sin backend).
   */
  async rewrites() {
    if (!pythonApiBase) {
      return [];
    }
    return [
      {
        source: '/api/python/:path*',
        destination: `${pythonApiBase}${pythonCorePrefix}/:path*`,
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
        os: false,
      };
    }
    // Suppress webpack cache serialization warnings for large strings (i18n files)
    config.infrastructureLogging = {
      level: 'error',
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
