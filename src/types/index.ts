
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
  id: string; // Could be uuid or similar for actual items
  tipoMadera: string;
  unidades: number;
  ancho: number; // pulgadas
  alto: number; // pulgadas (espesor)
  largo: number; // pies
  precioPorPie: number;
  cepillado: boolean;
  piesTablares?: number; // auto-calculado
  subTotal?: number; // auto-calculado
  valorUnitario?: number; // auto-calculado
}

export interface Venta {
  id: string;
  fecha: string; // Consider using Date object or ISO string
  nombreComprador: string;
  telefonoComprador?: string;
  detalles: VentaDetalle[];
  totalVenta?: number; // sum of subTotals
  idOriginalPresupuesto?: string; // To track if it came from a budget
  fechaEntregaEstimada?: string; // Nueva: Fecha estimada de entrega (YYYY-MM-DD)
  sena?: number; // Nueva: Monto de la seña
}

export interface PresupuestoDetalle {
  id: string;
  tipoMadera: string;
  unidades: number;
  ancho: number;
  alto: number;
  largo: number;
  precioPorPie: number;
  cepillado: boolean;
  piesTablares?: number;
  subTotal?: number;
  valorUnitario?: number;
}

export interface Presupuesto {
  id: string;
  fecha: string;
  nombreCliente: string;
  telefonoCliente?: string;
  detalles: PresupuestoDetalle[];
  totalPresupuesto?: number;
}


export interface PrecioMadera { // Selling price per board foot
  tipoMadera: string;
  precioPorPie: number;
}

export interface CostoMaderaMetroCubico { // Cost price per cubic meter
  tipoMadera: string; // Should match a tipoMadera from PrecioMadera
  costoPorMetroCubico: number;
}

export interface Configuracion {
  nombreAserradero: string;
  logoUrl?: string; // Can be a URL or a Data URI
  lemaEmpresa?: string;
  preciosMadera: PrecioMadera[]; // Selling prices per board foot
  precioCepilladoPorPie: number;

  // New fields for operational costs
  precioLitroNafta?: number;
  precioAfiladoSierra?: number;
  costosMaderaMetroCubico?: CostoMaderaMetroCubico[];
}
