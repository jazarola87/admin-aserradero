
"use client";

import React, { useState, useEffect } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { chequearCostoAserrio, type ChequeoAserrioOutput } from "@/ai/flows/costo-aserrio-pie-flow";
import { chequearCostoMadera, type ChequeoCostoMaderaOutput } from "@/ai/flows/chequeo-costo-madera-flow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function ChequeoCostosPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [resultadoAserrio, setResultadoAserrio] = useState<ChequeoAserrioOutput | null>(null);
  const [resultadoMadera, setResultadoMadera] = useState<ChequeoCostoMaderaOutput | null>(null);

  useEffect(() => {
    async function performCheck() {
      setIsLoading(true);
      try {
        const [resultAserrio, resultMadera] = await Promise.all([
            chequearCostoAserrio(),
            chequearCostoMadera()
        ]);
        setResultadoAserrio(resultAserrio);
        setResultadoMadera(resultMadera);
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
            ) : resultadoAserrio ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Costo Final por Pie:</h3>
                  <p className="text-3xl font-bold">${resultadoAserrio.costoPorPie.toFixed(5)}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Desglose del Cálculo:</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{resultadoAserrio.calculoDetallado}</p>
                </div>
              </div>
            ) : (
               <div className="text-center text-muted-foreground min-h-[150px] flex items-center justify-center">
                <p>No se pudo obtener el resultado del cálculo de aserrío.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Costo de Recupero de Madera por Pie</CardTitle>
            <CardDescription>
              Este es el costo base de tu materia prima por cada pie tablar, calculado desde "Costos Operativos".
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[150px]">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Calculando costos de madera...</p>
                </div>
            ) : resultadoMadera ? (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">Fórmula de Cálculo:</h3>
                        <p className="text-muted-foreground text-sm">{resultadoMadera.explicacionFormula}</p>
                    </div>
                    {resultadoMadera.costosDetallados.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo de Madera</TableHead>
                            <TableHead className="text-right">Costo / m³</TableHead>
                            <TableHead className="text-right font-semibold text-primary">Costo / Pie</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resultadoMadera.costosDetallados.map((item) => (
                            <TableRow key={item.tipoMadera}>
                              <TableCell>{item.tipoMadera}</TableCell>
                              <TableCell className="text-right">${item.costoPorMetroCubico.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-semibold text-primary">${item.costoPorPieRecupero.toFixed(5)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                        <p className="text-center text-muted-foreground pt-4">No hay costos de madera configurados en "Costos Operativos".</p>
                    )}
                </div>
            ) : (
                <div className="text-center text-muted-foreground min-h-[150px] flex items-center justify-center">
                    <p>No se pudo obtener el resultado del cálculo de madera.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
