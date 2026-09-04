import type { Metadata } from 'next';
import './globals.css';
import './brand.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FlowBoard | Collaborative Kanban Board',
  description: 'A calm, collaborative Kanban workspace for teams.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/flowboard-logo.png',
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('flowboard_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
