import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { getAppConfig } from '@/lib/firebase/services/configuracionService';

const inter = Inter({
  subsets: ['latin'],
});

// Generar metadatos dinámicamente
export async function generateMetadata(): Promise<Metadata> {
  // Obtener la configuración de la aplicación desde Firebase
  const config = await getAppConfig();
  
  const metadata: Metadata = {
    title: config.nombreAserradero || 'Administrador de Aserradero',
    description: 'Aplicación para la gestión de aserraderos.',
    manifest: '/manifest.webmanifest',
  };

  // Si existe una URL para el logo en la configuración, usarla para el favicon
  if (config.logoUrl && config.logoUrl.startsWith('data:image')) {
    metadata.icons = {
      icon: config.logoUrl,
      apple: config.logoUrl,
    };
  } else {
    // Fallback a un favicon estático si no hay logo en la config
    metadata.icons = {
      icon: '/favicon.ico',
      apple: '/apple-icon.png',
    };
  }

  return metadata;
}


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
