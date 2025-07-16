
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAppConfig } from '@/lib/firebase/services/configuracionService';
import type { Configuracion } from '@/types';
import { defaultConfig } from '@/lib/config-data';
import { useAuth } from './authContext';

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
  const { user } = useAuth();

  const fetchConfig = React.useCallback(async () => {
    try {
      const appConfig = await getAppConfig();
      setConfig(appConfig);
      
    } catch (error) {
      console.error("ConfigProvider: Could not fetch app config", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user, fetchConfig]);

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
