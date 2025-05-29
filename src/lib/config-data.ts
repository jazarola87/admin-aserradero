
import type { Configuracion } from '@/types';

// Mock initial config data that can be imported by multiple pages
export const initialConfigData: Configuracion = {
  nombreAserradero: "Aserradero El Roble",
  logoUrl: "https://placehold.co/150x150.png?text=Logo",
  preciosMadera: [
    { tipoMadera: "Pino", precioPorPie: 2.50 },
    { tipoMadera: "Roble", precioPorPie: 5.00 },
    { tipoMadera: "Cedro", precioPorPie: 4.00 },
    { tipoMadera: "Eucalipto", precioPorPie: 3.00 },
  ],
  precioCepilladoPorPie: 0.50,
};
