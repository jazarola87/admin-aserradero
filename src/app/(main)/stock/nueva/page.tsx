"use client";

import React, { useEffect, useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, PlusCircle, Save, Trash2, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAppConfig } from "@/lib/firebase/services/configuracionService";
import type { VentaDetalle as VentaDetalleType, StockMaderaAserrada, Configuracion } from "@/types";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { addStockEntry } from "@/lib/firebase/services/stockService";

const stockDetalleSchema = z.object({
  tipoMadera: z.string().optional(),
  unidades: z.coerce.number().int().positive({ message: "Debe ser > 0" }).optional(),
  ancho: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(),
  alto: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(),
  largo: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(),
  cepillado: z.boolean().default(false).optional(),
});

const stockFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  notas: z.string().optional(),
  detalles: z.array(stockDetalleSchema)
    .min(1, "Debe agregar al menos un detalle de producción.")
    .refine(
      (detalles) => detalles.some(d => 
        d.tipoMadera && d.tipoMadera.length > 0 &&
        d.unidades && d.unidades > 0 &&
        d.alto && d.alto > 0 &&
        d.ancho && d.ancho > 0 &&
        d.largo && d.largo > 0
      ),
      {
        message: "Debe completar al menos una fila de producto con todos sus campos (Tipo, Unidades, Dimensiones).",
      }
    ),
});

type StockFormValues = z.infer<typeof stockFormSchema>;

const createEmptyDetalle = (): Partial<z.infer<typeof stockDetalleSchema>> => ({
  tipoMadera: undefined,
  unidades: undefined,
  ancho: undefined,
  alto: undefined,
  largo: undefined,
  cepillado: false,
});

const initialDetallesCount = 15;

const calculateTotals = (detalles: StockFormValues['detalles'], config: Configuracion | null) => {
    if (!config) {
        return { totalPiesTablares: 0, costoAserrio: 0 };
    }

    const piesTablaresPorDetalle = (detalle: Partial<z.infer<typeof stockDetalleSchema>>): number => {
        const unidades = Number(detalle?.unidades) || 0;
        const alto = Number(detalle?.alto) || 0;
        const ancho = Number(detalle?.ancho) || 0;
        const largo = Number(detalle?.largo) || 0;
        if (!unidades || !alto || !ancho || !largo) return 0;
        return unidades * alto * ancho * largo * 0.2734;
    };

    let totalPiesTablares = 0;

    for (const detalle of detalles) {
        if (!detalle.tipoMadera || !detalle.unidades || !detalle.alto || !detalle.ancho || !detalle.largo) {
            continue;
        }
        totalPiesTablares += piesTablaresPorDetalle(detalle);
    }

    const precioNafta = Number(config.precioLitroNafta) || 0;
    const precioAfilado = Number(config.precioAfiladoSierra) || 0;
    const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
    const costoAjustado = costoOperativoBase * 1.38;
    const costoPorPieAserrio = (costoAjustado > 0 && isFinite(costoAjustado)) ? costoAjustado / 600 : 0;
    const costoAserrio = totalPiesTablares * costoPorPieAserrio;

    return { totalPiesTablares, costoAserrio };
};

export default function NuevoIngresoStockPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      fecha: new Date(),
      notas: "",
      detalles: Array(initialDetallesCount).fill(null).map(() => createEmptyDetalle()),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "detalles",
  });
  
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const appConfig = await getAppConfig();
        setConfig(appConfig);
      } catch (error) {
         console.error("Error al cargar configuración inicial:", error);
          toast({
            title: "Error al Cargar Configuración",
            description: "No se pudieron cargar los datos de configuración. " + (error instanceof Error ? error.message : ""),
            variant: "destructive",
          });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [toast]);

  const watchedDetalles = form.watch("detalles");

  const totals = calculateTotals(watchedDetalles, config);

  const handleTipoMaderaChange = (value: string, index: number) => {
    form.setValue(`detalles.${index}.tipoMadera`, value, { shouldValidate: true, shouldDirty: true });
    form.trigger(`detalles.${index}`);
  };

  const calcularPiesTablares = (detalle: Partial<z.infer<typeof stockDetalleSchema>>): number => {
    const unidades = Number(detalle?.unidades) || 0;
    const alto = Number(detalle?.alto) || 0;
    const ancho = Number(detalle?.ancho) || 0;
    const largo = Number(detalle?.largo) || 0;
    if (!unidades || !alto || !ancho || !largo) return 0;
    return unidades * alto * ancho * largo * 0.2734;
  };

  async function onSubmit(data: StockFormValues) {
    setIsSubmitting(true);
    if (!config) {
      toast({ title: "Error", description: "La configuración de la aplicación no está cargada.", variant: "destructive"});
      setIsSubmitting(false);
      return;
    }
    
    const finalTotals = calculateTotals(data.detalles, config);

    const processedDetalles = (data.detalles || []).filter(
      d => 
        d.tipoMadera && d.tipoMadera.length > 0 &&
        d.unidades && d.unidades > 0 &&
        d.alto && d.alto > 0 &&
        d.ancho && d.ancho > 0 &&
        d.largo && d.largo > 0
    ).map((d_form, idx) => {
      const pies = calcularPiesTablares(d_form);
      return {
        ...d_form,
        unidades: Number(d_form.unidades),
        ancho: Number(d_form.ancho),
        alto: Number(d_form.alto),
        largo: Number(d_form.largo),
        piesTablares: pies,
        id: `sd-${Date.now()}-${idx}`
      } as VentaDetalleType;
    });

    if (processedDetalles.length === 0) {
      toast({
        title: "Error en el Ingreso",
        description: "No hay artículos válidos para registrar.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const nuevoIngresoData: Omit<StockMaderaAserrada, 'id'> = {
      fecha: format(data.fecha, "yyyy-MM-dd"),
      detalles: processedDetalles,
      totalPiesTablares: finalTotals.totalPiesTablares,
      costoAserrioSnapshot: finalTotals.costoAserrio,
      ...(data.notas && { notas: data.notas }),
    };
    
    try {
        await addStockEntry(nuevoIngresoData);
        toast({
          title: "Ingreso a Stock Registrado",
          description: `Se ha registrado la nueva producción en el stock.`,
        });
        router.push('/stock');
    } catch (error) {
       console.error("Error al registrar ingreso a stock: ", error);
       toast({
         title: "Error al Registrar",
         description: "No se pudo registrar el ingreso en Firebase. " + (error instanceof Error ? error.message : "Error desconocido"),
         variant: "destructive",
       });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRowEffectivelyEmpty = (detalle: Partial<z.infer<typeof stockDetalleSchema>>) => {
    if (!detalle) return true;
    return !detalle.tipoMadera && !detalle.unidades && !detalle.alto && !detalle.ancho && !detalle.largo && !detalle.cepillado;
  };

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
      <PageTitle title="Nuevo Ingreso a Stock" description="Registre la producción de nueva madera aserrada para el inventario." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Información de Producción</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Producción</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus locale={es} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ej: Producción del lote de Pinos de la compra X" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Producción</CardTitle>
              <CardDescription>Ingrese los productos de madera aserrada producidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Tipo Madera</TableHead>
                      <TableHead className="min-w-[100px]">Unid.</TableHead>
                      <TableHead className="min-w-[90px]">Alto (pulg)</TableHead>
                      <TableHead className="min-w-[90px]">Ancho (pulg)</TableHead>
                      <TableHead className="min-w-[100px]">Largo (m)</TableHead>
                      <TableHead className="w-[90px] text-center">Cepillado</TableHead>
                      <TableHead className="min-w-[110px] text-right">Pies Tabl.</TableHead>
                      <TableHead className="w-[50px] text-center">Borrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => {
                      const currentDetalle = watchedDetalles[index];
                      const piesTablares = calcularPiesTablares(currentDetalle);
                      const isEffectivelyEmpty = isRowEffectivelyEmpty(currentDetalle);

                      return (
                        <TableRow key={item.id} className={cn(isEffectivelyEmpty && index >= 1 && "opacity-70 hover:opacity-100 focus-within:opacity-100")}>
                          <TableCell className="p-1">
                            <FormField
                              control={form.control}
                              name={`detalles.${index}.tipoMadera`}
                              render={({ field: maderaField }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => handleTipoMaderaChange(value, index)}
                                    value={maderaField.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione tipo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {config?.preciosMadera.map(madera => (
                                        <SelectItem key={madera.tipoMadera} value={madera.tipoMadera}>
                                          {madera.tipoMadera}
                                        </SelectItem>
                                      ))}
                                      {(!config || config.preciosMadera.length === 0) && <SelectItem value="" disabled>No hay tipos definidos</SelectItem>}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-xs px-1" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.unidades`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" placeholder="Cant." {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.alto`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 2" {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.ancho`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 6" {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.largo`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 3.05" {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1 text-center align-middle">
                            <FormField control={form.control} name={`detalles.${index}.cepillado`} render={({ field: f }) => (
                              <FormItem className="flex justify-center items-center h-full"><FormControl><Checkbox checked={f.value} onCheckedChange={f.onChange} /></FormControl></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={piesTablares > 0 ? piesTablares.toFixed(2) : ""} className="bg-muted/50 text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-center align-middle">
                            {(!isRowEffectivelyEmpty(currentDetalle) || fields.length > 1) && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {form.formState.errors.detalles && (
                 <p className="text-sm font-medium text-destructive pt-2">{form.formState.errors.detalles.message || form.formState.errors.detalles.root?.message}</p>
              )}
              <Button type="button" variant="outline" onClick={() => append(createEmptyDetalle())} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Producto
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col items-end gap-1 mt-8 border-t pt-6">
               <div className="w-full max-w-md space-y-1 text-right">
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold">Total Pies Tablares Producidos:</span>
                        <span className="font-semibold text-primary">{totals.totalPiesTablares.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Costo Aserrío Estimado:</span>
                        <span>${totals.costoAserrio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
              <Button type="submit" size="lg" disabled={isSubmitting || isLoading} className="mt-4">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Registrando..." : "Registrar Ingreso a Stock"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
