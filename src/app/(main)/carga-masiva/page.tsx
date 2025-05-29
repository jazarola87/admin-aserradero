
"use client";

import React, { useState } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, UploadCloud, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initialConfigData } from "@/lib/config-data";
import * as XLSX from 'xlsx';
import type { Compra, Venta, VentaDetalle, Configuracion } from "@/types";
import { format, isValid, parseISO } from "date-fns";

const COMPRAS_STORAGE_KEY = 'comprasList';
const VENTAS_STORAGE_KEY = 'ventasList';

// Helper to calculate board feet for a single sale item
const calcularPiesTablaresVentaItem = (detalle: Partial<VentaDetalle>): number => {
    const unidades = Number(detalle?.unidades) || 0;
    const alto = Number(detalle?.alto) || 0;
    const ancho = Number(detalle?.ancho) || 0;
    const largo = Number(detalle?.largo) || 0;

    if (!unidades || !alto || !ancho || !largo) return 0;
    return unidades * alto * ancho * largo * 0.2734;
};

const calcularSubtotalVentaItem = (
    detalle: Partial<VentaDetalle>,
    piesTablares: number,
    precioCepilladoConfigValue: number
  ): number => {
    const precioPorPie = Number(detalle?.precioPorPie) || 0;
    const cepillado = detalle?.cepillado || false;
    if (piesTablares === 0) return 0;
    let subtotal = piesTablares * precioPorPie;
    if (cepillado) {
      subtotal += piesTablares * precioCepilladoConfigValue;
    }
    return subtotal;
  };

// Helper function to calculate total wood cost for a sale, used as fallback
const calcularCostoMaderaTotalParaVenta = (detalles: VentaDetalle[], config: Configuracion): number => {
  let costoTotal = 0;
  (detalles || []).forEach(detalle => {
    if (!detalle.tipoMadera || !detalle.piesTablares) return; // Ensure piesTablares is calculated
    const costoMaderaConfig = (config.costosMaderaMetroCubico || []).find(c => c.tipoMadera === detalle.tipoMadera);
    const costoPorMetroCubicoDelTipo = Number(costoMaderaConfig?.costoPorMetroCubico) || 0;
    costoTotal += (detalle.piesTablares / 200) * costoPorMetroCubicoDelTipo;
  });
  return costoTotal;
};

// Helper function to calculate total sawmill cost for a sale, used as fallback
const calcularCostoAserrioTotalParaVenta = (detalles: VentaDetalle[], config: Configuracion): number => {
  const precioNafta = Number(config.precioLitroNafta) || 0;
  const precioAfilado = Number(config.precioAfiladoSierra) || 0;

  const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
  const costoOperativoAjustado = costoOperativoBase * 1.38;
  // Asegurarse de que el costoAserrioPorPie no sea Infinity si costoOperativoAjustado es 0 y se divide por 0 (aunque 600 no es 0)
  // O si costoOperativoAjustado es muy pequeño y da un valor muy pequeño.
  const costoAserrioPorPie = (costoOperativoAjustado > 0 && isFinite(costoOperativoAjustado) && costoOperativoAjustado !== 0) ? costoOperativoAjustado / 600 : 0;


  const totalPiesTablaresVenta = (detalles || []).reduce((acc, detalle) => {
    return acc + (detalle.piesTablares || 0);
  }, 0);

  return totalPiesTablaresVenta * costoAserrioPorPie;
};


export default function CargaMasivaPage() {
  const { toast } = useToast();
  const [comprasFile, setComprasFile] = useState<File | null>(null);
  const [ventasFile, setVentasFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'compras' | 'ventas') => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === 'compras') {
        setComprasFile(file);
      } else {
        setVentasFile(file);
      }
    }
  };

  const handleProformaDownload = (type: 'compras' | 'ventas') => {
    const validTimberTypes = initialConfigData.preciosMadera.map(pm => pm.tipoMadera);
    let data: any[][] = [];
    let filename = "";

    if (type === 'compras') {
      const headers = [
        "Fecha (YYYY-MM-DD)",
        "Tipo de Madera",
        "Volumen (m³)",
        "Precio por Metro Cúbico ($)",
        "Proveedor",
        "Telefono Proveedor (Opcional)"
      ];
      const exampleRow = ['2024-01-15', 'Pino', 12.5, 180.00, 'Aserradero El Progreso', '1122334455'];

      data.push(headers);
      data.push(exampleRow);
      data.push([]); 
      data.push(["Tipos de Madera Válidos (Usar estos nombres exactos para la columna 'Tipo de Madera'):"]);
      validTimberTypes.forEach(timber => {
        data.push([timber]);
      });
      filename = "proforma_compras.xlsx";
    } else if (type === 'ventas') {
      const headers = [
        "ID Venta (Agrupar filas con mismo ID para una sola venta)",
        "Fecha (YYYY-MM-DD)",
        "Nombre Comprador",
        "Telefono Comprador (Opcional)",
        "Fecha Entrega Estimada (YYYY-MM-DD, Opcional)",
        "Seña ($) (Opcional, ingresar una vez por ID Venta)",
        "Costo Operario ($) (Opcional, ingresar una vez por ID Venta)",
        "Tipo Madera (Artículo)",
        "Unidades (Artículo)",
        "Ancho (pulg, Artículo)",
        "Alto (pulg, Artículo)",
        "Largo (m, Artículo)",
        "Precio Por Pie ($) (Artículo)",
        "Cepillado (Si/No, Artículo)",
        "Costo Madera Estimado ($) (Artículo, Informativo)",
        "Costo Aserrío Estimado ($) (Artículo, Informativo)"
      ];
      const exampleRow1 = [
        'VENTA001', '2024-02-10', 'Ana Torres', '555-9876', '2024-02-20', 50.00, 25.00,
        'Roble', 20, 6, 2, 3.05, 5.50, 'Si',
        150.25, 30.70 
      ];
      const exampleRow2 = [
        'VENTA001', '2024-02-10', 'Ana Torres', '555-9876', '2024-02-20', "", "", 
        'Pino', 30, 4, 1, 2.44, 2.75, 'No',
        80.50, 15.30 
      ];
      data.push(headers);
      data.push(exampleRow1);
      data.push(exampleRow2);
      data.push([]); 
      data.push(["Tipos de Madera Válidos (Usar estos nombres exactos para la columna 'Tipo Madera (Artículo)'):"]);
      validTimberTypes.forEach(timber => {
        data.push([timber]);
      });
      filename = "proforma_ventas.xlsx";
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proforma");
    XLSX.writeFile(wb, filename);

    toast({
      title: "Descarga Iniciada",
      description: `Se está descargando la proforma para ${type} (${filename}).`,
    });
  };

  const handleUpload = async (type: 'compras' | 'ventas') => {
    const file = type === 'compras' ? comprasFile : ventasFile;
    if (!file) {
      toast({ title: "Error", description: "Por favor, seleccione un archivo para cargar.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    let processedCount = 0;
    let errorCount = 0;
    const errorRows: { row: number; message: string; data: any }[] = [];
    let jsonData: any[] = [];


    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result;
          if (!arrayBuffer) {
            throw new Error("No se pudo leer el archivo.");
          }
          const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          if (type === 'compras') {
            const validTimberTypes = initialConfigData.preciosMadera.map(pm => pm.tipoMadera);
            const nuevasCompras: Compra[] = [];

            jsonData.forEach((row, index) => {
              if (!row["Fecha (YYYY-MM-DD)"] || !row["Proveedor"]) {
                return;
              }

              try {
                const fechaRaw = row["Fecha (YYYY-MM-DD)"];
                let fechaCompra: string;
                if (fechaRaw instanceof Date && isValid(fechaRaw)) {
                    fechaCompra = format(fechaRaw, "yyyy-MM-dd");
                } else if (typeof fechaRaw === 'string' && isValid(parseISO(fechaRaw))) {
                    fechaCompra = format(parseISO(fechaRaw), "yyyy-MM-dd");
                } else if (typeof fechaRaw === 'number') {
                    const d = XLSX.SSF.parse_date_code(fechaRaw);
                    if (d) fechaCompra = format(new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S), "yyyy-MM-dd");
                    else throw new Error("Formato de fecha inválido.");
                } else {
                    throw new Error("Formato de fecha inválido.");
                }

                const tipoMadera = String(row["Tipo de Madera"] || "").trim();
                if (!validTimberTypes.includes(tipoMadera)) {
                  throw new Error(`Tipo de madera '${tipoMadera}' no es válido.`);
                }
                const volumen = parseFloat(String(row["Volumen (m³)"] || "0"));
                const precioPorMetroCubico = parseFloat(String(row["Precio por Metro Cúbico ($)"] || "0"));
                if (isNaN(volumen) || volumen <= 0) throw new Error("Volumen inválido.");
                if (isNaN(precioPorMetroCubico) || precioPorMetroCubico <= 0) throw new Error("Precio por m³ inválido.");

                const proveedor = String(row["Proveedor"] || "").trim();
                if (!proveedor) throw new Error("Proveedor es requerido.");

                const nuevaCompra: Compra = {
                  id: `compra-bulk-${Date.now()}-${index}`,
                  fecha: fechaCompra,
                  tipoMadera,
                  volumen,
                  precioPorMetroCubico,
                  costo: volumen * precioPorMetroCubico,
                  proveedor,
                  telefonoProveedor: String(row["Telefono Proveedor (Opcional)"] || "").trim() || undefined,
                };
                nuevasCompras.push(nuevaCompra);
                processedCount++;
              } catch (e: any) {
                errorCount++;
                errorRows.push({ row: index + 2, message: e.message || "Error desconocido", data: row });
              }
            });

            if (nuevasCompras.length > 0) {
              const storedCompras = localStorage.getItem(COMPRAS_STORAGE_KEY);
              let comprasActuales: Compra[] = storedCompras ? JSON.parse(storedCompras) : [];
              comprasActuales.push(...nuevasCompras);
              comprasActuales.sort((a, b) => b.fecha.localeCompare(a.fecha));
              localStorage.setItem(COMPRAS_STORAGE_KEY, JSON.stringify(comprasActuales));
            }

          } else if (type === 'ventas') {
            const validTimberTypes = initialConfigData.preciosMadera.map(pm => pm.tipoMadera);
            const ventasAgrupadas: { [key: string]: any[] } = {};
            jsonData.forEach((row, index) => {
                const idVenta = String(row["ID Venta (Agrupar filas con mismo ID para una sola venta)"] || "").trim();
                if (!idVenta) {
                    return;
                }
                if (!ventasAgrupadas[idVenta]) {
                    ventasAgrupadas[idVenta] = [];
                }
                ventasAgrupadas[idVenta].push({ ...row, originalRowIndex: index + 2 });
            });

            const nuevasVentas: Venta[] = [];
            for (const idVenta in ventasAgrupadas) {
                const group = ventasAgrupadas[idVenta];
                const firstRow = group[0];
                try {
                    const fechaRaw = firstRow["Fecha (YYYY-MM-DD)"];
                    let fechaVenta: string;
                    if (fechaRaw instanceof Date && isValid(fechaRaw)) {
                        fechaVenta = format(fechaRaw, "yyyy-MM-dd");
                    } else if (typeof fechaRaw === 'string' && isValid(parseISO(fechaRaw))) {
                        fechaVenta = format(parseISO(fechaRaw), "yyyy-MM-dd");
                    } else if (typeof fechaRaw === 'number') {
                        const d = XLSX.SSF.parse_date_code(fechaRaw);
                        if (d) fechaVenta = format(new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S), "yyyy-MM-dd");
                        else throw new Error("Formato de fecha de venta inválido.");
                    } else {
                        throw new Error("Formato de fecha de venta inválido.");
                    }

                    let fechaEntregaEstimada: string | undefined = undefined;
                    const fechaEntregaRaw = firstRow["Fecha Entrega Estimada (YYYY-MM-DD, Opcional)"];
                    if (fechaEntregaRaw) {
                        if (fechaEntregaRaw instanceof Date && isValid(fechaEntregaRaw)) {
                            fechaEntregaEstimada = format(fechaEntregaRaw, "yyyy-MM-dd");
                        } else if (typeof fechaEntregaRaw === 'string' && isValid(parseISO(fechaEntregaRaw))) {
                            fechaEntregaEstimada = format(parseISO(fechaEntregaRaw), "yyyy-MM-dd");
                        } else if (typeof fechaEntregaRaw === 'number') {
                            const d = XLSX.SSF.parse_date_code(fechaEntregaRaw);
                            if (d) fechaEntregaEstimada = format(new Date(d.y, d.m-1,d.d,d.H,d.M,d.S), "yyyy-MM-dd");
                        }
                    }

                    const nombreComprador = String(firstRow["Nombre Comprador"] || "").trim();
                    if (!nombreComprador) throw new Error ("Nombre del comprador es requerido.");

                    const senaStr = String(firstRow["Seña ($) (Opcional, ingresar una vez por ID Venta)"] || "0");
                    const sena = senaStr ? parseFloat(senaStr) : undefined;

                    const costoOperarioStr = String(firstRow["Costo Operario ($) (Opcional, ingresar una vez por ID Venta)"] || "0");
                    const costoOperario = costoOperarioStr ? parseFloat(costoOperarioStr) : undefined;

                    let acumuladoCostoMaderaExcel = 0;
                    let acumuladoCostoAserrioExcel = 0;
                    let seEncontroCostoMaderaEnExcel = false;
                    let seEncontroCostoAserrioEnExcel = false;

                    const detallesVenta: VentaDetalle[] = group.map((itemRow, itemIndex) => {
                        const tipoMaderaItem = String(itemRow["Tipo Madera (Artículo)"] || "").trim();
                        if(!tipoMaderaItem) throw new Error(`Fila ${itemRow.originalRowIndex}: Tipo de madera del artículo es requerido.`);
                        if (!validTimberTypes.includes(tipoMaderaItem)) {
                          throw new Error(`Fila ${itemRow.originalRowIndex}: Tipo de madera '${tipoMaderaItem}' no es válido.`);
                        }
                        const unidades = parseInt(String(itemRow["Unidades (Artículo)"] || "0"), 10);
                        const ancho = parseFloat(String(itemRow["Ancho (pulg, Artículo)"] || "0"));
                        const alto = parseFloat(String(itemRow["Alto (pulg, Artículo)"] || "0"));
                        const largo = parseFloat(String(itemRow["Largo (m, Artículo)"] || "0"));
                        const precioPorPie = parseFloat(String(itemRow["Precio Por Pie ($) (Artículo)"] || "0"));
                        const cepilladoStr = String(itemRow["Cepillado (Si/No, Artículo)"] || "No").trim().toLowerCase();

                        if (isNaN(unidades) || unidades <=0) throw new Error(`Fila ${itemRow.originalRowIndex}: Unidades inválidas.`);
                        if (isNaN(ancho) || ancho <=0) throw new Error(`Fila ${itemRow.originalRowIndex}: Ancho inválido.`);
                        if (isNaN(alto) || alto <=0) throw new Error(`Fila ${itemRow.originalRowIndex}: Alto inválido.`);
                        if (isNaN(largo) || largo <=0) throw new Error(`Fila ${itemRow.originalRowIndex}: Largo inválido.`);
                        if (isNaN(precioPorPie) || precioPorPie <0) throw new Error(`Fila ${itemRow.originalRowIndex}: Precio por pie inválido.`);
                        if (!['si', 'no'].includes(cepilladoStr)) throw new Error(`Fila ${itemRow.originalRowIndex}: Valor de Cepillado debe ser 'Si' o 'No'.`);

                        const cepillado = cepilladoStr === 'si';
                        const piesTablares = calcularPiesTablaresVentaItem({ unidades, ancho, alto, largo });
                        const subTotal = calcularSubtotalVentaItem({ precioPorPie, cepillado }, piesTablares, initialConfigData.precioCepilladoPorPie);

                        const costoMaderaItemExcelStr = String(itemRow["Costo Madera Estimado ($) (Artículo, Informativo)"] || "").trim();
                        const costoMaderaItemExcel = parseFloat(costoMaderaItemExcelStr);
                        if (!isNaN(costoMaderaItemExcel) && costoMaderaItemExcel >= 0) {
                            acumuladoCostoMaderaExcel += costoMaderaItemExcel;
                            seEncontroCostoMaderaEnExcel = true;
                        }

                        const costoAserrioItemExcelStr = String(itemRow["Costo Aserrío Estimado ($) (Artículo, Informativo)"] || "").trim();
                        const costoAserrioItemExcel = parseFloat(costoAserrioItemExcelStr);
                        if (!isNaN(costoAserrioItemExcel) && costoAserrioItemExcel >= 0) {
                            acumuladoCostoAserrioExcel += costoAserrioItemExcel;
                            seEncontroCostoAserrioEnExcel = true;
                        }

                        return {
                            id: `vd-bulk-${Date.now()}-${itemIndex}-${Math.random().toString(36).substring(2,7)}`,
                            tipoMadera: tipoMaderaItem,
                            unidades, ancho, alto, largo, precioPorPie, cepillado,
                            piesTablares,
                            subTotal,
                            valorUnitario: unidades > 0 ? subTotal / unidades : 0,
                        };
                    });
                    
                    const configActual = initialConfigData;
                    const costoMaderaSnapshot = seEncontroCostoMaderaEnExcel
                        ? acumuladoCostoMaderaExcel
                        : calcularCostoMaderaTotalParaVenta(detallesVenta, configActual);

                    const costoAserrioSnapshot = seEncontroCostoAserrioEnExcel
                        ? acumuladoCostoAserrioExcel
                        : calcularCostoAserrioTotalParaVenta(detallesVenta, configActual);

                    const nuevaVenta: Venta = {
                        id: `venta-bulk-${Date.now()}-${idVenta}`,
                        fecha: fechaVenta,
                        nombreComprador,
                        telefonoComprador: String(firstRow["Telefono Comprador (Opcional)"] || "").trim() || undefined,
                        fechaEntregaEstimada,
                        sena: (sena !== undefined && !isNaN(sena)) ? sena : undefined,
                        costoOperario: (costoOperario !== undefined && !isNaN(costoOperario)) ? costoOperario : undefined,
                        detalles: detallesVenta,
                        totalVenta: detallesVenta.reduce((sum, d) => sum + (d.subTotal || 0), 0),
                        costoMaderaVentaSnapshot: costoMaderaSnapshot,
                        costoAserrioVentaSnapshot: costoAserrioSnapshot,
                    };
                    nuevasVentas.push(nuevaVenta);
                    processedCount++;
                } catch (e: any) {
                    errorCount++;
                    errorRows.push({ row: firstRow.originalRowIndex, message: `Error procesando Venta ID ${idVenta}: ${e.message || "Error desconocido"}`, data: firstRow });
                }
            }
             if (nuevasVentas.length > 0) {
              const storedVentas = localStorage.getItem(VENTAS_STORAGE_KEY);
              let ventasActuales: Venta[] = storedVentas ? JSON.parse(storedVentas) : [];
              ventasActuales.push(...nuevasVentas);
              ventasActuales.sort((a, b) => b.fecha.localeCompare(a.fecha));
              localStorage.setItem(VENTAS_STORAGE_KEY, JSON.stringify(ventasActuales));
            }
          }

          toast({
            title: "Proceso de Carga Finalizado",
            description: `${processedCount} registro(s) procesado(s) exitosamente. ${errorCount} registro(s) con errores.`,
            variant: errorCount > 0 ? "destructive" : "default",
            duration: errorCount > 0 ? 10000 : 5000,
          });

          if (errorCount > 0) {
            console.error("Errores durante la carga masiva:", errorRows);
            toast({
                title: "Detalle de Errores",
                description: "Algunos registros no pudieron ser procesados. Revise la consola del navegador (F12) para más detalles.",
                variant: "destructive",
                duration: 10000,
            })
          }

        } catch (parseError: any) {
          toast({ title: "Error de Procesamiento", description: `No se pudo procesar el archivo: ${parseError.message}`, variant: "destructive" });
          errorCount = jsonData?.length || 1;
        } finally {
          setIsProcessing(false);
          if (type === 'compras' && document.getElementById('compras-file-upload')) {
            setComprasFile(null);
            (document.getElementById('compras-file-upload') as HTMLInputElement).value = "";
          }
          if (type === 'ventas' && document.getElementById('ventas-file-upload')) {
            setVentasFile(null);
            (document.getElementById('ventas-file-upload') as HTMLInputElement).value = "";
          }
        }
      };
      reader.onerror = () => {
        toast({ title: "Error de Lectura", description: "No se pudo leer el archivo seleccionado.", variant: "destructive" });
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);

    } catch (e: any) {
      toast({ title: "Error Inesperado", description: e.message || "Ocurrió un error durante la carga.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle
        title="Carga Masiva de Compras y Ventas"
        description="Descargue las plantillas proforma (formato XLSX), complete sus datos y luego cargue los archivos para registrar múltiples operaciones a la vez."
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Carga Masiva de Compras</CardTitle>
            <CardDescription>
              Descargue la plantilla XLSX, complete sus datos de compra y luego cargue el archivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleProformaDownload('compras')} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Descargar Proforma Compras (XLSX)
            </Button>
            <div className="space-y-2">
              <label htmlFor="compras-file-upload" className="text-sm font-medium">Subir Archivo de Compras (XLSX)</label>
              <Input
                id="compras-file-upload"
                type="file"
                accept=".xlsx"
                onChange={(e) => handleFileChange(e, 'compras')}
                disabled={isProcessing}
              />
              {comprasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {comprasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('compras')} className="w-full" disabled={!comprasFile || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isProcessing ? "Procesando..." : "Procesar Compras"}
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Asegúrese de que los 'Tipos de Madera' en su archivo coincidan con los nombres exactos proporcionados en la plantilla.
              Las filas que no contengan una Fecha y un Proveedor válidos serán omitidas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga Masiva de Ventas</CardTitle>
            <CardDescription>
              Descargue la plantilla XLSX, complete sus datos de venta y luego cargue el archivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleProformaDownload('ventas')} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Descargar Proforma Ventas (XLSX)
            </Button>
             <div className="space-y-2">
              <label htmlFor="ventas-file-upload" className="text-sm font-medium">Subir Archivo de Ventas (XLSX)</label>
              <Input
                id="ventas-file-upload"
                type="file"
                accept=".xlsx"
                onChange={(e) => handleFileChange(e, 'ventas')}
                disabled={isProcessing}
              />
              {ventasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {ventasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('ventas')} className="w-full" disabled={!ventasFile || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isProcessing ? "Procesando..." : "Procesar Ventas"}
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Asegúrese de que los 'Tipos de Madera (Artículo)' coincidan con los nombres exactos de la plantilla.
              Para ventas con múltiples artículos, use el mismo 'ID Venta' para todas las filas correspondientes. Las filas sin 'ID Venta' serán omitidas.
              Si completa las columnas "Costo Madera Estimado" y "Costo Aserrío Estimado", esos valores se usarán; de lo contrario, el sistema los calculará.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


    