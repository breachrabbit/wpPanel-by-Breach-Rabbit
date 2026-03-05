import type { Config } from 'tailwindcss';

const config: Config = {
  // ✅ Next.js 16.1 — App Router совместимость
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  // ✅ Tailwind CSS 4 — CSS-first подход
  // Основные темы через CSS переменные в globals.css
  // Здесь только утилиты и кастомные классы
  theme: {
    // ✅ Шрифты (system stack + Google Fonts через next/font)
    fontFamily: {
      sans: [
        'Inter',
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
      mono: [
        'JetBrains Mono',
        'Fira Code',
        'ui-monospace',
        'SFMono-Regular',
        'Consolas',
        'Liberation Mono',
        'Menlo',
        'monospace',
      ],
    },

    // ✅ Цветовая схема wpPanel by Breach Rabbit
    // Примечание: Основные цвета через CSS переменные в globals.css
    // Здесь только fallback значения и дополнительные оттенки
    colors: {
      // Backgrounds
      bg: {
        base: 'var(--color-bg-base, #080808)',
        surface: 'var(--color-bg-surface, #101010)',
        elevated: 'var(--color-bg-elevated, #181818)',
        overlay: 'var(--color-bg-overlay, #202020)',
      },

      // Borders
      border: {
        DEFAULT: 'var(--color-border, rgba(255,255,255,0.07))',
        hover: 'var(--color-border-hover, rgba(255,255,255,0.12))',
        focus: 'var(--color-border-focus, rgba(255,255,255,0.20))',
      },

      // Text
      text: {
        primary: 'var(--color-text-primary, #f0f0f0)',
        secondary: 'var(--color-text-secondary, #888888)',
        muted: 'var(--color-text-muted, #444444)',
        inverse: 'var(--color-text-inverse, #080808)',
      },

      // Accent (Blue)
      accent: {
        DEFAULT: 'var(--color-accent, #3b82f6)',
        hover: 'var(--color-accent-hover, #2563eb)',
        subtle: 'var(--color-accent-subtle, rgba(59,130,246,0.10))',
        border: 'var(--color-accent-border, rgba(59,130,246,0.30))',
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
      },

      // Status colors
      success: {
        DEFAULT: 'var(--color-success, #10b981)',
        subtle: 'var(--color-success-subtle, rgba(16,185,129,0.10))',
        50: '#ecfdf5',
        100: '#d1fae5',
        200: '#a7f3d0',
        300: '#6ee7b7',
        400: '#34d399',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
        800: '#065f46',
        900: '#064e3b',
      },
      warning: {
        DEFAULT: 'var(--color-warning, #f59e0b)',
        subtle: 'var(--color-warning-subtle, rgba(245,158,11,0.10))',
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
      },
      error: {
        DEFAULT: 'var(--color-error, #ef4444)',
        subtle: 'var(--color-error-subtle, rgba(239,68,68,0.10))',
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      info: {
        DEFAULT: 'var(--color-info, #6366f1)',
        subtle: 'var(--color-info-subtle, rgba(99,102,241,0.10))',
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
      },

      // Special
      wordpress: 'var(--color-wordpress, #21759b)',
      terminal: {
        bg: 'var(--color-terminal-bg, #0a0a0a)',
        green: 'var(--color-terminal-green, #00d46a)',
      },

      // Neutral grays (для fallback)
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
        950: '#030712',
      },

      // Transparent
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
    },

    // ✅ Размеры (согласовано с дизайн-системой)
    extend: {
      // Layout dimensions
      sidebar: {
        width: 'var(--sidebar-width, 240px)',
        collapsed: '56px',
      },
      header: {
        height: 'var(--header-height, 56px)',
      },

      // Border radius (согласовано с дизайн-системой)
      radius: {
        sm: 'var(--radius-sm, 6px)',
        md: 'var(--radius-md, 10px)',
        lg: 'var(--radius-lg, 14px)',
        xl: 'var(--radius-xl, 20px)',
        '2xl': '24px',
        '3xl': '32px',
        full: '9999px',
      },

      // Spacing (дополнительные значения)
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },

      // Animation (CSS transitions — без JS overhead)
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-left': 'slideLeft 0.2s ease-out',
        'slide-right': 'slideRight 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-dot': 'pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },

      // Keyframes
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },

      // Transition timing (для плавных hover эффектов)
      transitionTimingFunction: {
        'ease-out-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // Transition duration
      transitionDuration: {
        '50': '50ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },

      // Box shadow (minimal — дизайн без тяжёлых теней)
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        // wpPanel custom — очень лёгкие тени
        'surface': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'elevated': '0 4px 12px 0 rgba(0, 0, 0, 0.05)',
        'glow-accent': '0 0 20px 0 rgba(59, 130, 246, 0.15)',
        'glow-success': '0 0 20px 0 rgba(16, 185, 129, 0.15)',
        'glow-error': '0 0 20px 0 rgba(239, 68, 68, 0.15)',
      },

      // Opacity (для overlay и disabled states)
      opacity: {
        '2.5': '0.025',
        '5': '0.05',
        '7.5': '0.075',
        '12.5': '0.125',
        '15': '0.15',
        '85': '0.85',
        '87.5': '0.875',
        '92.5': '0.925',
        '95': '0.95',
        '97.5': '0.975',
      },

      // Z-index (для модальных окон, dropdown, etc)
      zIndex: {
        '1': '1',
        '5': '5',
        '10': '10',
        '15': '15',
        '20': '20',
        '25': '25',
        '30': '30',
        '40': '40',
        '50': '50',
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        'modal': '1000',
        'dropdown': '1001',
        'toast': '1002',
        'tooltip': '1003',
        'terminal': '1004',
      },

      // Line height (для лучшей читаемости)
      lineHeight: {
        'tighter': '1.1',
        'tight': '1.25',
        'snug': '1.375',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '1.75',
        'code': '1.6', // Для моноширинного текста
      },

      // Letter spacing
      letterSpacing: {
        'tighter': '-0.05em',
        'tight': '-0.025em',
        'normal': '0',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },

      // Screen breakpoints (стандартные + custom)
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        // Для sidebar collapsible
        'sidebar': '1200px',
      },
    },
  },

  // ✅ Plugins (минимальные — только необходимое)
  plugins: [
    // Формы — кастомные стили для input/select/textarea
    function({ addBase, addComponents, theme }: any) {
      // ✅ Базовые стили для формы элементов
      addBase({
        // Reset для форм
        'input, textarea, select': {
          fontFamily: 'inherit',
          fontSize: '100%',
          margin: '0',
        },
      });

      // ✅ Кастомные компоненты (через @apply в CSS предпочтительнее)
      addComponents({
        // Карточка (базовая)
        '.wp-card': {
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          transition: 'border-color 150ms ease',
        },
        '.wp-card:hover': {
          borderColor: 'var(--color-border-hover)',
        },

        // Кнопка primary
        '.wp-btn-primary': {
          backgroundColor: 'var(--color-accent)',
          color: '#ffffff',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontWeight: '500',
          transition: 'all 150ms ease',
        },
        '.wp-btn-primary:hover': {
          backgroundColor: 'var(--color-accent-hover)',
        },
        '.wp-btn-primary:active': {
          transform: 'scale(0.98)',
        },

        // Кнопка ghost
        '.wp-btn-ghost': {
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontWeight: '500',
          transition: 'all 150ms ease',
        },
        '.wp-btn-ghost:hover': {
          backgroundColor: 'var(--color-bg-overlay)',
        },

        // Кнопка danger
        '.wp-btn-danger': {
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontWeight: '500',
          transition: 'all 150ms ease',
        },
        '.wp-btn-danger:hover': {
          backgroundColor: 'var(--color-error-subtle)',
          color: 'var(--color-error)',
        },

        // Input field
        '.wp-input': {
          backgroundColor: 'var(--color-bg-base)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text-primary)',
          padding: '0.5rem 0.75rem',
          fontSize: '0.875rem',
          transition: 'all 150ms ease',
        },
        '.wp-input:focus': {
          outline: 'none',
          borderColor: 'var(--color-accent)',
          boxShadow: '0 0 0 3px var(--color-accent-subtle)',
        },
        '.wp-input::placeholder': {
          color: 'var(--color-text-muted)',
        },

        // Status badge
        '.wp-status-badge': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.25rem 0.625rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontWeight: '500',
        },
        '.wp-status-badge-online': {
          backgroundColor: 'var(--color-success-subtle)',
          color: 'var(--color-success)',
        },
        '.wp-status-badge-offline': {
          backgroundColor: 'var(--color-error-subtle)',
          color: 'var(--color-error)',
        },
        '.wp-status-badge-warning': {
          backgroundColor: 'var(--color-warning-subtle)',
          color: 'var(--color-warning)',
        },

        // Status dot (пульсирующая)
        '.wp-status-dot': {
          width: '0.5rem',
          height: '0.5rem',
          borderRadius: '9999px',
          backgroundColor: 'currentColor',
        },
        '.wp-status-dot-online': {
          animation: 'pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },

        // Sidebar nav item
        '.wp-sidebar-item': {
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.625rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text-secondary)',
          transition: 'all 150ms ease',
        },
        '.wp-sidebar-item:hover': {
          backgroundColor: 'var(--color-bg-overlay)',
          color: 'var(--color-text-primary)',
        },
        '.wp-sidebar-item-active': {
          backgroundColor: 'var(--color-accent-subtle)',
          color: 'var(--color-accent)',
        },

        // Table
        '.wp-table': {
          width: '100%',
          borderCollapse: 'collapse',
        },
        '.wp-table th': {
          backgroundColor: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.75rem 1rem',
          textAlign: 'left',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
        '.wp-table td': {
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
        },
        '.wp-table tr:hover td': {
          backgroundColor: 'var(--color-bg-overlay)',
        },

        // Skeleton loader
        '.wp-skeleton': {
          backgroundColor: 'var(--color-bg-overlay)',
          borderRadius: 'var(--radius-sm)',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },

        // Scrollbar (кастомный, тонкий)
        '.wp-scrollbar': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border) transparent',
        },
        '.wp-scrollbar::-webkit-scrollbar': {
          width: '6px',
          height: '6px',
        },
        '.wp-scrollbar::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '.wp-scrollbar::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--color-border)',
          borderRadius: '3px',
        },
        '.wp-scrollbar::-webkit-scrollbar-thumb:hover': {
          backgroundColor: 'var(--color-border-hover)',
        },
      });
    },
  ],

  // ✅ Dark mode — через data attribute (не class)
  // Позволяет работать с system preference + ручным переключением
  darkMode: ['selector', '[data-theme="dark"]'],

  // ✅ Safe list (для динамических классов которые не детектятся)
  safelist: [
    // Status colors
    { pattern: /bg-(success|warning|error|info)-(subtle|50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(success|warning|error|info)-(DEFAULT|500|600|700)/ },
    // Spacing
    { pattern: /w-(full|screen|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|96)/ },
    { pattern: /h-(full|screen|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|96)/ },
    // Z-index
    { pattern: /z-(0|10|20|30|40|50|auto)/ },
    // Opacity
    { pattern: /opacity-(0|25|50|75|100)/ },
    // Theme specific
    'data-theme-dark',
    'data-theme-light',
    'data-theme-system',
  ],

  // ✅ Future flags (для совместимости)
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
    disableColorOpacityUtilitiesByDefault: false,
  },

  // ✅ Experimental (Tailwind 4 features)
  experimental: {
    optimizeUniversalDefaults: true,
  },
};

export default config;