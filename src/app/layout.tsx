import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Administrador de Aserradero',
  description: 'Aplicación para la gestión de aserraderos.',
  // The icon link is now handled directly in the head below to ensure it has a stable ID
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
       <head>
        {/* This link provides a default favicon and an ID for our script to target */}
        <link id="favicon" rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
