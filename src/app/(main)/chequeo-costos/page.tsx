
"use client";

import React, { useState, useEffect } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { chequearCostoAserrio, type ChequeoAserrioOutput } from "@/ai/flows/costo-aserrio-pie-flow";

export default function ChequeoCostosPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [resultado, setResultado] = useState<ChequeoAserrioOutput | null>(null);

  useEffect(() => {
    async function performCheck() {
      setIsLoading(true);
      try {
        const result = await chequearCostoAserrio();
        setResultado(result);
      } catch (error) {
        console.error("Error al chequear costos:", error);
        toast({
          title: "Error",
          description: "No se pudo realizar el chequeo de costos. " + (error instanceof Error ? error.message : "Error desconocido."),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    performCheck();
  }, [toast]);

  return (
    <div className="container mx-auto py-6">
      <PageTitle
        title="Chequeo de Costos en Tiempo Real"
        description="Verificación de cálculos clave del sistema utilizando la configuración actual de Firebase."
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Costo de Aserrío por Pie Tablar</CardTitle>
            <CardDescription>
              Este cálculo se basa en la fórmula que definimos y los valores que guardaste en "Costos Operativos".
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[150px]">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Consultando a la IA y calculando...</p>
              </div>
            ) : resultado ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Costo Final por Pie:</h3>
                  <p className="text-3xl font-bold">${resultado.costoPorPie.toFixed(5)}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Desglose del Cálculo:</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{resultado.calculoDetallado}</p>
                </div>
              </div>
            ) : (
               <div className="text-center text-muted-foreground min-h-[150px] flex items-center justify-center">
                <p>No se pudo obtener el resultado del cálculo.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Aquí se podrían agregar más tarjetas de chequeo en el futuro */}
        <Card className="flex items-center justify-center bg-muted/30 border-dashed">
            <div className="text-center text-muted-foreground">
                <p>Más chequeos de costos próximamente.</p>
            </div>
        </Card>

      </div>
    </div>
  );
}
