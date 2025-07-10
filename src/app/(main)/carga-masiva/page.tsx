"use client";

import React, { useState, useEffect } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, UploadCloud, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAppConfig } from "@/lib/firebase/services/configuracionService";
import { addVenta } from "@/lib/firebase/services/ventasService";
import { addCompra } from "@/lib/firebase/services/comprasService";
import * as XLSX from 'xlsx';
import type { Compra, Venta, VentaDetalle, Configuracion } from "@/types";
import { format, isValid, parseISO } from "date-fns";

// Helper to calculate board feet for a single sale item
const calcularPiesTablaresVentaItem = (detalle: Partial<VentaDetalle>): number => {
    const unidades = Number(detalle?.unidades) || 0;
    const alto = Number(detalle?.alto) || 0;
    const ancho = Number(detalle?.ancho) || 0;
    const largo = Number(detalle?.largo) || 0;

    if (!unidades || !alto || !ancho || !largo) return 0;
    // Fórmula: unidades * alto (pulg) * ancho (pulg) * largo (metros) * 0.2734
    return unidades * alto * ancho * largo * 0.2734;
};

const calcularSubtotalVentaItem = (
    detalle: Partial<Omit<VentaDetalle, 'subTotal' | 'piesTablares' | 'valorUnitario' | 'id'>>,
    piesTablares: number,
    precioCepilladoAplicable: number // Precio de cepillado específico para este ítem
  ): number => {
    const precioPorPie = Number(detalle?.precioPorPie) || 0;
    const cepillado = detalle?.cepillado || false;
    if (piesTablares === 0) return 0;
    let subtotal = piesTablares * precioPorPie;
    if (cepillado) {
      subtotal += piesTablares * precioCepilladoAplicable;
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
  const [config, setConfig] = useState<Configuracion | null>(null);

  useEffect(() => {
    getAppConfig()
      .then(setConfig)
      .catch(() => toast({ title: "Error", description: "No se pudo cargar la configuración de la aplicación.", variant: "destructive" }));
  }, [toast]);

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
    if (!config) {
      toast({ title: "Error", description: "La configuración no se ha cargado todavía. Intente de nuevo en un momento.", variant: "destructive" });
      return;
    }
    const validTimberTypes = config.preciosMadera.map(pm => pm.tipoMadera);
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
        "Precio Cepillado Por Pie ($) (Artículo, Opcional)",
        "Costo Madera Estimado ($) (Artículo, Informativo)",
        "Costo Aserrío Estimado ($) (Artículo, Informativo)"
      ];

      const exampleItem1: Partial<VentaDetalle> & {precioCepilladoEspecifico?: number} = {
        tipoMadera: 'Roble', unidades: 20, ancho: 6, alto: 2, largo: 3.05, precioPorPie: 5.50, cepillado: true, precioCepilladoEspecifico: 0.60
      };

      const exampleItem2: Partial<VentaDetalle> & {precioCepilladoEspecifico?: number} = {
        tipoMadera: 'Pino', unidades: 30, ancho: 4, alto: 1, largo: 2.44, precioPorPie: 2.75, cepillado: false
      };

      const exampleRow1 = [
        'VENTA001', '2024-02-10', 'Ana Torres', '555-9876', '2024-02-20', 50.00, 25.00,
        exampleItem1.tipoMadera, exampleItem1.unidades, exampleItem1.ancho, exampleItem1.alto, exampleItem1.largo, exampleItem1.precioPorPie, 'Si',
        exampleItem1.precioCepilladoEspecifico?.toFixed(2) || "",
        150.25, 30.70
      ];
      const exampleRow2 = [
        'VENTA001', '2024-02-10', 'Ana Torres', '555-9876', '2024-02-20', "", "",
        exampleItem2.tipoMadera, exampleItem2.unidades, exampleItem2.ancho, exampleItem2.alto, exampleItem2.largo, exampleItem2.precioPorPie, 'No',
        "",
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
    if (!config) {
      toast({ title: "Error", description: "La configuración no está cargada. Intente de nuevo.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    let processedCount = 0;
    let errorCount = 0;
    const errorRows: { row: number; message: string; data: any }[] = [];
    let jsonData: any[] = [];
    const newRecords: Array<Omit<Compra, 'id'> | Omit<Venta, 'id'>> = [];


    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer) throw new Error("No se pudo leer el archivo.");
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (type === 'compras') {
          const validTimberTypes = config.preciosMadera.map(pm => pm.tipoMadera);

          jsonData.forEach((row, index) => {
            if (!row["Fecha (YYYY-MM-DD)"] || !row["Proveedor"]) return;

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
              if (!validTimberTypes.includes(tipoMadera)) throw new Error(`Tipo de madera '${tipoMadera}' no es válido.`);
              const volumen = parseFloat(String(row["Volumen (m³)"] || "0"));
              const precioPorMetroCubico = parseFloat(String(row["Precio por Metro Cúbico ($)"] || "0"));
              if (isNaN(volumen) || volumen <= 0) throw new Error("Volumen inválido.");
              if (isNaN(precioPorMetroCubico) || precioPorMetroCubico <= 0) throw new Error("Precio por m³ inválido.");
              const proveedor = String(row["Proveedor"] || "").trim();
              if (!proveedor) throw new Error("Proveedor es requerido.");

              const nuevaCompra: Omit<Compra, 'id'> = {
                fecha: fechaCompra, tipoMadera, volumen, precioPorMetroCubico,
                costo: volumen * precioPorMetroCubico,
                proveedor,
                telefonoProveedor: String(row["Telefono Proveedor (Opcional)"] || "").trim() || undefined,
              };
              newRecords.push(nuevaCompra);
              processedCount++;
            } catch (e: any) {
              errorCount++;
              errorRows.push({ row: index + 2, message: e.message || "Error desconocido", data: row });
            }
          });

        } else if (type === 'ventas') {
          const validTimberTypes = config.preciosMadera.map(pm => pm.tipoMadera);
          const ventasAgrupadas: { [key: string]: any[] } = {};
          jsonData.forEach((row, index) => {
              const idVenta = String(row["ID Venta (Agrupar filas con mismo ID para una sola venta)"] || "").trim();
              if (!idVenta) return;
              if (!ventasAgrupadas[idVenta]) ventasAgrupadas[idVenta] = [];
              ventasAgrupadas[idVenta].push({ ...row, originalRowIndex: index + 2 });
          });

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
                      if (fechaEntregaRaw instanceof Date && isValid(fechaEntregaRaw)) fechaEntregaEstimada = format(fechaEntregaRaw, "yyyy-MM-dd");
                      else if (typeof fechaEntregaRaw === 'string' && isValid(parseISO(fechaEntregaRaw))) fechaEntregaEstimada = format(parseISO(fechaEntregaRaw), "yyyy-MM-dd");
                      else if (typeof fechaEntregaRaw === 'number') {
                          const d = XLSX.SSF.parse_date_code(fechaEntregaRaw);
                          if (d) fechaEntregaEstimada = format(new Date(d.y, d.m-1,d.d,d.H,d.M,d.S), "yyyy-MM-dd");
                      }
                  }

                  const nombreComprador = String(firstRow["Nombre Comprador"] || "").trim();
                  if (!nombreComprador) throw new Error ("Nombre del comprador es requerido.");
                  const sena = parseFloat(String(firstRow["Seña ($) (Opcional, ingresar una vez por ID Venta)"] || "0"));
                  const costoOperario = parseFloat(String(firstRow["Costo Operario ($) (Opcional, ingresar una vez por ID Venta)"] || "0"));
                  
                  let seEncontroCostoMaderaEnExcel = false, seEncontroCostoAserrioEnExcel = false;
                  let acumuladoCostoMaderaExcel = 0, acumuladoCostoAserrioExcel = 0;

                  const detallesVenta: VentaDetalle[] = group.map((itemRow, itemIndex) => {
                      const tipoMaderaItem = String(itemRow["Tipo Madera (Artículo)"] || "").trim();
                      if(!tipoMaderaItem) throw new Error(`Fila ${itemRow.originalRowIndex}: Tipo de madera del artículo es requerido.`);
                      if (!validTimberTypes.includes(tipoMaderaItem)) throw new Error(`Fila ${itemRow.originalRowIndex}: Tipo de madera '${tipoMaderaItem}' no es válido.`);
                      
                      const unidades = parseInt(String(itemRow["Unidades (Artículo)"] || "0"), 10);
                      const ancho = parseFloat(String(itemRow["Ancho (pulg, Artículo)"] || "0"));
                      const alto = parseFloat(String(itemRow["Alto (pulg, Artículo)"] || "0"));
                      const largo = parseFloat(String(itemRow["Largo (m, Artículo)"] || "0"));
                      const precioPorPieItem = parseFloat(String(itemRow["Precio Por Pie ($) (Artículo)"] || "0"));
                      const cepilladoStr = String(itemRow["Cepillado (Si/No, Artículo)"] || "No").trim().toLowerCase();
                      if (isNaN(unidades) || unidades <=0) throw new Error(`Fila ${itemRow.originalRowIndex}: Unidades inválidas.`);
                      if (!['si', 'no'].includes(cepilladoStr)) throw new Error(`Fila ${itemRow.originalRowIndex}: Valor de Cepillado debe ser 'Si' o 'No'.`);

                      const cepillado = cepilladoStr === 'si';
                      const piesTablares = calcularPiesTablaresVentaItem({ unidades, ancho, alto, largo });
                      const precioCepilladoItemExcel = parseFloat(String(itemRow["Precio Cepillado Por Pie ($) (Artículo, Opcional)"] || "").trim());
                      const precioCepilladoAplicable = (cepillado && !isNaN(precioCepilladoItemExcel) && precioCepilladoItemExcel >= 0) ? precioCepilladoItemExcel : config.precioCepilladoPorPie;
                      const subTotal = calcularSubtotalVentaItem({ precioPorPie: precioPorPieItem, cepillado }, piesTablares, precioCepilladoAplicable);

                      const costoMaderaItemExcel = parseFloat(String(itemRow["Costo Madera Estimado ($) (Artículo, Informativo)"] || "").trim());
                      if (!isNaN(costoMaderaItemExcel) && costoMaderaItemExcel >= 0) {
                          acumuladoCostoMaderaExcel += costoMaderaItemExcel;
                          seEncontroCostoMaderaEnExcel = true;
                      }

                      const costoAserrioItemExcel = parseFloat(String(itemRow["Costo Aserrío Estimado ($) (Artículo, Informativo)"] || "").trim());
                       if (!isNaN(costoAserrioItemExcel) && costoAserrioItemExcel >= 0) {
                          acumuladoCostoAserrioExcel += costoAserrioItemExcel;
                          seEncontroCostoAserrioEnExcel = true;
                      }

                      return {
                          id: `vd-bulk-${Date.now()}-${itemIndex}`,
                          tipoMadera: tipoMaderaItem, unidades, ancho, alto, largo, precioPorPie: precioPorPieItem, cepillado, piesTablares, subTotal,
                          valorUnitario: unidades > 0 ? subTotal / unidades : 0,
                      };
                  });
                  
                  const costoMaderaSnapshot = seEncontroCostoMaderaEnExcel ? acumuladoCostoMaderaExcel : calcularCostoMaderaTotalParaVenta(detallesVenta, config);
                  const costoAserrioSnapshot = seEncontroCostoAserrioEnExcel ? acumuladoCostoAserrioExcel : calcularCostoAserrioTotalParaVenta(detallesVenta, config);

                  const nuevaVenta: Omit<Venta, 'id'> = {
                      fecha: fechaVenta, nombreComprador,
                      telefonoComprador: String(firstRow["Telefono Comprador (Opcional)"] || "").trim() || undefined,
                      fechaEntregaEstimada,
                      sena: !isNaN(sena) ? sena : undefined,
                      costoOperario: !isNaN(costoOperario) ? costoOperario : undefined,
                      detalles: detallesVenta,
                      totalVenta: detallesVenta.reduce((sum, d) => sum + (d.subTotal || 0), 0),
                      costoMaderaVentaSnapshot, costoAserrioVentaSnapshot,
                  };
                  newRecords.push(nuevaVenta);
                  processedCount++;
              } catch (e: any) {
                  errorCount++;
                  errorRows.push({ row: firstRow.originalRowIndex, message: `Error procesando Venta ID ${idVenta}: ${e.message || "Error desconocido"}`, data: firstRow });
              }
          }
        }

        // Save records to Firebase
        if (newRecords.length > 0) {
          const savePromises = newRecords.map(record => {
            if ('proveedor' in record) { // It's a Compra
              return addCompra(record);
            } else { // It's a Venta
              return addVenta(record);
            }
          });
          await Promise.all(savePromises);
        }

        toast({
          title: "Proceso de Carga Finalizado",
          description: `${processedCount} registro(s) procesado(s) y guardado(s) en Firebase. ${errorCount} registro(s) con errores.`,
          variant: errorCount > 0 ? "destructive" : "default",
          duration: errorCount > 0 ? 10000 : 5000,
        });

        if (errorCount > 0) {
          console.error("Errores durante la carga masiva:", errorRows);
          toast({ title: "Detalle de Errores", description: "Revise la consola del navegador (F12) para más detalles.", variant: "destructive", duration: 10000 });
        }

      } catch (parseError: any) {
        toast({ title: "Error de Procesamiento", description: `No se pudo procesar el archivo: ${parseError.message}`, variant: "destructive" });
        errorCount = jsonData?.length || 1;
      } finally {
        setIsProcessing(false);
        if (type === 'compras' && document.getElementById('compras-file-upload')) (document.getElementById('compras-file-upload') as HTMLInputElement).value = "";
        if (type === 'ventas' && document.getElementById('ventas-file-upload')) (document.getElementById('ventas-file-upload') as HTMLInputElement).value = "";
        setComprasFile(null);
        setVentasFile(null);
      }
    };
    reader.onerror = () => {
      toast({ title: "Error de Lectura", description: "No se pudo leer el archivo seleccionado.", variant: "destructive" });
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle
        title="Carga Masiva de Compras y Ventas"
        description="Descarga las plantillas proforma (formato XLSX), completa tus datos y luego carga los archivos para registrar múltiples operaciones a la vez en Firebase."
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Carga Masiva de Compras</CardTitle>
            <CardDescription>
              Descarga la plantilla, completa tus datos y carga el archivo para guardarlo en Firebase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleProformaDownload('compras')} variant="outline" className="w-full" disabled={!config}>
              <Download className="mr-2 h-4 w-4" /> Descargar Proforma Compras (XLSX)
            </Button>
            <div className="space-y-2">
              <label htmlFor="compras-file-upload" className="text-sm font-medium">Subir Archivo de Compras (XLSX)</label>
              <Input id="compras-file-upload" type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'compras')} disabled={isProcessing || !config} />
              {comprasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {comprasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('compras')} className="w-full" disabled={!comprasFile || isProcessing || !config}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isProcessing ? "Procesando..." : "Procesar Compras"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga Masiva de Ventas</CardTitle>
            <CardDescription>
              Descarga la plantilla, completa tus datos y carga el archivo para guardarlo en Firebase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleProformaDownload('ventas')} variant="outline" className="w-full" disabled={!config}>
              <Download className="mr-2 h-4 w-4" /> Descargar Proforma Ventas (XLSX)
            </Button>
             <div className="space-y-2">
              <label htmlFor="ventas-file-upload" className="text-sm font-medium">Subir Archivo de Ventas (XLSX)</label>
              <Input id="ventas-file-upload" type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'ventas')} disabled={isProcessing || !config} />
              {ventasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {ventasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('ventas')} className="w-full" disabled={!ventasFile || isProcessing || !config}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isProcessing ? "Procesando..." : "Procesar Ventas"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
