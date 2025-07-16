import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
// We remove getAppConfig from here as it causes build errors.
// Configuration will now be loaded client-side in AppShell.

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata can still be defined statically or be a function
export const metadata: Metadata = {
  title: 'Administrador de Aserradero',
  description: 'Aplicación para la gestión de aserraderos.',
  icons: {
    icon: '/favicon.ico', // Use a static favicon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
