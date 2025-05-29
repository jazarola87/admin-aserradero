
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
import { CalendarIcon, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import type { Compra } from "@/types";
import { useRouter, useParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initialConfigData } from "@/lib/config-data";

const COMPRAS_STORAGE_KEY = 'comprasList';

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

export default function EditarCompraPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const compraId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);

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

  const watchedVolumen = form.watch("volumen");
  const watchedPrecioPorMetroCubico = form.watch("precioPorMetroCubico");

  useEffect(() => {
    const vol = Number(watchedVolumen) || 0;
    const precioM3 = Number(watchedPrecioPorMetroCubico) || 0;
    const total = vol * precioM3;
    if (form.getValues("costo") !== total) { 
      form.setValue("costo", total, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedVolumen, watchedPrecioPorMetroCubico, form]);

  useEffect(() => {
    if (compraId && typeof window !== 'undefined') {
      const storedCompras = localStorage.getItem(COMPRAS_STORAGE_KEY);
      const comprasActuales: Compra[] = storedCompras ? JSON.parse(storedCompras) : [];
      const compraAEditar = comprasActuales.find(c => c.id === compraId);

      if (compraAEditar) {
        let precioM3Calculado = compraAEditar.precioPorMetroCubico;
        if (precioM3Calculado === undefined && compraAEditar.volumen > 0 && compraAEditar.costo > 0) {
            precioM3Calculado = compraAEditar.costo / compraAEditar.volumen;
        }

        form.reset({
          ...compraAEditar,
          fecha: compraAEditar.fecha ? parseISO(compraAEditar.fecha) : new Date(),
          volumen: compraAEditar.volumen ?? undefined,
          precioPorMetroCubico: precioM3Calculado ?? undefined,
          costo: compraAEditar.costo ?? 0,
          telefonoProveedor: compraAEditar.telefonoProveedor ?? "",
        });
      } else {
        toast({
          title: "Error",
          description: "Compra no encontrada.",
          variant: "destructive",
        });
        router.push('/compras');
      }
      setIsLoading(false);
    }
  }, [compraId, form, router, toast]);

  function onSubmit(data: CompraFormValues) {
    if (!compraId) return;

    const compraActualizada: Compra = {
      ...data,
      id: compraId,
      fecha: format(data.fecha, "yyyy-MM-dd"),
    };

    if (typeof window !== 'undefined') {
      const storedCompras = localStorage.getItem(COMPRAS_STORAGE_KEY);
      let comprasActuales: Compra[] = storedCompras ? JSON.parse(storedCompras) : [];
      const index = comprasActuales.findIndex(c => c.id === compraId);
      if (index !== -1) {
        comprasActuales[index] = compraActualizada;
      } else {
        comprasActuales.push(compraActualizada);
      }
      comprasActuales.sort((a, b) => b.fecha.localeCompare(a.fecha)); // Sort newest first
      localStorage.setItem(COMPRAS_STORAGE_KEY, JSON.stringify(comprasActuales));
    }
    
    toast({
      title: "Compra Actualizada",
      description: `Se ha actualizado la compra de ${data.tipoMadera} de ${data.proveedor}.`,
    });
    router.push('/compras');
  }

  if (isLoading) {
    return <div className="container mx-auto py-6">Cargando datos de la compra...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Editar Compra" description="Modifique los detalles de la adquisición de madera." />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Formulario de Edición de Compra</CardTitle>
          <CardDescription>Modifique los campos necesarios y guarde los cambios.</CardDescription>
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
                            date > new Date() || date < new Date("1900-01-01")
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
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo de madera" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {initialConfigData.preciosMadera.map((madera) => (
                          <SelectItem key={madera.tipoMadera} value={madera.tipoMadera}>
                            {madera.tipoMadera}
                          </SelectItem>
                        ))}
                        {initialConfigData.preciosMadera.length === 0 && <SelectItem value="" disabled>No hay tipos definidos</SelectItem>}
                      </SelectContent>
                    </Select>
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
                      <Input type="number" step="0.01" placeholder="Ej: 15.5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
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
                      <Input type="number" step="0.01" placeholder="Ej: 250.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
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
                       <Input type="number" step="0.01" placeholder="Calculado automáticamente" {...field} readOnly className="bg-muted/50 border-none"/>
                    </FormControl>
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
                      <Input placeholder="Nombre del proveedor" {...field} />
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
                      <Input placeholder="Número de teléfono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
