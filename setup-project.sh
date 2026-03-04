#!/bin/bash

# =============================================================================
# wpPanel by Breach Rabbit — Project Setup Script
# Версия: 1.0.0
# Next.js 16.1 + Node.js 20.x LTS
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="wppanel-by-breach-rabbit"
PROJECT_DIR="${PROJECT_NAME}"
GITHUB_REPO="https://github.com/breachrabbit/wpPanel-by-Breach-Rabbit"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}=============================================================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}=============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}→${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to create file with content
create_file() {
    local filepath="$1"
    local content="$2"
    
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$filepath")"
    
    # Write content to file
    echo "$content" > "$filepath"
    print_success "Created: $filepath"
}

# =============================================================================
# Check Requirements
# =============================================================================

check_requirements() {
    print_header "Проверка требований"
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 20 ]; then
            print_success "Node.js $(node -v) установлен"
        else
            print_error "Требуется Node.js 20.x или выше (у вас $(node -v))"
            exit 1
        fi
    else
        print_error "Node.js не найден. Установите Node.js 20.x LTS"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        print_success "npm $(npm -v) установлен"
    else
        print_error "npm не найден"
        exit 1
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        print_success "git установлен"
    else
        print_warning "git не найден (рекомендуется для работы с репозиторием)"
    fi
}

# =============================================================================
# Create Project Structure
# =============================================================================

create_directory_structure() {
    print_header "Создание структуры проекта"
    
    cd "$(pwd)"
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    # App directories
    mkdir -p app/\(auth\)/login
    mkdir -p app/\(setup\)/setup
    mkdir -p app/\(dashboard\)/sites/\[id\]/{files,logs,stats}
    mkdir -p app/\(dashboard\)/databases
    mkdir -p app/\(dashboard\)/files
    mkdir -p app/\(dashboard\)/backups
    mkdir -p app/\(dashboard\)/firewall
    mkdir -p app/\(dashboard\)/cron
    mkdir -p app/\(dashboard\)/monitoring
    mkdir -p app/\(dashboard\)/logs
    mkdir -p app/\(dashboard\)/terminal
    mkdir -p app/\(dashboard\)/wordpress
    mkdir -p app/\(dashboard\)/ssl
    mkdir -p app/\(dashboard\)/settings
    mkdir -p app/api/{auth,installer,sites,ols,ssl,databases,files,backups,firewall,cron,monitoring,logs,terminal,wordpress,system}
    
    # Components
    mkdir -p components/{ui,layout,providers,dashboard,sites,file-manager,database-manager,terminal,backups,monitoring,wordpress,installer}
    
    # Libraries
    mkdir -p lib/{services,integrations,socket}
    
    # Other directories
    mkdir -p stores
    mkdir -p hooks
    mkdir -p types
    mkdir -p prisma/migrations
    mkdir -p scripts
    mkdir -p public/{images,fonts}
    mkdir -p docs
    
    print_success "Структура директорий создана"
}

# =============================================================================
# Configuration Files
# =============================================================================

create_package_json() {
    print_step "Создание package.json"
    
    cat > package.json << 'EOF'
{
  "name": "wppanel-by-breach-rabbit",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "16.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "lucide-react": "0.468.0",
    "zustand": "5.0.2",
    "@tanstack/react-query": "5.62.7",
    "next-intl": "3.26.3",
    "recharts": "2.14.1",
    "framer-motion": "11.15.0",
    "@radix-ui/react-dialog": "1.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "@radix-ui/react-tooltip": "1.1.6",
    "@radix-ui/react-select": "2.1.4",
    "@radix-ui/react-switch": "1.1.2",
    "@radix-ui/react-checkbox": "1.1.3",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "tailwind-merge": "2.6.0",
    "date-fns": "4.1.0",
    "zod": "3.24.1",
    "react-hook-form": "7.54.2",
    "socket.io-client": "4.8.1",
    "@monaco-editor/react": "4.6.0",
    "xterm": "5.5.0",
    "xterm-addon-fit": "0.8.0"
  },
  "devDependencies": {
    "@types/node": "22.10.2",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "typescript": "5.7.2",
    "@tailwindcss/postcss": "4.0.0",
    "postcss": "8.4.49",
    "prisma": "6.1.0",
    "@prisma/client": "6.1.0",
    "eslint": "9.17.0",
    "eslint-config-next": "16.1.0",
    "@types/socket.io-client": "3.0.0"
  },
  "engines": {
    "node": ">=20.9.0"
  }
}
EOF
    
    print_success "package.json создан"
}

create_next_config() {
    print_step "Создание next.config.ts"
    
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      rules: {
        '*.svg': {
          as: '*.react',
        },
      },
    },
  },
  images: {
    remotePatterns: [],
  },
  transpilePackages: ['lucide-react', 'recharts'],
};

export default withNextIntl(nextConfig);
EOF
    
    print_success "next.config.ts создан"
}

create_tsconfig() {
    print_step "Создание tsconfig.json"
    
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/stores/*": ["./stores/*"],
      "@/types/*": ["./types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
    
    print_success "tsconfig.json создан"
}

create_tailwind_config() {
    print_step "Создание tailwind.config.ts"
    
    cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          overlay: 'var(--color-bg-overlay)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          hover: 'var(--color-border-hover)',
          focus: 'var(--color-border-focus)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
          border: 'var(--color-accent-border)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          subtle: 'var(--color-success-subtle)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          subtle: 'var(--color-warning-subtle)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          subtle: 'var(--color-error-subtle)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          subtle: 'var(--color-info-subtle)',
        },
        wordpress: 'var(--color-wordpress)',
        terminal: {
          green: 'var(--color-terminal-green)',
          bg: 'var(--color-terminal-bg)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed-width)',
        header: 'var(--header-height)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      animation: {
        pulse: 'pulse 2s infinite',
        'skeleton-loading': 'skeleton-loading 1.5s infinite',
        'toast-in': 'toast-in 0.3s ease',
      },
    },
  },
  plugins: [],
};

export default config;
EOF
    
    print_success "tailwind.config.ts создан"
}

create_globals_css() {
    print_step "Создание app/globals.css"
    
    cat > app/globals.css << 'EOF'
@import 'tailwindcss';

@theme {
  /* Backgrounds - Dark Theme (Default) */
  --color-bg-base: #080808;
  --color-bg-surface: #101010;
  --color-bg-elevated: #181818;
  --color-bg-overlay: #202020;
  
  /* Borders */
  --color-border: rgba(255, 255, 255, 0.07);
  --color-border-hover: rgba(255, 255, 255, 0.12);
  --color-border-focus: rgba(255, 255, 255, 0.20);
  
  /* Text */
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #888888;
  --color-text-muted: #444444;
  --color-text-inverse: #080808;
  
  /* Accent - Blue */
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-accent-subtle: rgba(59, 130, 246, 0.10);
  --color-accent-border: rgba(59, 130, 246, 0.30);
  
  /* Status Colors */
  --color-success: #10b981;
  --color-success-subtle: rgba(16, 185, 129, 0.10);
  --color-warning: #f59e0b;
  --color-warning-subtle: rgba(245, 158, 11, 0.10);
  --color-error: #ef4444;
  --color-error-subtle: rgba(239, 68, 68, 0.10);
  --color-info: #6366f1;
  --color-info-subtle: rgba(99, 102, 241, 0.10);
  
  /* Special */
  --color-wordpress: #21759b;
  --color-terminal-green: #00d46a;
  --color-terminal-bg: #0a0a0a;
  
  /* Sizing */
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 56px;
  --header-height: 56px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
}

/* Light Theme Overrides */
[data-theme="light"] {
  --color-bg-base: #f8f8f8;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #f0f0f0;
  --color-bg-overlay: #e8e8e8;
  --color-border: rgba(0, 0, 0, 0.08);
  --color-border-hover: rgba(0, 0, 0, 0.15);
  --color-text-primary: #111111;
  --color-text-secondary: #555555;
  --color-text-muted: #999999;
  --color-accent-subtle: rgba(59, 130, 246, 0.08);
}

/* System preference */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --color-bg-base: #f8f8f8;
    --color-bg-surface: #ffffff;
    --color-bg-elevated: #f0f0f0;
    --color-bg-overlay: #e8e8e8;
    --color-border: rgba(0, 0, 0, 0.08);
    --color-border-hover: rgba(0, 0, 0, 0.15);
    --color-text-primary: #111111;
    --color-text-secondary: #555555;
    --color-text-muted: #999999;
    --color-accent-subtle: rgba(59, 130, 246, 0.08);
  }
}

/* Reset & Base */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-inter);
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  line-height: 1.5;
  transition: background-color var(--transition-normal), color var(--transition-normal);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-surface);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

/* Animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Utility Classes */
.skeleton {
  background: linear-gradient(90deg, var(--color-bg-surface) 25%, var(--color-bg-overlay) 50%, var(--color-bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: var(--radius-sm);
}

.status-dot.pulsing {
  animation: pulse 2s infinite;
}
EOF
    
    print_success "app/globals.css создан"
}

create_env_example() {
    print_step "Создание .env.example"
    
    cat > .env.example << 'EOF'
# App
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-random-64-char-secret-here
INSTALLER_TOKEN=one-time-setup-token-delete-after-install

# Database
DATABASE_URL=postgresql://panel:password@localhost:5432/wppanel

# Redis
REDIS_URL=redis://localhost:6379

# OpenLiteSpeed
OLS_API_URL=http://localhost:7080
OLS_API_USER=admin
OLS_API_PASS=your-ols-admin-password

# Server
SERVER_ROOT=/var/www
BACKUP_ROOT=/var/backups/panel

# SSL
ACME_EMAIL=admin@example.com

# Notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password

TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
EOF
    
    print_success ".env.example создан"
}

create_gitignore() {
    print_step "Создание .gitignore"
    
    cat > .gitignore << 'EOF'
# Dependencies
node_modules
.pnp
.pnp.js

# Build
.next
out
build

# Testing
coverage

# Production
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Prisma
prisma/*.db
prisma/*.db-journal

# IDE
.idea
.vscode
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Uploads
uploads/*
!uploads/.gitkeep

# Backups
backups/*
!backups/.gitkeep
EOF
    
    print_success ".gitignore создан"
}

# =============================================================================
# Core Files
# =============================================================================

create_root_layout() {
    print_step "Создание app/layout.tsx"
    
    cat > app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastContainer } from '@/components/ui/toast';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'wpPanel by Breach Rabbit — Панель управления сервером',
  description: 'Современная панель управления хостингом с фокусом на WordPress',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            {children}
            <ToastContainer />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
EOF
    
    print_success "app/layout.tsx создан"
}

create_utils() {
    print_step "Создание lib/utils.ts"
    
    cat > lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
    case 'active':
    case 'success':
      return 'text-success bg-success-subtle';
    case 'warning':
    case 'expiring':
      return 'text-warning bg-warning-subtle';
    case 'error':
    case 'offline':
    case 'expired':
      return 'text-error bg-error-subtle';
    default:
      return 'text-info bg-info-subtle';
  }
}
EOF
    
    print_success "lib/utils.ts создан"
}

create_theme_store() {
    print_step "Создание stores/theme-store.ts"
    
    cat > stores/theme-store.ts << 'EOF'
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: (theme: Theme) => {
        const root = document.documentElement;
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          root.setAttribute('data-theme', systemTheme);
          set({ theme, resolvedTheme: systemTheme });
        } else {
          root.setAttribute('data-theme', theme);
          set({ theme, resolvedTheme: theme });
        }
        
        localStorage.setItem('wppanel-theme', theme);
      },
    }),
    {
      name: 'wppanel-theme-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

// Initialize theme on mount
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('wppanel-theme') as Theme | null;
  const theme = savedTheme || 'dark';
  const root = document.documentElement;
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.setAttribute('data-theme', systemTheme);
  } else {
    root.setAttribute('data-theme', theme);
  }
}
EOF
    
    print_success "stores/theme-store.ts создан"
}

# =============================================================================
# UI Components
# =============================================================================

create_ui_components() {
    print_header "Создание UI компонентов"
    
    # Button component
    cat > components/ui/button.tsx << 'EOF'
'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent-hover',
        secondary: 'bg-bg-overlay text-text-primary border border-border hover:border-border-hover hover:bg-bg-elevated',
        ghost: 'bg-transparent text-text-secondary hover:bg-bg-overlay hover:text-text-primary',
        danger: 'bg-transparent text-text-secondary hover:bg-error-subtle hover:text-error',
        outline: 'bg-transparent border border-border text-text-primary hover:bg-bg-overlay',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
EOF
    
    # Card component
    cat > components/ui/card.tsx << 'EOF'
'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-md bg-bg-surface border border-border transition-colors duration-fast hover:border-border-hover',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between mb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-sm font-semibold text-text-secondary uppercase tracking-wide',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
EOF
    
    # Status Badge component
    cat > components/ui/status-badge.tsx << 'EOF'
'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  label: string;
  pulsing?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, pulsing = false, className }: StatusBadgeProps) {
  const variants = {
    success: 'text-success bg-success-subtle',
    warning: 'text-warning bg-warning-subtle',
    error: 'text-error bg-error-subtle',
    info: 'text-info bg-info-subtle',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        variants[status],
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full bg-current',
          pulsing && 'status-dot pulsing'
        )}
      />
      {label}
    </span>
  );
}
EOF
    
    # Progress Bar component
    cat > components/ui/progress-bar.tsx << 'EOF'
'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'success' | 'warning' | 'error' | 'info';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'info',
  showLabel = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const variants = {
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-accent',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-text-secondary mb-1">
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 bg-bg-overlay rounded-sm overflow-hidden">
        <div
          className={cn(
            'h-full rounded-sm transition-all duration-normal',
            variants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
EOF
    
    # Metric Card component
    cat > components/ui/metric-card.tsx << 'EOF'
'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { ProgressBar } from './progress-bar';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  delta?: {
    value: string;
    positive: boolean;
  };
  progress?: {
    value: number;
    variant?: 'success' | 'warning' | 'error' | 'info';
  };
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  delta,
  progress,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">{label}</span>
          <div className="w-9 h-9 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
            {icon}
          </div>
        </div>
        
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        
        {delta && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              delta.positive ? 'text-success' : 'text-error'
            )}
          >
            {delta.positive ? '↓' : '↑'}
            <span>{delta.value}</span>
          </div>
        )}
        
        {progress && (
          <ProgressBar
            value={progress.value}
            variant={progress.variant}
            showLabel={false}
            className="mt-1"
          />
        )}
      </div>
    </Card>
  );
}
EOF
    
    # Toast component
    cat > components/ui/toast.tsx << 'EOF'
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let toastListeners: ((toast: Toast) => void)[] = [];

export function useToast() {
  const addToast = (type: ToastType, message: string) => {
    const toast: Toast = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
    };
    toastListeners.forEach((listener) => listener(toast));
  };

  return { addToast };
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };

    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle size={18} className="text-success" />,
    error: <AlertCircle size={18} className="text-error" />,
    warning: <AlertTriangle size={18} className="text-warning" />,
    info: <Info size={18} className="text-info" />,
  };

  return createPortal(
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-1000">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 rounded-md bg-bg-elevated border border-border shadow-lg min-w-[300px] animate-toast-in',
            toast.type === 'success' && 'border-l-[3px] border-l-success',
            toast.type === 'error' && 'border-l-[3px] border-l-error',
            toast.type === 'warning' && 'border-l-[3px] border-l-warning',
            toast.type === 'info' && 'border-l-[3px] border-l-info'
          )}
        >
          {icons[toast.type]}
          <span className="text-sm text-text-primary flex-1">{toast.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
EOF
    
    print_success "UI компоненты созданы"
}

# =============================================================================
# Layout Components
# =============================================================================

create_layout_components() {
    print_header "Создание Layout компонентов"
    
    # Sidebar component
    cat > components/layout/sidebar.tsx << 'EOF'
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Globe, Folder, Database, Shield, Lock, HardDrive,
  Terminal, Activity, FileText, Clock, Wordpress, Settings, HelpCircle,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Основное',
    items: [
      { href: '/dashboard', label: 'Дашборд', icon: <LayoutDashboard size={20} /> },
      { href: '/dashboard/sites', label: 'Сайты', icon: <Globe size={20} />, badge: '3' },
      { href: '/dashboard/files', label: 'Файлы', icon: <Folder size={20} /> },
      { href: '/dashboard/databases', label: 'Базы данных', icon: <Database size={20} /> },
    ],
  },
  {
    title: 'Безопасность',
    items: [
      { href: '/dashboard/ssl', label: 'SSL', icon: <Shield size={20} /> },
      { href: '/dashboard/firewall', label: 'Firewall', icon: <Lock size={20} /> },
      { href: '/dashboard/backups', label: 'Бэкапы', icon: <HardDrive size={20} /> },
    ],
  },
  {
    title: 'Инструменты',
    items: [
      { href: '/dashboard/terminal', label: 'Терминал', icon: <Terminal size={20} /> },
      { href: '/dashboard/monitoring', label: 'Мониторинг', icon: <Activity size={20} /> },
      { href: '/dashboard/logs', label: 'Логи', icon: <FileText size={20} /> },
      { href: '/dashboard/cron', label: 'Cron', icon: <Clock size={20} /> },
    ],
  },
  {
    title: 'WordPress',
    items: [
      { href: '/dashboard/wordpress', label: 'WP Toolkit', icon: <Wordpress size={20} />, badge: '2' },
    ],
  },
  {
    title: 'Система',
    items: [
      { href: '/dashboard/settings', label: 'Настройки', icon: <Settings size={20} /> },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full bg-bg-base border-r border-border z-100 transition-all duration-normal',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      <div className="h-header flex items-center px-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
              <path d="M8 12h16M8 16h16M8 20h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={cn(
            'font-bold text-lg text-text-primary whitespace-nowrap transition-opacity duration-normal',
            collapsed && 'opacity-0 w-0'
          )}>
            wpPanel
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            <div className={cn(
              'text-xs font-semibold uppercase tracking-wide text-text-muted px-3 mb-2 transition-opacity duration-normal',
              collapsed && 'opacity-0 h-0 m-0 p-0'
            )}>
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-text-secondary transition-all duration-fast mb-0.5 overflow-hidden whitespace-nowrap',
                    'hover:bg-bg-overlay hover:text-text-primary',
                    isActive && 'bg-accent-subtle text-accent',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className={cn(
                    'text-sm font-medium transition-opacity duration-normal',
                    collapsed && 'opacity-0 w-0'
                  )}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className={cn(
                      'ml-auto text-xs font-semibold px-1.5 py-0.5 rounded bg-accent-subtle text-accent transition-opacity duration-normal',
                      collapsed && 'opacity-0 w-0'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <Link
          href="/docs"
          target="_blank"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-text-secondary transition-all duration-fast overflow-hidden whitespace-nowrap',
            'hover:bg-bg-overlay hover:text-text-primary',
            collapsed && 'justify-center px-2'
          )}
        >
          <HelpCircle size={20} className="flex-shrink-0" />
          <span className={cn(
            'text-sm font-medium transition-opacity duration-normal',
            collapsed && 'opacity-0 w-0'
          )}>
            Документация
          </span>
        </Link>
      </div>
    </aside>
  );
}
EOF
    
    # Header component
    cat > components/layout/header.tsx << 'EOF'
'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/theme-store';
import { Menu, Bell, Search, Sun, Moon, Monitor, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onSidebarToggle: () => void;
  pageTitle?: string;
}

export function Header({ onSidebarToggle, pageTitle = 'Дашборд' }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useThemeStore();

  const themeIcons = {
    dark: <Moon size={16} />,
    light: <Sun size={16} />,
    system: <Monitor size={16} />,
  };

  const themeLabels = {
    dark: 'Тёмная',
    light: 'Светлая',
    system: 'Система',
  };

  const cycleTheme = () => {
    const themes: ('dark' | 'light' | 'system')[] = ['dark', 'light', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <header className="h-header bg-bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="border border-border"
        >
          <Menu size={20} />
        </Button>
        <h1 className="text-lg font-semibold text-text-primary">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={cycleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-overlay border border-border text-text-secondary text-sm hover:border-border-hover hover:text-text-primary transition-all duration-fast"
        >
          {themeIcons[resolvedTheme]}
          <span>{themeLabels[theme]}</span>
        </button>

        <Button variant="ghost" size="icon" className="border border-border relative">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-error text-white text-xs flex items-center justify-center">
            3
          </span>
        </Button>

        <Button variant="ghost" size="icon" className="border border-border">
          <Search size={18} />
        </Button>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-bg-overlay border border-border cursor-pointer hover:border-border-hover transition-all duration-fast">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-info flex items-center justify-center font-semibold text-xs text-white">
            A
          </div>
          <span className="text-sm font-medium text-text-primary">Admin</span>
          <ChevronDown size={16} className="text-text-secondary" />
        </div>
      </div>
    </header>
  );
}
EOF
    
    # AppShell component
    cat > components/layout/app-shell.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Sidebar collapsed={sidebarCollapsed} />
      
      <main
        className={cn(
          'transition-all duration-normal',
          sidebarCollapsed ? 'ml-sidebar-collapsed' : 'ml-sidebar'
        )}
      >
        <Header onSidebarToggle={toggleSidebar} pageTitle={pageTitle} />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
EOF
    
    print_success "Layout компоненты созданы"
}

# =============================================================================
# Provider Components
# =============================================================================

create_providers() {
    print_header "Создание Provider компонентов"
    
    # Theme Provider
    cat > components/providers/theme-provider.tsx << 'EOF'
'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme, resolvedTheme } = useThemeStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {children}
    </div>
  );
}
EOF
    
    # Query Provider
    cat > components/providers/query-provider.tsx << 'EOF'
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
EOF
    
    print_success "Provider компоненты созданы"
}

# =============================================================================
# Dashboard Page
# =============================================================================

create_dashboard_page() {
    print_header "Создание Dashboard страницы"
    
    cat > 'app/(dashboard)/page.tsx' << 'EOF'
'use client';

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  Cpu, MemoryStick, HardDrive, Network, Wordpress, Globe,
  MoreHorizontal, RefreshCw, Plus, Check, ShieldCheck, AlertTriangle, Clock,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppShell pageTitle="Дашборд">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">Обзор сервера</h2>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm">
            <RefreshCw size={16} />
            Обновить
          </Button>
          <Button size="sm">
            <Plus size={16} />
            Новый сайт
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <MetricCard
          label="CPU"
          value="24%"
          icon={<Cpu size={18} />}
          delta={{ value: '-5% за час', positive: true }}
          progress={{ value: 24, variant: 'success' }}
        />
        <MetricCard
          label="RAM"
          value="4.2 GB"
          icon={<MemoryStick size={18} />}
          delta={{ value: '+12% за час', positive: false }}
          progress={{ value: 52, variant: 'warning' }}
        />
        <MetricCard
          label="Диск"
          value="68 GB"
          icon={<HardDrive size={18} />}
          delta={{ value: 'из 100 GB', positive: true }}
          progress={{ value: 68, variant: 'info' }}
        />
        <MetricCard
          label="Сеть"
          value="1.2 TB"
          icon={<Network size={18} />}
          delta={{ value: 'за месяц', positive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card className="p-5">
          <CardHeader>
            <CardTitle>Сайты</CardTitle>
            <Button variant="ghost" size="icon">
              <MoreHorizontal size={16} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-md bg-wordpress flex items-center justify-center text-white flex-shrink-0">
                  <Wordpress size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text-primary truncate">example.com</div>
                  <div className="text-sm text-text-secondary truncate">https://example.com</div>
                </div>
                <StatusBadge status="success" label="Online" pulsing />
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg font-semibold text-text-primary">12.5K</div>
                  <div className="text-xs text-text-muted">Запросов/день</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-text-primary">145ms</div>
                  <div className="text-xs text-text-muted">Время ответа</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-text-primary">99.9%</div>
                  <div className="text-xs text-text-muted">Uptime</div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 rounded-md bg-bg-elevated flex items-center justify-center text-text-secondary flex-shrink-0">
                  <Globe size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text-primary truncate">shop.example.com</div>
                  <div className="text-sm text-text-secondary truncate">https://shop.example.com</div>
                </div>
                <StatusBadge status="success" label="Online" pulsing />
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg font-semibold text-text-primary">8.2K</div>
                  <div className="text-xs text-text-muted">Запросов/день</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-text-primary">189ms</div>
                  <div className="text-xs text-text-muted">Время ответа</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-text-primary">99.8%</div>
                  <div className="text-xs text-text-muted">Uptime</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader>
            <CardTitle>SSL Сертификаты</CardTitle>
            <Button variant="ghost" size="icon">
              <MoreHorizontal size={16} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md bg-bg-overlay">
                <div>
                  <div className="font-medium text-text-primary">example.com</div>
                  <div className="text-xs text-text-secondary">Истекает 15 Мар 2026</div>
                </div>
                <StatusBadge status="success" label="Активен" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-bg-overlay">
                <div>
                  <div className="font-medium text-text-primary">shop.example.com</div>
                  <div className="text-xs text-text-secondary">Истекает 28 Фев 2026</div>
                </div>
                <StatusBadge status="warning" label="Истекает" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-bg-overlay">
                <div>
                  <div className="font-medium text-text-primary">api.example.com</div>
                  <div className="text-xs text-text-secondary">Истекает 10 Апр 2026</div>
                </div>
                <StatusBadge status="success" label="Активен" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <CardHeader>
            <CardTitle>Трафик (7 дней)</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-accent">День</Button>
              <Button variant="ghost" size="sm">Неделя</Button>
              <Button variant="ghost" size="sm">Месяц</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-around gap-2">
              {[40, 65, 45, 80, 55, 70, 60].map((height, i) => (
                <div
                  key={i}
                  className="w-8 bg-gradient-to-t from-accent to-accent-hover rounded-t-md transition-all duration-normal hover:opacity-80"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader>
            <CardTitle>Активность</CardTitle>
            <Button variant="ghost" size="icon">
              <Clock size={16} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-success-subtle flex items-center justify-center flex-shrink-0">
                  <Check size={16} className="text-success" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Бэкап завершён</div>
                  <div className="text-xs text-text-secondary">example.com — 2 минуты назад</div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-info-subtle flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={16} className="text-info" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">SSL обновлён</div>
                  <div className="text-xs text-text-secondary">api.example.com — 15 минут назад</div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-warning-subtle flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={16} className="text-warning" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Предупреждение SSL</div>
                  <div className="text-xs text-text-secondary">shop.example.com истекает через 7 дней</div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0">
                  <Plus size={16} className="text-accent" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Сайт создан</div>
                  <div className="text-xs text-text-secondary">blog.example.com — 1 час назад</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
EOF
    
    print_success "Dashboard страница создана"
}

# =============================================================================
# Prisma Schema
# =============================================================================

create_prisma_schema() {
    print_header "Создание Prisma схемы"
    
    cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String?
  role          String    @default("admin")
  twoFactorSecret String?
  twoFactorEnabled Boolean @default(false)
  backupCodes   String[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  
  sessions      Session[]
  auditLogs     AuditLog[]
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token        String   @unique
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}

model Site {
  id            String   @id @default(cuid())
  name          String
  domain        String   @unique
  path          String
  type          String   // wordpress, static, php, node, docker
  status        String   @default("stopped")
  phpVersion    String?
  autoRestart   Boolean  @default(false)
  
  ssl           SSL[]
  databases     Database[]
  backups       Backup[]
  wordpress     WordPressInstance?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model SSL {
  id            String   @id @default(cuid())
  siteId        String
  site          Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  domain        String
  type          String   // auto, custom
  issuer        String?
  validFrom     DateTime?
  validTo       DateTime?
  certificate   String?
  privateKey    String?
  chain         String?
  status        String   @default("pending")
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Database {
  id            String   @id @default(cuid())
  siteId        String?
  site          Site?    @relation(fields: [siteId], references: [id])
  
  name          String   @unique
  user          String
  password      String
  type          String   @default("mariadb")
  size          BigInt?
  
  createdAt     DateTime @default(now())
}

model Backup {
  id            String   @id @default(cuid())
  siteId        String
  site          Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  type          String   // full, incremental
  status        String   @default("pending")
  size          BigInt?
  storage       String   // local, s3, sftp, b2
  resticSnapshotId String?
  
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  
  resticSnapshots ResticSnapshot[]
}

model ResticSnapshot {
  id            String   @id @default(cuid())
  snapshotId    String   @unique
  backupId      String?
  backup        Backup?  @relation(fields: [backupId], references: [id])
  
  hostname      String
  paths         String[]
  tags          String[]
  sizeBytes     BigInt?
  snapshotTime  DateTime
  
  createdAt     DateTime @default(now())
}

model WordPressInstance {
  id            String   @id @default(cuid())
  siteId        String   @unique
  site          Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  version       String
  adminUser     String
  adminEmail    String
  language      String   @default("en_US")
  
  autoUpdateCore    Boolean @default(true)
  autoUpdatePlugins Boolean @default(false)
  autoUpdateThemes  Boolean @default(false)
  
  lastScanAt    DateTime?
  securityScore Int?
  
  plugins       WPPlugin[]
  themes        WPTheme[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model WPPlugin {
  id          String            @id @default(cuid())
  wpId        String
  wp          WordPressInstance @relation(fields: [wpId], references: [id], onDelete: Cascade)
  
  slug        String
  name        String
  version     String
  latestVersion String?
  status      String
  
  updatedAt   DateTime @updatedAt
}

model WPTheme {
  id          String            @id @default(cuid())
  wpId        String
  wp          WordPressInstance @relation(fields: [wpId], references: [id], onDelete: Cascade)
  
  slug        String
  name        String
  version     String
  latestVersion String?
  isActive    Boolean @default(false)
  
  updatedAt   DateTime @updatedAt
}

model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  
  action      String
  entity      String?
  entityId    String?
  ipAddress   String?
  details     Json?
  
  createdAt   DateTime @default(now())
}

model InstallerSession {
  id            String   @id @default(cuid())
  token         String   @unique
  completed     Boolean  @default(false)
  config        Json?
  createdAt     DateTime @default(now())
  completedAt   DateTime?
}

model CronJob {
  id          String   @id @default(cuid())
  name        String
  schedule    String
  command     String
  user        String   @default("root")
  enabled     Boolean  @default(true)
  siteId      String?
  
  lastRunAt   DateTime?
  nextRunAt   DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model FirewallRule {
  id          String   @id @default(cuid())
  action      String   // allow, deny
  protocol    String   // tcp, udp, both
  port        String?
  portRange   String?
  ip          String?
  cidr        String?
  enabled     Boolean  @default(true)
  description String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
EOF
    
    print_success "Prisma схема создана"
}

# =============================================================================
# README & Documentation
# =============================================================================

create_readme() {
    print_header "Создание README.md"
    
    cat > README.md << 'EOF'
# wpPanel by Breach Rabbit 🐰

Современная панель управления хостингом с фокусом на WordPress, построенная на OpenLiteSpeed.

## 🚀 Особенности

- **WordPress-first** — WP Toolkit из коробки с авто-установкой плагинов
- **Браузерный инсталлятор** — красивая установка с live-терминалом
- **Терминал в браузере** — xterm.js + node-pty
- **Бэкапы Restic** — в стиле Zerobyte с GUI
- **Современный UI** — собственная тема, никаких устаревших интерфейсов
- **OpenLiteSpeed** — полная интеграция через REST API

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.1, React 19, TypeScript 5.3, Tailwind CSS 4
- **Backend**: Next.js API Routes, Prisma, Zod
- **Database**: PostgreSQL 16, Redis 7
- **Server**: OpenLiteSpeed, MariaDB, PHP 8.2-8.5

## 📦 Быстрый старт

```bash
# Требования: Node.js 20.9.0+
node --version

# Клонировать репозиторий
git clone https://github.com/breachrabbit/wpPanel-by-Breach-Rabbit.git
cd wpPanel-by-Breach-Rabbit

# Установить зависимости
npm install

# Запустить PostgreSQL и Redis
docker-compose up -d postgres redis

# Настроить окружение
cp .env.example .env
# Отредактировать .env

# Запустить миграции
npx prisma migrate dev
npx prisma generate

# Запустить dev сервер
npm run dev