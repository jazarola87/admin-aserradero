export interface Compra {
  id: string;
  fecha: string; 
  tipoMadera: string;
  volumen: number; // en m^3
  precioPorMetroCubico?: number; 
  costo: number; 
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
  unidadesDeStock?: number;
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
  costoMaderaVentaSnapshot?: number; // Costo de madera calculado al momento de la venta/última edición
  costoAserrioVentaSnapshot?: number; // Costo de aserrío calculado al momento de la venta/última edición
  entregado?: boolean;
  notas?: string;
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

export interface StockMaderaAserrada {
  id: string;
  fecha: string;
  detalles: VentaDetalle[];
  totalPiesTablares: number;
  costoAserrioSnapshot: number;
  notas?: string;
  idVentaConsumo?: string;
  nombreClienteConsumo?: string;
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
  enlaceWhatsApp?: string;
  telefonoEmpresa?: string;
  lemaEmpresa?: string;
  preciosMadera: PrecioMadera[];
  precioCepilladoPorPie: number;
  precioLitroNafta?: number;
  precioAfiladoSierra?: number;
  costosMaderaMetroCubico?: CostoMaderaMetroCubico[];
}
