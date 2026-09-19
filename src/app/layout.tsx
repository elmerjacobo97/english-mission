import type { Metadata, Viewport } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import { ProgressProvider } from '@/shared/components/progress-provider';
import { emptyProgress } from '@/shared/lib/progress/progress-mappers';
import { readProgress } from '@/shared/lib/progress/progress-repository.server';
import { getCurrentUser } from '@/shared/lib/supabase/server';
import './globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
});

const fredoka = Fredoka({
  variable: '--font-fredoka',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://english-mission.elmerjacobo.dev'),
  title: {
    default: 'English Mission',
    template: '%s · English Mission',
  },
  description: 'Aprende inglés viviendo una historia por misiones.',
  openGraph: {
    type: 'website',
    siteName: 'English Mission',
    url: '/',
  },
  twitter: {
    card: 'summary',
  },
};

export const viewport: Viewport = {
  themeColor: '#f97316',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();
  const progress = user ? await readProgress(user.id) : emptyProgress;

  return (
    <html lang="es" className={`${nunito.variable} ${fredoka.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ProgressProvider
          initialProgress={progress}
          userId={user?.id ?? ''}
        >
          {children}
        </ProgressProvider>
      </body>
    </html>
  );
}
