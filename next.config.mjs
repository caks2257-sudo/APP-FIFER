import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Base del core FastAPI en Cloud Run (sin barra final).
 * Ej.: https://core-service-xxxxx-uc.a.run.app/api/v1/core
 * Las peticiones del browser a /api/python/* se proxifican desde Next (mismo origen → sin CORS).
 */
const pythonApiBase = process.env.FIFER_PYTHON_API_BASE?.replace(/\/$/, '') ?? '';

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
   * Proxy servidor: /api/python/health → ${FIFER_PYTHON_API_BASE}/health
   * Sin variable, no se registra rewrite (desarrollo local sin backend).
   */
  async rewrites() {
    if (!pythonApiBase) {
      return [];
    }
    return [
      {
        source: '/api/python/:path*',
        destination: `${pythonApiBase}/:path*`,
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
    return config;
  },
};

export default withNextIntl(nextConfig);
