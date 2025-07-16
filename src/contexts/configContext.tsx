
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAppConfig } from '@/lib/firebase/services/configuracionService';
import type { Configuracion } from '@/types';
import { Loader2 } from 'lucide-react';
import { defaultConfig } from '@/lib/config-data';

interface ConfigContextType {
  config: Configuracion;
  loading: boolean;
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig, // Use the imported default config as initial value
  loading: true,
});

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<Configuracion>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const appConfig = await getAppConfig();
        setConfig(appConfig);
        
        // Dynamically update favicon if a logo URL is available
        const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
        if (favicon && appConfig.logoUrl && appConfig.logoUrl.startsWith('data:image')) {
          favicon.href = appConfig.logoUrl;
        }
      } catch (error) {
        console.error("ConfigProvider: Could not fetch app config", error);
        // Fallback to default config is already handled by initialState
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <ConfigContext.Provider value={{ config, loading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
