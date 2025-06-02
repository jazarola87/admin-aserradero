
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { initialConfigData, updateConfigData } from "@/lib/config-data";
import type { Configuracion, CostoMaderaMetroCubico } from "@/types";
import React, { useEffect, useMemo } from "react";

const costoMaderaMetroCubicoSchema = z.object({
  tipoMadera: z.string(), // This will be read-only from initialConfigData.preciosMadera
  costoPorMetroCubico: z.coerce.number().nonnegative("El costo debe ser no negativo.").optional(),
});

const costosOperativosFormSchema = z.object({
  precioLitroNafta: z.coerce.number().nonnegative({
    message: "El precio de la nafta no puede ser negativo.",
  }).optional(),
  precioAfiladoSierra: z.coerce.number().nonnegative({
    message: "El precio de afilado no puede ser negativo.",
  }).optional(),
  costosMaderaMetroCubico: z.array(costoMaderaMetroCubicoSchema).optional(),
});

type CostosOperativosFormValues = Pick<Configuracion, 'precioLitroNafta' | 'precioAfiladoSierra' | 'costosMaderaMetroCubico'>;

export default function CostosOperativosPage() {
  const { toast } = useToast();

  const defaultCostosMadera = useMemo(() => {
    const preciosMaderaTipos = initialConfigData.preciosMadera.map(pm => pm.tipoMadera);
    const existingCostosMap = new Map(initialConfigData.costosMaderaMetroCubico?.map(c => [c.tipoMadera, c.costoPorMetroCubico]));

    return preciosMaderaTipos.map(tipo => ({
      tipoMadera: tipo,
      costoPorMetroCubico: existingCostosMap.get(tipo) ?? undefined, // Use undefined for empty
    }));
  }, []);


  const form = useForm<CostosOperativosFormValues>({
    resolver: zodResolver(costosOperativosFormSchema),
    defaultValues: {
      precioLitroNafta: initialConfigData.precioLitroNafta ?? undefined,
      precioAfiladoSierra: initialConfigData.precioAfiladoSierra ?? undefined,
      costosMaderaMetroCubico: defaultCostosMadera,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "costosMaderaMetroCubico",
  });
  
  useEffect(() => {
    const updatedDefaultCostos = initialConfigData.preciosMadera.map(pm => {
        const existing = initialConfigData.costosMaderaMetroCubico?.find(c => c.tipoMadera === pm.tipoMadera);
        return {
            tipoMadera: pm.tipoMadera,
            costoPorMetroCubico: existing?.costoPorMetroCubico ?? undefined,
        };
    });

    form.reset({
        precioLitroNafta: initialConfigData.precioLitroNafta ?? undefined,
        precioAfiladoSierra: initialConfigData.precioAfiladoSierra ?? undefined,
        costosMaderaMetroCubico: updatedDefaultCostos,
    });
  }, [initialConfigData.preciosMadera, initialConfigData.costosMaderaMetroCubico, form]);


  function onSubmit(data: CostosOperativosFormValues) {
    const updatePayload: Partial<Configuracion> = {
        ...data,
        costosMaderaMetroCubico: (data.costosMaderaMetroCubico || []).map(c => ({
            ...c,
            costoPorMetroCubico: c.costoPorMetroCubico === undefined || isNaN(Number(c.costoPorMetroCubico)) ? 0 : Number(c.costoPorMetroCubico)
        }))
    };
    updateConfigData(updatePayload);
    toast({
      title: "Costos Operativos Guardados",
      description: "Los cambios en los costos operativos han sido guardados exitosamente.",
    });
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle
        title="Gestión de Costos Operativos"
        description="Defina los costos asociados al aserrío y el costo base de los diferentes tipos de madera."
      />
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Costos Operativos del Aserradero</CardTitle>
          <CardDescription>
            Ingrese los costos de insumos y el costo por metro cúbico de cada tipo de madera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-lg font-medium">Costos de Aserrío</h3>
                <FormField
                  control={form.control}
                  name="precioLitroNafta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Litro de Nafta ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ej: 1.50" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="precioAfiladoSierra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Afilado de Sierra ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ej: 10.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="text-lg font-medium">Costo de Madera por Metro Cúbico</h3>
                {fields.length === 0 && <p className="text-sm text-muted-foreground">No hay tipos de madera definidos en "Precios de Venta" para asignarles un costo. Por favor, defina primero los tipos de madera en esa sección.</p>}
                {fields.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-md">
                    <FormItem className="flex-1">
                      <FormLabel htmlFor={`costosMaderaMetroCubico.${index}.tipoMadera`}>Tipo de Madera</FormLabel>
                      <Input
                        id={`costosMaderaMetroCubico.${index}.tipoMadera`}
                        value={item.tipoMadera} 
                        readOnly
                        className="bg-muted/50 border-none"
                      />
                    </FormItem>
                    <FormField
                      control={form.control}
                      name={`costosMaderaMetroCubico.${index}.costoPorMetroCubico`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Costo / m³ ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ej: 120.00" {...field} value={field.value ?? ""}  onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                 {form.formState.errors.costosMaderaMetroCubico && form.formState.errors.costosMaderaMetroCubico.message && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.costosMaderaMetroCubico.message}</p>
                 )}
              </section>

              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? "Guardando..." : "Guardar Costos Operativos"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

