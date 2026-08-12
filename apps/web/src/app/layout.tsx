import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { THEME_BOOT_SCRIPT } from '@/lib/theme';

import './globals.css';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'WikiConn — race through Wikipedia',
    template: '%s · WikiConn',
  },
  description:
    'A multiplayer browser game: race from one Wikipedia article to another using nothing but the links inside them.',
  applicationName: 'WikiConn',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fa' },
    { media: '(prefers-color-scheme: dark)', color: '#101418' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Runs before the first paint so the stored theme is never flashed away. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
