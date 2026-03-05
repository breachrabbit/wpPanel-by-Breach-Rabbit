import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ✅ Next.js 16.1 — Turbopack is default, no need for experimental.turbo
  // reactCompiler disabled until babel-plugin-react-compiler is installed

  // ✅ Production оптимизации
  productionBrowserSourceMaps: false, // Не выкладывать source maps
  poweredByHeader: false, // Скрыть X-Powered-By: Next.js
  generateEtags: false, // Отключить etags для безопасности

  // ✅ Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // 'unsafe-eval' нужен для Monaco/xterm
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' ws: wss:", // WebSocket для терминала и логов
              "frame-ancestors 'none'", // Запрет embedding
            ].join('; '),
          },
        ],
      },
      // ✅ Отдельные правила для инсталлятора (разрешить eval для терминала)
      {
        source: '/setup/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' ws: wss:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // ✅ Rewrites для API (если нужно)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },

  // ✅ Redirects (setup блокировка после установки)
  async redirects() {
    return [
      {
        source: '/setup',
        destination: '/dashboard',
        permanent: false, // Проверяется middleware'ом
      },
    ];
  },

  // ✅ Webpack конфигурация (для production build)
  webpack: (config, { isServer, dev }) => {
    // ❌ Не сплитить чанки в dev для скорости
    if (dev) {
      config.optimization.splitChunks = false;
    }

    // ✅ Lazy load для тяжёлых библиотек
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push('monaco-editor');
      config.externals.push('xterm');
      config.externals.push('xterm-addon-fit');
      config.externals.push('xterm-addon-web-links');
    }

    return config;
  },

  // ✅ Transpile packages (если нужно)
  transpilePackages: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],

  // ✅ Images оптимизация
  images: {
    remotePatterns: [], // Только локальные изображения
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },

  // ✅ Logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // ✅ Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Удалить console.log в prod
  },

  // ✅ Output standalone (для Docker)
  output: 'standalone',

  // ✅ Compression
  compress: true,

  // ✅ React Strict Mode (в dev)
  reactStrictMode: true,
};

export default nextConfig;