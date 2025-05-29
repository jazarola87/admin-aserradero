
"use client";

import React, { useState } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initialConfigData } from "@/lib/config-data"; // Importar config data

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

  const createCSV = (headers: string[], dataRows: string[][], validTimberTypes: string[]): string => {
    const headerRow = headers.join(',');
    
    // Agregar filas de datos de ejemplo si es necesario, o dejarlas vacías
    // Por ahora, solo encabezados y tipos de madera válidos

    const timberTypesHeader = ",,,,Tipos de Madera Válidos (Usar estos nombres exactos)"; // Ajustar comas según número de headers principales
    let csvContent = headerRow + "\n";

    // Añadir los tipos de madera válidos como referencia en el CSV
    const maxRows = Math.max(dataRows.length, validTimberTypes.length);
    for (let i = 0; i < maxRows; i++) {
        const dataPart = dataRows[i] ? dataRows[i].join(',') : headers.map(() => "").slice(0, headers.length - timberTypesHeader.split(',').length +1).join(','); // Ajustar para que las celdas vacías se alineen con las columnas de datos
        const timberTypePart = validTimberTypes[i] ? `${headers.map(()=>'').slice(0, headers.length -1).join(',')},"${validTimberTypes[i]}"` : ""; // Ajustar comas
        
        if (i === 0 && dataRows.length === 0) { // Si no hay dataRows, y es la primera fila de timber types
            csvContent += headers.map(() => "").join(',') + timberTypesHeader + "\n";
        }
        
        if(i < dataRows.length) {
            csvContent += dataRows[i].join(',');
            if(i < validTimberTypes.length) {
                 csvContent += `,${validTimberTypes[i]}`
            }
            csvContent += "\n";
        } else if (i < validTimberTypes.length) {
             csvContent += headers.map(() => "").join(',') + `,${validTimberTypes[i]}\n`;
        }
    }
     if (dataRows.length === 0 && validTimberTypes.length > 0 && csvContent.indexOf(timberTypesHeader) === -1) {
        csvContent += "\n" + headers.map(() => "").join(',')+ timberTypesHeader + "\n";
         validTimberTypes.forEach(type => {
            csvContent += headers.map(() => "").join(',') + `,"${type}"\n`;
        });
    }


    return csvContent;
  };
  
  const downloadCSV = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
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
      const headers = ["Fecha (YYYY-MM-DD)", "Tipo de Madera", "Volumen (m³)", "Precio por Metro Cúbico ($)", "Proveedor", "Telefono Proveedor (Opcional)"];
      // Ejemplo de una fila vacía para la estructura
      const exampleRow = ['"AAAA-MM-DD"', '"Ej: Pino"', '0', '0', '"Nombre Proveedor"', '""'];
      
      let csvContent = headers.join(',') + '\n';
      csvContent += exampleRow.join(',') + '\n\n'; // Fila de ejemplo + línea en blanco
      csvContent += ",,,,Tipos de Madera Válidos (Usar estos nombres exactos para 'Tipo de Madera')\n";
      validTimberTypes.forEach(timber => {
        csvContent += `,,,,,"${timber}"\n`;
      });
      
      csvString = csvContent;
      filename = "proforma_compras.csv";

    } else if (type === 'ventas') {
      const headers = [
        "ID Venta (Agrupar filas con mismo ID para una sola venta)", 
        "Fecha (YYYY-MM-DD)", "Nombre Comprador", "Telefono Comprador (Opcional)", 
        "Fecha Entrega Estimada (YYYY-MM-DD, Opcional)", "Seña ($) (Opcional)", "Costo Operario ($) (Opcional)",
        "Tipo Madera (Artículo)", "Unidades (Artículo)", "Ancho (pulg, Artículo)", 
        "Alto (pulg, Artículo)", "Largo (m, Artículo)", "Precio Por Pie ($) (Artículo)", "Cepillado (Si/No, Artículo)"
      ];
      const exampleRow = [
        '"ID_UNICO_PARA_ESTA_VENTA"', '"AAAA-MM-DD"', '"Nombre Cliente"', '""', 
        '""', '0', '0',
        '"Ej: Roble"', '0', '0', 
        '0', '0', '0', '"No"'
      ];

      let csvContent = headers.join(',') + '\n';
      csvContent += exampleRow.join(',') + '\n\n';
      csvContent += ",,,,,,,,,,,,,,Tipos de Madera Válidos (Usar estos nombres exactos para 'Tipo Madera (Artículo)')\n";
      validTimberTypes.forEach(timber => {
        csvContent += `, $ {',,,,,,,,,,,,,,"${timber}"}\n`; // Ajustar comas para alinear
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
    if (type === 'compras') {
      setComprasFile(null);
      (document.getElementById('compras-file-upload') as HTMLInputElement).value = "";
    }
    if (type === 'ventas') {
      setVentasFile(null);
      (document.getElementById('ventas-file-upload') as HTMLInputElement).value = "";
    }
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Carga Masiva de Compras y Ventas" 
        description="Descargue las plantillas proforma (formato CSV) y luego cargue sus archivos para registrar múltiples compras o ventas a la vez." 
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
              <label htmlFor="compras-file-upload" className="text-sm font-medium">Subir Archivo de Compras (CSV/Excel)</label>
              <Input 
                id="compras-file-upload" 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                onChange={(e) => handleFileChange(e, 'compras')} 
              />
              {comprasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {comprasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('compras')} className="w-full" disabled={!comprasFile}>
              <UploadCloud className="mr-2 h-4 w-4" /> Procesar Compras
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Nota: La funcionalidad de procesamiento real de archivos no está implementada en este prototipo.
              Asegúrese de que los 'Tipos de Madera' en su archivo coincidan con los definidos en 'Precios de Venta'.
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
              <label htmlFor="ventas-file-upload" className="text-sm font-medium">Subir Archivo de Ventas (CSV/Excel)</label>
              <Input 
                id="ventas-file-upload" 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                onChange={(e) => handleFileChange(e, 'ventas')}
              />
              {ventasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {ventasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('ventas')} className="w-full" disabled={!ventasFile}>
              <UploadCloud className="mr-2 h-4 w-4" /> Procesar Ventas
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Nota: La funcionalidad de procesamiento real de archivos no está implementada en este prototipo.
              Asegúrese de que los 'Tipos de Madera' en su archivo coincidan con los definidos en 'Precios de Venta'.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


    