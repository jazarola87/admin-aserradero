"use client";

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-muted text-muted-foreground">
      <WifiOff className="h-24 w-24" />
      <h1 className="mt-4 text-4xl font-bold">Sin Conexión</h1>
      <p className="mt-2">Parece que no tienes conexión a internet.</p>
      <p>Esta página se está mostrando desde la memoria caché de la aplicación.</p>
    </div>
  );
}
