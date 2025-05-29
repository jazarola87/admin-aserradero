
import type { Configuracion, CostoMaderaMetroCubico, PrecioMadera } from '@/types';

// Initial selling prices
const initialPreciosMadera: PrecioMadera[] = [
  { tipoMadera: "Pino", precioPorPie: 2.50 },
  { tipoMadera: "Roble", precioPorPie: 5.00 },
  { tipoMadera: "Cedro", precioPorPie: 4.00 },
  { tipoMadera: "Eucalipto", precioPorPie: 3.00 },
];

// Initialize material costs based on selling price types
const initialCostosMadera: CostoMaderaMetroCubico[] = initialPreciosMadera.map(pm => ({
  tipoMadera: pm.tipoMadera,
  costoPorMetroCubico: 0, // Default to 0, user will set this
}));


export let initialConfigData: Configuracion = {
  nombreAserradero: "Aserradero El Roble",
  logoUrl: "https://placehold.co/150x150.png?text=Logo",
  lemaEmpresa: "Calidad y tradición en maderas desde 1985.",
  preciosMadera: initialPreciosMadera,
  precioCepilladoPorPie: 0.50,
  // Operational Costs
  precioLitroNafta: 1.5, // Example value
  precioAfiladoSierra: 10, // Example value
  costosMaderaMetroCubico: initialCostosMadera,
};

export function updateConfigData(newConfig: Partial<Configuracion>) {
  initialConfigData = {
    ...initialConfigData,
    ...newConfig,
    // Ensure arrays are completely replaced if provided, not merged deeply
    preciosMadera: newConfig.preciosMadera !== undefined ? newConfig.preciosMadera : initialConfigData.preciosMadera,
    costosMaderaMetroCubico: newConfig.costosMaderaMetroCubico !== undefined ? newConfig.costosMaderaMetroCubico : initialConfigData.costosMaderaMetroCubico,
  };
  console.log("ConfigData updated:", initialConfigData);
}
