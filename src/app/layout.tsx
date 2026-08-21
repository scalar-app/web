import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Titlebar } from '@/components/shell/Titlebar';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Scalar', template: '%s · Scalar' },
  description: 'One system for everything demanding your attention.',
  applicationName: 'Scalar',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#080808',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full">
      <body className="scalar-grain flex min-h-full flex-col">
        {/* Window chrome belongs to the window, so it sits above every route rather than inside
            the authenticated shell. It draws nothing in a browser. */}
        <Titlebar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
