import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { getAppConfig } from '@/lib/firebase/services/configuracionService';

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getAppConfig();
  const faviconUrl = config.logoUrl && config.logoUrl.startsWith('data:image') ? config.logoUrl : '/favicon.ico'; // Fallback needed

  return (
    <html lang="es">
      <head>
        {faviconUrl && <link rel="icon" href={faviconUrl} sizes="any" />}
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
