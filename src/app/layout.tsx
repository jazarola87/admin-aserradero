import type { Metadata, Viewport } from 'next';
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
  icons: {
    icon: '/favicon.ico', // Fallback for older browsers
    apple: '/apple-icon.png', // Future-proofing
  },
};

export const viewport: Viewport = {
  themeColor: '#228B22',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
