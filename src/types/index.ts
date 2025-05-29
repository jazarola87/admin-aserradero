export interface Compra {
  id: string;
  fecha: string; // Consider using Date object or ISO string
  tipoMadera: string;
  volumen: number; // e.g., in board feet or m^3
  costo: number;
  proveedor: string;
  telefonoProveedor?: string;
}

export interface VentaDetalle {
  id: string;
  tipoMadera: string;
  unidades: number;
  ancho: number; // pulgadas
  alto: number; // pulgadas (espesor)
  largo: number; // pies
  precioPorPie: number;
  cepillado: boolean;
  piesTablares?: number; // auto-calculado
  subTotal?: number; // auto-calculado
}

export interface Venta {
  id: string;
  fecha: string; // Consider using Date object or ISO string
  nombreComprador: string;
  telefonoComprador?: string;
  detalles: VentaDetalle[];
  totalVenta?: number; // sum of subTotals
}

export interface PrecioMadera {
  tipoMadera: string;
  precioPorPie: number;
}

export interface Configuracion {
  nombreAserradero: string;
  logoUrl?: string;
  preciosMadera: PrecioMadera[];
  precioCepilladoPorPie: number;
}
