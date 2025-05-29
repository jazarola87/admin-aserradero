
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Loader2 } from "lucide-react";
import { useState } from "react";
import { sugerirPrecio, type SugerirPrecioInput, type SugerirPrecioOutput } from "@/ai/flows/precio-sugerido";
import { cn } from "@/lib/utils"; // Added import for cn

const asistenteFormSchema = z.object({
  tipoMadera: z.string().min(2, {
    message: "El tipo de madera debe tener al menos 2 caracteres.",
  }),
  costoCompraPorPie: z.coerce.number().positive({
    message: "El costo de compra por pie debe ser un número positivo.",
  }),
  precioMercadoPromedioPorPie: z.coerce.number().positive({
    message: "El precio de mercado promedio por pie debe ser un número positivo.",
  }),
  margenGananciaDeseado: z.coerce.number().min(0).max(1, { // Represented as a decimal, e.g., 0.2 for 20%
    message: "El margen de ganancia debe estar entre 0 (0%) y 1 (100%).",
  }),
});

type AsistenteFormValues = z.infer<typeof asistenteFormSchema>;

export default function AsistentePreciosPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sugerencia, setSugerencia] = useState<SugerirPrecioOutput | null>(null);

  const form = useForm<AsistenteFormValues>({
    resolver: zodResolver(asistenteFormSchema),
    defaultValues: {
      margenGananciaDeseado: 0.2, // Default 20%
    },
  });

  async function onSubmit(data: AsistenteFormValues) {
    setIsLoading(true);
    setSugerencia(null);
    try {
      const inputData: SugerirPrecioInput = {
        ...data,
      };
      const result = await sugerirPrecio(inputData);
      setSugerencia(result);
      toast({
        title: "Sugerencia Generada",
        description: "El asistente ha calculado un precio sugerido.",
      });
    } catch (error) {
      console.error("Error al generar sugerencia:", error);
      toast({
        title: "Error",
        description: "No se pudo generar la sugerencia. Intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Asistente de Precios" description="Obtenga sugerencias de precios de venta basadas en IA." />
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Calcular Precio Sugerido</CardTitle>
            <CardDescription>Ingrese los datos para que el asistente calcule un precio de venta óptimo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="tipoMadera"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Madera</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Pino Oregón" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costoCompraPorPie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Compra por Pie ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ej: 1.80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="precioMercadoPromedioPorPie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio de Mercado Promedio por Pie ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ej: 2.50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="margenGananciaDeseado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Margen de Ganancia Deseado (Ej: 0.2 para 20%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ej: 0.25" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lightbulb className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "Calculando..." : "Obtener Sugerencia"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className={cn(sugerencia || isLoading ? "flex flex-col" : "flex items-center justify-center")}>
          <CardHeader>
            <CardTitle>Sugerencia del Asistente</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            {isLoading && (
              <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Procesando su solicitud...</p>
              </div>
            )}
            {!isLoading && !sugerencia && (
              <div className="text-center text-muted-foreground">
                <Lightbulb className="mx-auto h-12 w-12 mb-4" />
                <p>La sugerencia de precio aparecerá aquí una vez calculada.</p>
              </div>
            )}
            {sugerencia && !isLoading && (
              <div className="w-full text-left space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Precio Sugerido por Pie:</h3>
                  <p className="text-3xl font-bold">${sugerencia.precioSugerido.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Justificación:</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{sugerencia.justificacion}</p>
                </div>
              </div>
            )}
          </CardContent>
           {sugerencia && !isLoading && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Esta es una sugerencia basada en los datos proporcionados. Realice su propio análisis.</p>
            </CardFooter>
           )}
        </Card>
      </div>
    </div>
  );
}
