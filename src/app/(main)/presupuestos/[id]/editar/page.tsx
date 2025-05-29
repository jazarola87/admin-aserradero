
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
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initialConfigData } from "@/lib/config-data"; 
import type { Presupuesto, PresupuestoDetalle } from "@/types";
import { useRouter, useParams } from "next/navigation";

const PRESUPUESTOS_STORAGE_KEY = 'presupuestosList';
const initialDetallesCount = 15; 

const itemDetalleSchema = z.object({
  tipoMadera: z.string().min(1, "Debe seleccionar un tipo.").optional().or(z.literal("")),
  unidades: z.coerce.number().int().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()),
  ancho: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()), 
  alto: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()), 
  largo: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()), 
  precioPorPie: z.coerce.number().nonnegative({ message: "Debe ser >= 0" }).optional().or(z.literal(0)).or(z.nan()),
  cepillado: z.boolean().default(false).optional(),
});

const presupuestoFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  nombreCliente: z.string().min(2, "Mínimo 2 caracteres."),
  telefonoCliente: z.string().optional(),
  detalles: z.array(itemDetalleSchema)
    .min(1, "Debe agregar al menos un detalle.")
    .refine(
      (arr) => arr.some(d => d.tipoMadera && d.tipoMadera.length > 0 && d.unidades && d.unidades > 0 && typeof d.precioPorPie === 'number'),
      {
        message: "Debe ingresar al menos un artículo válido en los detalles (con tipo de madera, unidades y precio por pie).",
      }
    ),
});

type PresupuestoFormValues = z.infer<typeof presupuestoFormSchema>;

const createEmptyDetalle = (): z.infer<typeof itemDetalleSchema> => ({
  tipoMadera: undefined,
  unidades: undefined,
  ancho: undefined,
  alto: undefined,
  largo: undefined,
  precioPorPie: undefined,
  cepillado: false,
});


export default function EditarPresupuestoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const presupuestoId = params.id as string;
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<PresupuestoFormValues>({
    resolver: zodResolver(presupuestoFormSchema),
    defaultValues: {
      fecha: new Date(), 
      nombreCliente: "",
      telefonoCliente: "",
      detalles: Array(initialDetallesCount).fill(null).map(() => createEmptyDetalle()),
    },
  });

   useEffect(() => {
    if (presupuestoId && typeof window !== 'undefined') {
        setIsLoadingData(true);
        const storedPresupuestos = localStorage.getItem(PRESUPUESTOS_STORAGE_KEY);
        const presupuestosActuales: Presupuesto[] = storedPresupuestos ? JSON.parse(storedPresupuestos) : [];
        const presupuestoAEditar = presupuestosActuales.find(p => p.id === presupuestoId);

        if (presupuestoAEditar) {
            const detallesParaForm = Array(Math.max(initialDetallesCount, presupuestoAEditar.detalles.length)).fill(null).map(() => createEmptyDetalle());
            
            presupuestoAEditar.detalles.forEach((detalle, index) => {
                if (index < detallesParaForm.length) {
                    detallesParaForm[index] = {
                        tipoMadera: detalle.tipoMadera,
                        unidades: detalle.unidades,
                        ancho: detalle.ancho,
                        alto: detalle.alto,
                        largo: detalle.largo,
                        precioPorPie: detalle.precioPorPie,
                        cepillado: detalle.cepillado ?? false,
                    };
                }
            });
            
            form.reset({
                fecha: presupuestoAEditar.fecha ? parseISO(presupuestoAEditar.fecha) : new Date(),
                nombreCliente: presupuestoAEditar.nombreCliente,
                telefonoCliente: presupuestoAEditar.telefonoCliente || "",
                detalles: detallesParaForm,
            });
            form.trigger();

        } else {
            toast({
              title: "Error",
              description: "Presupuesto no encontrado para editar.",
              variant: "destructive",
            });
            router.push('/presupuestos');
        }
        setIsLoadingData(false);
    }
  }, [presupuestoId, form, router, toast]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  const watchedDetalles = form.watch("detalles");

  const calcularPiesTablares = (detalle: Partial<z.infer<typeof itemDetalleSchema>>) => {
    const unidades = Number(detalle.unidades) || 0;
    const alto = Number(detalle.alto) || 0; 
    const ancho = Number(detalle.ancho) || 0; 
    const largo = Number(detalle.largo) || 0; 
  
    if (!unidades || !alto || !ancho || !largo) return 0;
    return unidades * alto * ancho * largo * 0.2734;
  };
  
  const calcularSubtotal = (detalle: Partial<z.infer<typeof itemDetalleSchema>>, piesTablares: number) => {
    const precioPorPie = Number(detalle.precioPorPie) || 0;
    if (!precioPorPie && piesTablares > 0 && (detalle.tipoMadera && detalle.tipoMadera.length > 0)) return 0;
    if (piesTablares === 0) return 0;

    let subtotal = piesTablares * precioPorPie;
    if (detalle.cepillado) {
      subtotal += piesTablares * (initialConfigData.precioCepilladoPorPie || 0);
    }
    return subtotal;
  };
  
  const totalGeneralPresupuesto = watchedDetalles.reduce((acc, detalle) => {
    if (detalle && detalle.tipoMadera && detalle.tipoMadera.length > 0 && Number(detalle.unidades) > 0 && typeof Number(detalle.precioPorPie) === 'number') { 
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

  function onSubmit(data: PresupuestoFormValues) {
    if(!presupuestoId) return;

    const processedDetalles = data.detalles.filter(
      d_form => d_form.tipoMadera && d_form.tipoMadera.length > 0 && Number(d_form.unidades) > 0 && typeof Number(d_form.precioPorPie) === 'number'
    ).map((d_form, index) => {
      const d = d_form as Required<Omit<PresupuestoDetalle, 'id' | 'piesTablares' | 'subTotal' | 'valorUnitario'>>;
      const pies = calcularPiesTablares(d);
      const sub = calcularSubtotal(d, pies);
      const valorUnit = (Number(d.unidades) > 0 && sub > 0) ? sub / Number(d.unidades) : 0;
      return { 
        ...d, 
        unidades: Number(d.unidades),
        ancho: Number(d.ancho),
        alto: Number(d.alto),
        largo: Number(d.largo),
        precioPorPie: Number(d.precioPorPie),
        piesTablares: pies, 
        subTotal: sub, 
        valorUnitario: valorUnit, 
        id: `pd-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}` 
      } as PresupuestoDetalle;
    });

    if (processedDetalles.length === 0) {
      toast({
        title: "Error en el Presupuesto",
        description: "No hay artículos válidos para guardar. Asegúrese de completar tipo de madera, unidades y precio.",
        variant: "destructive",
      });
      return;
    }

    const presupuestoActualizado: Presupuesto = {
      ...data,
      id: presupuestoId, 
      fecha: format(data.fecha, "yyyy-MM-dd"), 
      detalles: processedDetalles,
      totalPresupuesto: processedDetalles.reduce((sum, item) => sum + (item.subTotal || 0), 0)
    };

    if (typeof window !== 'undefined') {
      const storedPresupuestos = localStorage.getItem(PRESUPUESTOS_STORAGE_KEY);
      let presupuestosActuales: Presupuesto[] = storedPresupuestos ? JSON.parse(storedPresupuestos) : [];
      const index = presupuestosActuales.findIndex(p => p.id === presupuestoId);
      if (index !== -1) {
        presupuestosActuales[index] = presupuestoActualizado;
      } else {
        presupuestosActuales.push(presupuestoActualizado); 
      }
      presupuestosActuales.sort((a, b) => b.fecha.localeCompare(a.fecha)); // Sort newest first
      localStorage.setItem(PRESUPUESTOS_STORAGE_KEY, JSON.stringify(presupuestosActuales));
    }
    
    toast({
      title: "Presupuesto Actualizado",
      description: `Se ha actualizado el presupuesto para ${data.nombreCliente}.`,
    });
    router.push('/presupuestos');
  }

  const isRowEffectivelyEmpty = (detalle: Partial<z.infer<typeof itemDetalleSchema>>) => {
    if (!detalle) return true;
    return !detalle.tipoMadera && !detalle.unidades && !detalle.alto && !detalle.ancho && !detalle.largo && typeof detalle.precioPorPie !== 'number' && !detalle.cepillado;
  };

  if (isLoadingData) {
    return <div className="container mx-auto py-6 flex justify-center items-center min-h-[calc(100vh-200px)]"><p>Cargando datos del presupuesto...</p></div>;
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Editar Presupuesto" description="Modifique los detalles del presupuesto existente." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Información del Cliente y Fecha</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha del Presupuesto</FormLabel>
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
              <FormField control={form.control} name="nombreCliente" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Cliente</FormLabel>
                    <FormControl><Input placeholder="Nombre completo del cliente" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="telefonoCliente" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Número de teléfono" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalles del Presupuesto</CardTitle>
              <CardDescription>Modifique los productos a presupuestar.</CardDescription>
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
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 3.05" {...f} value={f.value === 0 ? "" : f.value || ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
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
                            {!isEffectivelyEmpty && (
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
                Total General: <span className="text-primary">${totalGeneralPresupuesto.toFixed(2)}</span>
              </div>
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
