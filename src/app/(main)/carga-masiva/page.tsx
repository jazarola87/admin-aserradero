
"use client";

import React, { useState } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initialConfigData } from "@/lib/config-data";

export default function CargaMasivaPage() {
  const { toast } = useToast();
  const [comprasFile, setComprasFile] = useState<File | null>(null);
  const [ventasFile, setVentasFile] = useState<File | null>(null);

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
  
  const downloadCSV = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { 
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
  };

  const handleProformaDownload = (type: 'compras' | 'ventas') => {
    const validTimberTypes = initialConfigData.preciosMadera.map(pm => pm.tipoMadera);
    let csvString = "";
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
      const exampleRow = ['"2024-01-15"', '"Pino"', '"12.5"', '"180.00"', '"Aserradero El Progreso"', '"1122334455"'];
      
      let csvContent = headers.join(',') + '\n';
      csvContent += exampleRow.join(',') + '\n\n'; 
      csvContent += "Tipos de Madera Válidos (Usar estos nombres exactos para la columna 'Tipo de Madera'):\n";
      validTimberTypes.forEach(timber => {
        csvContent += `"${timber}"\n`;
      });
      
      csvString = csvContent;
      filename = "proforma_compras.csv";

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
        "Cepillado (Si/No, Artículo)"
      ];
      // Ejemplo para una venta con dos artículos
      const exampleRow1 = [
        '"VENTA001"', '"2024-02-10"', '"Ana Torres"', '"555-9876"', '"2024-02-20"', '"50.00"', '"25.00"',
        '"Roble"', '"20"', '"6"', '"2"', '"3.05"', '"5.50"', '"Si"'
      ];
      const exampleRow2 = [
        '"VENTA001"', '"2024-02-10"', '"Ana Torres"', '"555-9876"', '"2024-02-20"', '""', '""', // Seña y costo operario solo en la primera línea del ID Venta
        '"Pino"', '"30"', '"4"', '"1"', '"2.44"', '"2.75"', '"No"'
      ];

      let csvContent = headers.join(',') + '\n';
      csvContent += exampleRow1.join(',') + '\n';
      csvContent += exampleRow2.join(',') + '\n\n';
      csvContent += "Tipos de Madera Válidos (Usar estos nombres exactos para la columna 'Tipo Madera (Artículo)'):\n";
      validTimberTypes.forEach(timber => {
        csvContent += `"${timber}"\n`;
      });

      csvString = csvContent;
      filename = "proforma_ventas.csv";
    }

    downloadCSV(csvString, filename);
    toast({
      title: "Descarga Iniciada",
      description: `Se está descargando la proforma para ${type} (${filename}).`,
    });
  };

  const handleUpload = (type: 'compras' | 'ventas') => {
    const file = type === 'compras' ? comprasFile : ventasFile;
    if (!file) {
      toast({
        title: "Error",
        description: "Por favor, seleccione un archivo para cargar.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Carga (Simulada)",
      description: `Archivo ${file.name} para ${type} se procesaría aquí. Lógica no implementada.`,
    });
    console.log(`Simulating upload and processing for ${type}:`, file);
    // Reset file input after simulated upload
    if (type === 'compras' && document.getElementById('compras-file-upload')) {
      setComprasFile(null);
      (document.getElementById('compras-file-upload') as HTMLInputElement).value = "";
    }
    if (type === 'ventas' && document.getElementById('ventas-file-upload')) {
      setVentasFile(null);
      (document.getElementById('ventas-file-upload') as HTMLInputElement).value = "";
    }
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Carga Masiva de Compras y Ventas" 
        description="Descargue las plantillas proforma (formato CSV), complete sus datos y luego cargue los archivos para registrar múltiples operaciones a la vez." 
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Carga Masiva de Compras</CardTitle>
            <CardDescription>
              Descargue la plantilla CSV, complete sus datos de compra y luego cargue el archivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleProformaDownload('compras')} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Descargar Proforma Compras (CSV)
            </Button>
            <div className="space-y-2">
              <label htmlFor="compras-file-upload" className="text-sm font-medium">Subir Archivo de Compras (CSV)</label>
              <Input 
                id="compras-file-upload" 
                type="file" 
                accept=".csv" 
                onChange={(e) => handleFileChange(e, 'compras')} 
              />
              {comprasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {comprasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('compras')} className="w-full" disabled={!comprasFile}>
              <UploadCloud className="mr-2 h-4 w-4" /> Procesar Compras
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Nota: La funcionalidad de procesamiento real de archivos no está implementada en este prototipo.
              Asegúrese de que los 'Tipos de Madera' en su archivo coincidan con los nombres exactos proporcionados en la plantilla.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga Masiva de Ventas</CardTitle>
            <CardDescription>
              Descargue la plantilla CSV, complete sus datos de venta y luego cargue el archivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleProformaDownload('ventas')} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Descargar Proforma Ventas (CSV)
            </Button>
             <div className="space-y-2">
              <label htmlFor="ventas-file-upload" className="text-sm font-medium">Subir Archivo de Ventas (CSV)</label>
              <Input 
                id="ventas-file-upload" 
                type="file" 
                accept=".csv" 
                onChange={(e) => handleFileChange(e, 'ventas')}
              />
              {ventasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {ventasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('ventas')} className="w-full" disabled={!ventasFile}>
              <UploadCloud className="mr-2 h-4 w-4" /> Procesar Ventas
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Nota: La funcionalidad de procesamiento real de archivos no está implementada en este prototipo.
              Asegúrese de que los 'Tipos de Madera (Artículo)' en su archivo coincidan con los nombres exactos proporcionados en la plantilla. Para ventas con múltiples artículos, use el mismo 'ID Venta' para todas las filas correspondientes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
