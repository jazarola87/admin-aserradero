import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Administrador de Aserradero',
  description: 'Aplicación para la gestión de aserraderos.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
       <head>
        <meta name="theme-color" content="#228B22" />
        <link rel="icon" href="/favicon.ico" sizes="any" id="favicon" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
