
"use client";

import React, { useState } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const handleProformaDownload = (type: 'compras' | 'ventas') => {
    // In a real app, this would trigger a download of an Excel template.
    // For this prototype, we'll just show a toast.
    toast({
      title: "Descarga de Proforma (Simulada)",
      description: `La proforma para ${type} se descargaría aquí.`,
    });
    // Example: window.location.href = `/api/download-proforma?type=${type}`;
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
    // In a real app, this would send the file to a backend for processing.
    // For this prototype, we'll simulate an upload and processing.
    toast({
      title: "Carga (Simulada)",
      description: `Archivo ${file.name} para ${type} se procesaría aquí. Lógica no implementada.`,
    });
    console.log(`Simulating upload and processing for ${type}:`, file);
    // Reset file input after 'upload'
    if (type === 'compras') setComprasFile(null);
    if (type === 'ventas') setVentasFile(null);
    // Consider resetting the input field value as well
    // e.g., (document.getElementById(`file-input-${type}`) as HTMLInputElement).value = "";
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Carga Masiva de Compras y Ventas" 
        description="Descargue las plantillas proforma y luego cargue sus archivos Excel para registrar múltiples compras o ventas a la vez." 
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Carga Masiva de Compras</CardTitle>
            <CardDescription>
              Descargue la plantilla, complete sus datos de compra y luego cargue el archivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleProformaDownload('compras')} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Descargar Proforma Compras
            </Button>
            <div className="space-y-2">
              <label htmlFor="compras-file-upload" className="text-sm font-medium">Subir Archivo de Compras (Excel)</label>
              <Input 
                id="compras-file-upload" 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={(e) => handleFileChange(e, 'compras')} 
              />
              {comprasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {comprasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('compras')} className="w-full" disabled={!comprasFile}>
              <UploadCloud className="mr-2 h-4 w-4" /> Procesar Compras
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Nota: La funcionalidad de procesamiento real de archivos Excel no está implementada en este prototipo.
              Asegúrese de que los 'Tipos de Madera' en su Excel coincidan con los definidos en 'Precios de Venta'.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga Masiva de Ventas</CardTitle>
            <CardDescription>
              Descargue la plantilla, complete sus datos de venta y luego cargue el archivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleProformaDownload('ventas')} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Descargar Proforma Ventas
            </Button>
             <div className="space-y-2">
              <label htmlFor="ventas-file-upload" className="text-sm font-medium">Subir Archivo de Ventas (Excel)</label>
              <Input 
                id="ventas-file-upload" 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={(e) => handleFileChange(e, 'ventas')}
              />
              {ventasFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {ventasFile.name}</p>}
            </div>
            <Button onClick={() => handleUpload('ventas')} className="w-full" disabled={!ventasFile}>
              <UploadCloud className="mr-2 h-4 w-4" /> Procesar Ventas
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Nota: La funcionalidad de procesamiento real de archivos Excel no está implementada en este prototipo.
              Asegúrese de que los 'Tipos de Madera' en su Excel coincidan con los definidos en 'Precios de Venta'.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
