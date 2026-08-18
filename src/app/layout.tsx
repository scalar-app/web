import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Scalar', template: '%s · Scalar' },
  description: 'One system for everything demanding your attention.',
  applicationName: 'Scalar',
};

export const viewport: Viewport = {
  themeColor: '#080808',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full">
      <body className="scalar-grain min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
