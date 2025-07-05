"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { HardDriveDownload, Trash2, Loader2, AlertTriangle, CircleCheck, UploadCloud } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Compra, Venta, Presupuesto, Configuracion } from "@/types";

import { addCompra, getAllCompras } from "@/lib/firebase/services/comprasService";
import { addVenta, getAllVentas } from "@/lib/firebase/services/ventasService";
import { addPresupuesto, getAllPresupuestos } from "@/lib/firebase/services/presupuestosService";
import { getAppConfig, updateAppConfig } from "@/lib/firebase/services/configuracionService";

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
  const [isRestoring, setIsRestoring] = useState(false);
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

  const handleRestore = async () => {
    setIsRestoring(true);
    toast({ title: "Iniciando restauración...", description: "Escribiendo datos en el nuevo proyecto de Firebase." });
    let restoredCounts = { compras: 0, ventas: 0, presupuestos: 0, config: false };
    try {
        const comprasBackup = localStorage.getItem("backup_compras");
        const ventasBackup = localStorage.getItem("backup_ventas");
        const presupuestosBackup = localStorage.getItem("backup_presupuestos");
        const configBackup = localStorage.getItem("backup_config");

        if (!comprasBackup || !ventasBackup || !presupuestosBackup || !configBackup) {
            throw new Error("No se encontró una copia de seguridad completa en el almacenamiento local.");
        }

        // Restore config first
        const config: Configuracion = JSON.parse(configBackup);
        await updateAppConfig(config);
        restoredCounts.config = true;

        // Restore collections, making sure to remove old IDs so Firebase generates new ones.
        const compras: Compra[] = JSON.parse(comprasBackup);
        const ventas: Venta[] = JSON.parse(ventasBackup);
        const presupuestos: Presupuesto[] = JSON.parse(presupuestosBackup);

        const restorePromises = [
            ...compras.map(c => {
                const { id, ...data } = c; // Remove the old ID
                return addCompra(data);
            }),
            ...ventas.map(v => {
                const { id, ...data } = v; // Remove the old ID
                return addVenta(data);
            }),
            ...presupuestos.map(p => {
                const { id, ...data } = p; // Remove the old ID
                return addPresupuesto(data);
            }),
        ];
        
        await Promise.all(restorePromises);
        restoredCounts.compras = compras.length;
        restoredCounts.ventas = ventas.length;
        restoredCounts.presupuestos = presupuestos.length;

        toast({
            title: "Restauración Exitosa",
            description: `Se han migrado ${restoredCounts.compras} compras, ${restoredCounts.ventas} ventas, y ${restoredCounts.presupuestos} presupuestos al nuevo proyecto.`,
            variant: "default",
            duration: 9000,
        });

    } catch (error: any) {
        console.error("Error during restore:", error);
        toast({ title: "Error en la Restauración", description: `No se pudo completar la migración. ${error.message}`, variant: "destructive", duration: 9000 });
    } finally {
        setIsRestoring(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle
        title="Gestión de Datos"
        description="Cree una copia de seguridad local de sus datos y restáurela a un nuevo proyecto de Firebase."
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Copia de Seguridad Local</CardTitle>
            <CardDescription>
              Guarda una instantánea de todos sus datos (compras, ventas, presupuestos y configuración) en el almacenamiento de su navegador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <span>
                    <strong>Importante:</strong> Esta copia es temporal y se guarda <strong>sólo en este navegador</strong>. Si borra los datos de su navegador, la copia se perderá.
                </span>
            </p>
            <Button onClick={handleBackup} className="w-full" disabled={isProcessing || isRestoring}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDriveDownload className="mr-2 h-4 w-4" />}
              {isProcessing ? "Procesando..." : "Crear/Actualizar Copia"}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             {backupStatus && (
                <>
                    <div className="w-full space-y-2 text-sm p-4 bg-muted/50 rounded-lg">
                        <p className="flex items-center gap-2 font-semibold text-primary"><CircleCheck className="h-4 w-4" /> ¡Copia de seguridad encontrada!</p>
                        <p><strong>Última actualización:</strong> {new Date(backupStatus.date).toLocaleString('es-ES')}</p>
                        <ul className="list-disc list-inside pl-2 text-muted-foreground">
                            <li><strong>Compras:</strong> {backupStatus.compras} registros</li>
                            <li><strong>Ventas:</strong> {backupStatus.ventas} registros</li>
                            <li><strong>Presupuestos:</strong> {backupStatus.presupuestos} registros</li>
                            <li><strong>Configuración:</strong> {backupStatus.config ? 'Guardada' : 'No guardada'}</li>
                        </ul>
                    </div>
                    <Button onClick={handleClearBackup} variant="destructive" className="w-full" disabled={isProcessing || isRestoring}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Eliminar Copia Local
                    </Button>
                </>
            )}
             {!backupStatus && (
                <div className="text-center text-muted-foreground py-8 w-full">
                    <p>No se ha encontrado ninguna copia de seguridad local en este navegador.</p>
                </div>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restaurar Copia de Seguridad</CardTitle>
            <CardDescription>
              Migre los datos desde su copia de seguridad local al proyecto de Firebase actualmente configurado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <span>
                    <strong>¡Atención!</strong> Esta acción <strong>añadirá</strong> todos los datos de la copia local a su base de datos. No borrará los datos existentes. Úselo con cuidado en un proyecto nuevo o vacío para evitar duplicados.
                </span>
            </p>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={!backupStatus || isProcessing || isRestoring}>
                        {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        {isRestoring ? "Restaurando..." : "Restaurar a Firebase"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar Restauración?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                           <div>
                             <p>Se escribirán los siguientes datos en su proyecto de Firebase:</p>
                             <ul className="list-disc list-inside my-2">
                              <li>{backupStatus?.compras || 0} Compras</li>
                              <li>{backupStatus?.ventas || 0} Ventas</li>
                              <li>{backupStatus?.presupuestos || 0} Presupuestos</li>
                              <li>1 Configuración</li>
                             </ul>
                             <p>Esta acción es irreversible. ¿Desea continuar?</p>
                           </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
                            Sí, Restaurar Datos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
