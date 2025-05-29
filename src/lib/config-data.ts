
import type { Configuracion, CostoMaderaMetroCubico, PrecioMadera } from '@/types';

const CONFIG_STORAGE_KEY = 'configData';

// Initial default selling prices if nothing in storage
const defaultPreciosMadera: PrecioMadera[] = [
  { tipoMadera: "Pino", precioPorPie: 2.50 },
  { tipoMadera: "Roble", precioPorPie: 5.00 },
  { tipoMadera: "Cedro", precioPorPie: 4.00 },
  { tipoMadera: "Eucalipto", precioPorPie: 3.00 },
];

// Initialize default material costs based on default selling price types
const defaultCostosMadera: CostoMaderaMetroCubico[] = defaultPreciosMadera.map(pm => ({
  tipoMadera: pm.tipoMadera,
  costoPorMetroCubico: 0,
}));

const defaultConfig: Configuracion = {
  nombreAserradero: "Aserradero El Roble",
  logoUrl: "https://placehold.co/150x150.png?text=Logo",
  lemaEmpresa: "Calidad y tradición en maderas desde 1985.",
  preciosMadera: defaultPreciosMadera,
  precioCepilladoPorPie: 0.50,
  precioLitroNafta: 1.5,
  precioAfiladoSierra: 10,
  costosMaderaMetroCubico: defaultCostosMadera,
};

export let initialConfigData: Configuracion = defaultConfig;

// Function to load config from localStorage or use defaults
function loadConfig(): Configuracion {
  if (typeof window !== 'undefined') {
    const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (storedConfig) {
      try {
        return JSON.parse(storedConfig);
      } catch (e) {
        console.error("Error parsing config from localStorage", e);
        // If parsing fails, save default config to localStorage
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(defaultConfig));
        return defaultConfig;
      }
    } else {
      // If no config in localStorage, save default config
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(defaultConfig));
      return defaultConfig;
    }
  }
  return defaultConfig; // Fallback for non-browser environments (SSR)
}

// Initialize configData by loading from localStorage
initialConfigData = loadConfig();

export function updateConfigData(newConfig: Partial<Configuracion>) {
  initialConfigData = {
    ...initialConfigData,
    ...newConfig,
    preciosMadera: newConfig.preciosMadera !== undefined ? newConfig.preciosMadera : initialConfigData.preciosMadera,
    costosMaderaMetroCubico: newConfig.costosMaderaMetroCubico !== undefined ? newConfig.costosMaderaMetroCubico : initialConfigData.costosMaderaMetroCubico,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(initialConfigData));
  }
  console.log("ConfigData updated and saved to localStorage:", initialConfigData);
}
