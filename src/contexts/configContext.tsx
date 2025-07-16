
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAppConfig } from '@/lib/firebase/services/configuracionService';
import type { Configuracion } from '@/types';
import { defaultConfig } from '@/lib/config-data';

interface ConfigContextType {
  config: Configuracion;
  loading: boolean;
  refetchConfig: () => void;
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  loading: true,
  refetchConfig: () => {},
});

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<Configuracion>(defaultConfig);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    // No set loading to true here to avoid re-showing loader on refetch
    try {
      const appConfig = await getAppConfig();
      setConfig(appConfig);
      
      const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
      if (favicon && appConfig.logoUrl && appConfig.logoUrl.startsWith('data:image')) {
        favicon.href = appConfig.logoUrl;
      }
    } catch (error) {
      console.error("ConfigProvider: Could not fetch app config", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, refetchConfig: fetchConfig }}>
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
