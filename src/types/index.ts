
export interface Compra {
  id: string;
  fecha: string; // Consider using Date object or ISO string
  tipoMadera: string;
  volumen: number; // e.g., in m^3
  precioPorMetroCubico?: number; // NUEVO CAMPO
  costo: number; // Este será el total: volumen * precioPorMetroCubico
  proveedor: string;
  telefonoProveedor?: string;
}

export interface VentaDetalle {
  id: string;
  tipoMadera?: string;
  unidades?: number;
  ancho?: number; // pulgadas
  alto?: number; // pulgadas (espesor)
  largo?: number; // metros
  precioPorPie?: number;
  cepillado?: boolean;
  piesTablares?: number;
  subTotal?: number;
  valorUnitario?: number;
}

export interface Venta {
  id: string;
  fecha: string;
  nombreComprador: string;
  telefonoComprador?: string;
  detalles: VentaDetalle[];
  totalVenta?: number;
  idOriginalPresupuesto?: string;
  fechaEntregaEstimada?: string;
  sena?: number;
  costoOperario?: number;
}

export interface PresupuestoDetalle {
  id: string;
  tipoMadera: string;
  unidades: number;
  ancho: number; // pulgadas
  alto: number; // pulgadas (espesor)
  largo: number; // metros
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


export interface PrecioMadera {
  tipoMadera: string;
  precioPorPie: number;
}

export interface CostoMaderaMetroCubico {
  tipoMadera: string;
  costoPorMetroCubico: number;
}

export interface Configuracion {
  nombreAserradero: string;
  logoUrl?: string;
  lemaEmpresa?: string;
  preciosMadera: PrecioMadera[];
  precioCepilladoPorPie: number;
  precioLitroNafta?: number;
  precioAfiladoSierra?: number;
  costosMaderaMetroCubico?: CostoMaderaMetroCubico[];
}
