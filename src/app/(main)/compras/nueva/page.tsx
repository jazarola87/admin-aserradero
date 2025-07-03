"use client";

import React, { useEffect, useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Save, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import type { Compra, Configuracion } from "@/types";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addCompra } from "@/lib/firebase/services/comprasService";
import { getAppConfig } from "@/lib/firebase/services/configuracionService";

const compraFormSchema = z.object({
  fecha: z.date({
    required_error: "La fecha de compra es obligatoria.",
  }),
  tipoMadera: z.string().min(1, {
    message: "Debe seleccionar un tipo de madera.",
  }),
  volumen: z.coerce.number().positive({
    message: "El volumen debe ser un número positivo.",
  }),
  precioPorMetroCubico: z.coerce.number().positive({
    message: "El precio por m³ debe ser un número positivo.",
  }),
  costo: z.coerce.number().nonnegative({
    message: "El costo total no puede ser negativo."
  }),
  proveedor: z.string().min(2, {
    message: "El nombre del proveedor debe tener al menos 2 caracteres.",
  }),
  telefonoProveedor: z.string().optional(),
});

type CompraFormValues = z.infer<typeof compraFormSchema>;

export default function NuevaCompraPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<Configuracion | null>(null);

  const form = useForm<CompraFormValues>({
    resolver: zodResolver(compraFormSchema),
    defaultValues: {
      fecha: new Date(),
      tipoMadera: "",
      proveedor: "",
      telefonoProveedor: "",
      volumen: undefined,
      precioPorMetroCubico: undefined,
      costo: 0,
    },
  });

  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      try {
        const appConfig = await getAppConfig();
        setConfig(appConfig);
      } catch (error) {
         toast({
           title: "Error al Cargar Configuración",
           description: "No se pudieron obtener los tipos de madera. Intente recargar la página.",
           variant: "destructive",
         });
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, [toast]);

  const watchedVolumen = form.watch("volumen");
  const watchedPrecioPorMetroCubico = form.watch("precioPorMetroCubico");

  useEffect(() => {
    const vol = Number(watchedVolumen) || 0;
    const precioM3 = Number(watchedPrecioPorMetroCubico) || 0;
    const total = vol * precioM3;
    form.setValue("costo", total, { shouldValidate: true, shouldDirty: true });
  }, [watchedVolumen, watchedPrecioPorMetroCubico, form]);

  async function onSubmit(data: CompraFormValues) {
    setIsSubmitting(true);
    
    const compraParaGuardar: Omit<Compra, 'id'> = {
      ...data,
      fecha: format(data.fecha, "yyyy-MM-dd"),
    };

    try {
      await addCompra(compraParaGuardar);
      toast({
        title: "Compra Registrada en Firebase",
        description: `Se ha registrado la compra de ${data.tipoMadera} de ${data.proveedor}.`,
        variant: "default"
      });
      router.push('/compras');
    } catch (error) {
      console.error("Error al registrar compra en Firebase: ", error);
      toast({
        title: "Error al Registrar Compra",
        description: "No se pudo registrar la compra en Firebase. " + (error instanceof Error ? error.message : "Error desconocido"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="mr-2 h-12 w-12 animate-spin text-primary" />
        <p>Cargando configuración...</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Ingresar Nueva Compra" description="Registre los detalles de una nueva adquisición de madera." />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Formulario de Compra</CardTitle>
          <CardDescription>Complete todos los campos para registrar la compra en Firebase.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Compra</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccione una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01") || isSubmitting
                          }
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoMadera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Madera</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isSubmitting || isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo de madera" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {config?.preciosMadera.map((madera) => (
                          <SelectItem key={madera.tipoMadera} value={madera.tipoMadera}>
                            {madera.tipoMadera}
                          </SelectItem>
                        ))}
                         {(!config || config.preciosMadera.length === 0) && <SelectItem value="" disabled>No hay tipos definidos</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormDescription>Especifique el tipo de madera adquirida.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="volumen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volumen (m³)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 15.5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>Cantidad de madera en metros cúbicos.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="precioPorMetroCubico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio por Metro Cúbico ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 250.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>Costo de la madera por cada metro cúbico.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="costo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Total Calculado ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Calculado automáticamente" {...field} readOnly className="bg-muted/50 border-none" disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>Costo total de la compra (volumen x precio/m³).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="proveedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefonoProveedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono del Proveedor (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de teléfono" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || isLoading}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSubmitting ? "Registrando..." : "Registrar Compra"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
