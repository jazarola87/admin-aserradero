
"use client";

import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { CalendarIcon, PlusCircle, Save, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initialConfigData } from "@/lib/config-data"; 
import type { Presupuesto, VentaDetalle as VentaDetalleType, Venta } from "@/types";

const ventaDetalleSchema = z.object({
  tipoMadera: z.string().min(1, { message: "Debe seleccionar un tipo."}).optional(),
  unidades: z.coerce.number().int().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()),
  ancho: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()),
  alto: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()),
  largo: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()),
  precioPorPie: z.coerce.number().nonnegative({ message: "Debe ser >= 0" }).optional().or(z.literal(0)).or(z.nan()),
  cepillado: z.boolean().default(false).optional(),
});

const ventaFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  nombreComprador: z.string().min(2, "Mínimo 2 caracteres."),
  telefonoComprador: z.string().optional(),
  fechaEntregaEstimada: z.date().optional(),
  sena: z.coerce.number().nonnegative("La seña no puede ser negativa.").optional().or(z.literal(NaN)),
  detalles: z.array(ventaDetalleSchema)
    .min(1, "Debe agregar al menos un detalle de venta.")
    .refine(
      (arr) => arr.some(d => d.tipoMadera && d.tipoMadera.length > 0 && d.unidades && d.unidades > 0 && typeof d.precioPorPie === 'number'),
      {
        message: "Debe ingresar al menos un artículo válido en los detalles (con tipo de madera, unidades y precio por pie).",
      }
    ),
  idOriginalPresupuesto: z.string().optional(),
});

type VentaFormValues = z.infer<typeof ventaFormSchema>;

const createEmptyDetalle = (): Partial<z.infer<typeof ventaDetalleSchema>> => ({
  tipoMadera: undefined,
  unidades: undefined,
  ancho: undefined,
  alto: undefined,
  largo: undefined,
  precioPorPie: undefined,
  cepillado: false,
});

const initialDetallesCount = 15;


export default function NuevaVentaPage() {
  const { toast } = useToast();
  
  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaFormSchema),
    defaultValues: {
      fecha: undefined, 
      nombreComprador: "",
      telefonoComprador: "",
      fechaEntregaEstimada: undefined,
      sena: undefined,
      detalles: Array(initialDetallesCount).fill(null).map(() => createEmptyDetalle()),
      idOriginalPresupuesto: undefined,
    },
  });

 useEffect(() => {
    const presupuestoParaVentaString = localStorage.getItem('presupuestoParaVenta');
    if (presupuestoParaVentaString) {
      try {
        const presupuesto: Presupuesto = JSON.parse(presupuestoParaVentaString);
        
        // Reset top-level fields first
        form.reset({
          fecha: new Date(), // Set fecha to current date when converting from budget
          nombreComprador: presupuesto.nombreCliente,
          telefonoComprador: presupuesto.telefonoCliente || "",
          idOriginalPresupuesto: presupuesto.id,
          fechaEntregaEstimada: undefined, 
          sena: undefined,
          // Initialize details with empty structure, matching the length requirements
          detalles: Array(Math.max(initialDetallesCount, presupuesto.detalles.length)).fill(null).map(() => createEmptyDetalle()),
        });

        // Explicitly set values for each detail item using form.setValue
        presupuesto.detalles.forEach((d_presupuesto_item, index) => {
          form.setValue(`detalles.${index}.tipoMadera`, d_presupuesto_item.tipoMadera, { shouldDirty: true });
          form.setValue(`detalles.${index}.unidades`, d_presupuesto_item.unidades, { shouldDirty: true });
          form.setValue(`detalles.${index}.ancho`, d_presupuesto_item.ancho, { shouldDirty: true });
          form.setValue(`detalles.${index}.alto`, d_presupuesto_item.alto, { shouldDirty: true });
          form.setValue(`detalles.${index}.largo`, d_presupuesto_item.largo, { shouldDirty: true });
          form.setValue(`detalles.${index}.precioPorPie`, d_presupuesto_item.precioPorPie, { shouldDirty: true });
          form.setValue(`detalles.${index}.cepillado`, d_presupuesto_item.cepillado ?? false, { shouldDirty: true });
        });
        
        // If presupuesto has fewer items than initialDetallesCount, reset remaining items
        if (presupuesto.detalles.length < initialDetallesCount) {
            for (let i = presupuesto.detalles.length; i < initialDetallesCount; i++) {
                const emptyDetail = createEmptyDetalle();
                form.setValue(`detalles.${i}.tipoMadera`, emptyDetail.tipoMadera, { shouldDirty: true });
                form.setValue(`detalles.${i}.unidades`, emptyDetail.unidades, { shouldDirty: true });
                form.setValue(`detalles.${i}.ancho`, emptyDetail.ancho, { shouldDirty: true });
                form.setValue(`detalles.${i}.alto`, emptyDetail.alto, { shouldDirty: true });
                form.setValue(`detalles.${i}.largo`, emptyDetail.largo, { shouldDirty: true });
                form.setValue(`detalles.${i}.precioPorPie`, emptyDetail.precioPorPie, { shouldDirty: true });
                form.setValue(`detalles.${i}.cepillado`, emptyDetail.cepillado, { shouldDirty: true });
            }
        }
        
        form.trigger(); 
        
        toast({
          title: "Presupuesto Cargado para Venta",
          description: `Datos del presupuesto para ${presupuesto.nombreCliente} cargados. Fecha actualizada al día de hoy.`,
        });
      } catch (error) {
        console.error("Error parsing presupuesto from localStorage or setting form values", error);
        toast({
          title: "Error al Cargar Presupuesto",
          description: "No se pudieron cargar los datos del presupuesto. Por favor, ingréselos manualmente.",
          variant: "destructive",
        });
        if (!form.getValues('fecha')) { 
          form.setValue('fecha', new Date());
        }
      } finally {
        localStorage.removeItem('presupuestoParaVenta');
      }
    } else if (!form.getValues('fecha')) { 
      form.setValue('fecha', new Date());
    }
  }, [form, toast]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  const watchedDetalles = form.watch("detalles");

  const calcularPiesTablares = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>) => {
    if (!detalle || !detalle.alto || !detalle.ancho || !detalle.largo || !detalle.unidades) return 0;
    return (detalle.alto * detalle.ancho * detalle.largo * detalle.unidades) / 12;
  };

  const calcularSubtotal = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>, piesTablares: number) => {
    if (!detalle || typeof detalle.precioPorPie !== 'number') return 0;
    let subtotal = piesTablares * detalle.precioPorPie;
    if (detalle.cepillado) {
      subtotal += piesTablares * initialConfigData.precioCepilladoPorPie;
    }
    return subtotal;
  };
  
  const totalVentaGeneral = watchedDetalles.reduce((acc, detalle) => {
    if (detalle && detalle.tipoMadera && detalle.unidades && detalle.unidades > 0 && typeof detalle.precioPorPie === 'number') { 
      const pies = calcularPiesTablares(detalle);
      return acc + calcularSubtotal(detalle, pies);
    }
    return acc;
  }, 0);

  const handleTipoMaderaChange = (value: string, index: number) => {
    form.setValue(`detalles.${index}.tipoMadera`, value, { shouldValidate: true });
    const maderaSeleccionada = initialConfigData.preciosMadera.find(m => m.tipoMadera === value);
    if (maderaSeleccionada) {
      form.setValue(`detalles.${index}.precioPorPie`, maderaSeleccionada.precioPorPie, { shouldValidate: true });
    } else {
      form.setValue(`detalles.${index}.precioPorPie`, undefined, { shouldValidate: true });
    }
  };

  function onSubmit(data: VentaFormValues) {
    const processedDetalles = data.detalles.filter(
      d_form => d_form.tipoMadera && d_form.tipoMadera.length > 0 && d_form.unidades && d_form.unidades > 0 && typeof d_form.precioPorPie === 'number'
    ).map((d_form, idx) => {
      const d = d_form as Required<VentaDetalleType>; 
      const pies = calcularPiesTablares(d);
      const sub = calcularSubtotal(d, pies);
      const valorUnit = (d.unidades && d.unidades > 0 && sub > 0) ? sub / d.unidades : 0;
      return { ...d, piesTablares: pies, subTotal: sub, valorUnitario: valorUnit, id: `vd-${Date.now()}-${idx}` } as VentaDetalleType;
    });

    if (processedDetalles.length === 0) {
      toast({
        title: "Error en la Venta",
        description: "No hay artículos válidos para registrar. Asegúrese de completar tipo de madera, unidades y precio.",
        variant: "destructive",
      });
      return;
    }

    const nuevaVenta: Venta = {
      id: `venta-${Date.now()}`,
      fecha: format(data.fecha, "yyyy-MM-dd"),
      nombreComprador: data.nombreComprador,
      telefonoComprador: data.telefonoComprador,
      fechaEntregaEstimada: data.fechaEntregaEstimada ? format(data.fechaEntregaEstimada, "yyyy-MM-dd") : undefined,
      sena: data.sena,
      detalles: processedDetalles,
      totalVenta: processedDetalles.reduce((sum, item) => sum + (item.subTotal || 0), 0),
      idOriginalPresupuesto: data.idOriginalPresupuesto,
    };

    if (typeof window !== 'undefined') {
        const storedVentas = localStorage.getItem('ventasList');
        const ventasActuales: Venta[] = storedVentas ? JSON.parse(storedVentas) : [];
        ventasActuales.push(nuevaVenta);
        localStorage.setItem('ventasList', JSON.stringify(ventasActuales));
    }
    
    toast({
      title: "Venta Registrada",
      description: `Se ha registrado la venta a ${data.nombreComprador}. Total: $${nuevaVenta.totalVenta?.toFixed(2)}`,
    });

    if (data.idOriginalPresupuesto) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('budgetToDeleteId', data.idOriginalPresupuesto);
      }
    }
    
    form.reset({
      fecha: new Date(), 
      nombreComprador: "",
      telefonoComprador: "",
      fechaEntregaEstimada: undefined,
      sena: undefined,
      detalles: Array(initialDetallesCount).fill(null).map(() => createEmptyDetalle()),
      idOriginalPresupuesto: undefined,
    });
  }

  const isRowEffectivelyEmpty = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>) => {
    if (!detalle) return true;
    return !detalle.tipoMadera && !detalle.unidades && !detalle.alto && !detalle.ancho && !detalle.largo && typeof detalle.precioPorPie !== 'number' && !detalle.cepillado;
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Ingresar Nueva Venta" description="Registre los detalles de una nueva venta de madera." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Información del Comprador y Venta</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Venta</FormLabel>
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
              <FormField control={form.control} name="nombreComprador" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Comprador</FormLabel>
                    <FormControl><Input placeholder="Nombre completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="telefonoComprador" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Número de teléfono" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="fechaEntregaEstimada"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Entrega Estimada (Opcional)</FormLabel>
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
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sena"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seña ($) (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 50.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Venta</CardTitle>
              <CardDescription>Ingrese los productos vendidos. Las filas con tipo de madera, unidades y precio se considerarán válidas.</CardDescription>
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
                      <TableHead className="min-w-[90px]">Largo (pies)</TableHead>
                      <TableHead className="min-w-[120px]">Precio/Pie ($)</TableHead>
                      <TableHead className="w-[90px] text-center">Cepillado</TableHead>
                      <TableHead className="min-w-[110px] text-right">Pies Tabl.</TableHead>
                      <TableHead className="min-w-[120px] text-right">Valor Unit. ($)</TableHead>
                      <TableHead className="min-w-[120px] text-right">Subtotal ($)</TableHead>
                      <TableHead className="w-[50px] text-center">Borrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => {
                      const currentDetalle = watchedDetalles[index];
                      const piesTablares = calcularPiesTablares(currentDetalle);
                      const subTotal = calcularSubtotal(currentDetalle, piesTablares);
                      const valorUnitario = (currentDetalle?.unidades && currentDetalle.unidades > 0 && subTotal > 0) ? subTotal / currentDetalle.unidades : 0;
                      const isEffectivelyEmpty = isRowEffectivelyEmpty(currentDetalle);

                      return (
                        <TableRow key={item.id} className={cn(isEffectivelyEmpty && index >= 1 && "opacity-70 hover:opacity-100 focus-within:opacity-100")}>
                          <TableCell className="p-1">
                            <FormField
                              control={form.control}
                              name={`detalles.${index}.tipoMadera`}
                              key={`${item.id}-tipoMadera`}
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
                                      {initialConfigData.preciosMadera.map(madera => (
                                        <SelectItem key={madera.tipoMadera} value={madera.tipoMadera}>
                                          {madera.tipoMadera}
                                        </SelectItem>
                                      ))}
                                      {initialConfigData.preciosMadera.length === 0 && <SelectItem value="" disabled>No hay tipos definidos</SelectItem>}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-xs px-1" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.unidades`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" placeholder="Cant." {...f} value={f.value === 0 ? "" : f.value || ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.alto`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 2" {...f} value={f.value === 0 ? "" : f.value || ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.ancho`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 6" {...f} value={f.value === 0 ? "" : f.value || ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.largo`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.1" placeholder="Ej: 8" {...f} value={f.value === 0 ? "" : f.value || ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.precioPorPie`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 2.50" {...f} value={f.value === 0 ? "" : f.value || ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
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
                           <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={valorUnitario > 0 ? valorUnitario.toFixed(2) : ""} className="bg-muted/50 text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={subTotal > 0 ? subTotal.toFixed(2) : ""} className="bg-muted/50 font-semibold text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-center align-middle">
                            {(!isEffectivelyEmpty || fields.length > 1) && ( 
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
            <CardFooter className="flex flex-col items-end gap-4 mt-8">
              <div className="text-xl font-semibold">
                Total General: <span className="text-primary">${totalVentaGeneral.toFixed(2)}</span>
              </div>
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Registrando..." : "Registrar Venta"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

    
