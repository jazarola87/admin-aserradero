import type { Configuracion, CostoMaderaMetroCubico, PrecioMadera } from '@/types';

// Default selling prices to be used ONLY when creating the config document for the first time.
const defaultPreciosMadera: PrecioMadera[] = [
  { tipoMadera: "Pino", precioPorPie: 2.50 },
  { tipoMadera: "Roble", precioPorPie: 5.00 },
  { tipoMadera: "Cedro", precioPorPie: 4.00 },
  { tipoMadera: "Eucalipto", precioPorPie: 3.00 },
];

// Default material costs to be used ONLY when creating the config document for the first time.
const defaultCostosMadera: CostoMaderaMetroCubico[] = defaultPreciosMadera.map(pm => ({
  tipoMadera: pm.tipoMadera,
  costoPorMetroCubico: 120.00,
}));

/**
 * The default configuration for the application.
 * This is used as a fallback and to seed the database on the first run.
 * This is NOT the live application configuration.
 */
export const defaultConfig: Configuracion = {
  nombreAserradero: "Aserradero El Roble",
  logoUrl: "",
  qrCodeUrl: "",
  telefonoEmpresa: "",
  lemaEmpresa: "Calidad y tradición en maderas desde 1980.",
  preciosMadera: defaultPreciosMadera,
  precioCepilladoPorPie: 0.65,
  precioLitroNafta: 1.75,
  precioAfiladoSierra: 12.00,
  costosMaderaMetroCubico: defaultCostosMadera,
};
