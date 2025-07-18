
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
  const { user, loading: authLoading } = useAuth(); // Depend on auth context
  const [config, setConfig] = useState<Configuracion>(defaultConfig);
  const [loading, setLoading] = useState(true);

  const fetchConfig = React.useCallback(async () => {
    if (!user) { // Don't fetch if no user
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const appConfig = await getAppConfig();
      setConfig(appConfig);
      
    } catch (error) {
      console.error("ConfigProvider: Could not fetch app config", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Fetch config only when authentication is resolved and there is a user
    if (!authLoading) {
      fetchConfig();
    }
  }, [authLoading, fetchConfig]);

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
