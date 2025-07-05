
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { HardDriveDownload, Trash2, Loader2, AlertTriangle, CircleCheck } from "lucide-react";

import { getAllCompras } from "@/lib/firebase/services/comprasService";
import { getAllVentas } from "@/lib/firebase/services/ventasService";
import { getAllPresupuestos } from "@/lib/firebase/services/presupuestosService";
import { getAppConfig } from "@/lib/firebase/services/configuracionService";

interface BackupStatus {
  date: string;
  compras: number;
  ventas: number;
  presupuestos: number;
  config: boolean;
}

export default function GestionDatosPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);

  useEffect(() => {
    // Check for existing backup on mount
    try {
      const backupInfo = localStorage.getItem("backup_info");
      if (backupInfo) {
        setBackupStatus(JSON.parse(backupInfo));
      }
    } catch (error) {
      console.error("Error reading backup info from localStorage:", error);
      localStorage.removeItem("backup_info");
    }
  }, []);

  const handleBackup = async () => {
    setIsProcessing(true);
    toast({
      title: "Iniciando copia de seguridad...",
      description: "Obteniendo datos desde Firebase. Esto puede tardar un momento.",
    });

    try {
      const [compras, ventas, presupuestos, config] = await Promise.all([
        getAllCompras(),
        getAllVentas(),
        getAllPresupuestos(),
        getAppConfig(),
      ]);

      localStorage.setItem("backup_compras", JSON.stringify(compras));
      localStorage.setItem("backup_ventas", JSON.stringify(ventas));
      localStorage.setItem("backup_presupuestos", JSON.stringify(presupuestos));
      localStorage.setItem("backup_config", JSON.stringify(config));

      const newBackupStatus: BackupStatus = {
        date: new Date().toISOString(),
        compras: compras.length,
        ventas: ventas.length,
        presupuestos: presupuestos.length,
        config: !!config,
      };

      localStorage.setItem("backup_info", JSON.stringify(newBackupStatus));
      setBackupStatus(newBackupStatus);

      toast({
        title: "Copia de Seguridad Exitosa",
        description: `Se han guardado ${compras.length} compras, ${ventas.length} ventas, y ${presupuestos.length} presupuestos en el almacenamiento local.`,
        variant: "default",
        duration: 7000,
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      toast({
        title: "Error en la Copia de Seguridad",
        description: "No se pudieron obtener los datos desde Firebase. Revisa la consola para más detalles. " + (error instanceof Error ? error.message : "Error desconocido"),
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleClearBackup = () => {
    setIsProcessing(true);
    try {
        localStorage.removeItem("backup_compras");
        localStorage.removeItem("backup_ventas");
        localStorage.removeItem("backup_presupuestos");
        localStorage.removeItem("backup_config");
        localStorage.removeItem("backup_info");
        setBackupStatus(null);
        toast({
            title: "Copia de Seguridad Eliminada",
            description: "Los datos guardados en el almacenamiento local han sido borrados.",
        });
    } catch (error) {
        console.error("Error clearing backup:", error);
        toast({
            title: "Error",
            description: "No se pudo eliminar la copia de seguridad.",
            variant: "destructive",
        });
    } finally {
        setIsProcessing(false);
    }
  };


  return (
    <div className="container mx-auto py-6">
      <PageTitle
        title="Gestión de Datos"
        description="Cree una copia de seguridad local de sus datos de Firebase. Esto es útil para migraciones o como respaldo."
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Copia de Seguridad Local</CardTitle>
            <CardDescription>
              Guarda una instantánea de todos sus datos (compras, ventas, presupuestos y configuración) en el almacenamiento de su navegador (LocalStorage).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <span>
                    <strong>Importante:</strong> Esta copia es temporal y se guarda <strong>sólo en este navegador y en este dispositivo</strong>. No es un respaldo en la nube. Si borra los datos de su navegador, la copia se perderá.
                </span>
            </p>
            <Button onClick={handleBackup} className="w-full" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDriveDownload className="mr-2 h-4 w-4" />}
              {isProcessing ? "Procesando..." : "Crear/Actualizar Copia de Seguridad"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de la Copia de Seguridad</CardTitle>
            <CardDescription>
              Información sobre la copia de seguridad guardada localmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {backupStatus ? (
              <div className="space-y-2 text-sm p-4 bg-muted/50 rounded-lg">
                <p className="flex items-center gap-2 font-semibold text-primary"><CircleCheck className="h-4 w-4" /> ¡Copia de seguridad encontrada!</p>
                <p><strong>Última actualización:</strong> {new Date(backupStatus.date).toLocaleString('es-ES')}</p>
                <ul className="list-disc list-inside pl-2 text-muted-foreground">
                    <li><strong>Compras:</strong> {backupStatus.compras} registros</li>
                    <li><strong>Ventas:</strong> {backupStatus.ventas} registros</li>
                    <li><strong>Presupuestos:</strong> {backupStatus.presupuestos} registros</li>
                    <li><strong>Configuración:</strong> {backupStatus.config ? 'Guardada' : 'No guardada'}</li>
                </ul>
              </div>
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    <p>No se ha encontrado ninguna copia de seguridad local en este navegador.</p>
                </div>
            )}
          </CardContent>
          {backupStatus && (
            <CardFooter>
                 <Button onClick={handleClearBackup} variant="destructive" className="w-full" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Eliminar Copia de Seguridad Local
                </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
