
"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, PlusCircle, Save, Trash2, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAppConfig } from "@/lib/firebase/services/configuracionService"; 
import { addPresupuesto } from "@/lib/firebase/services/presupuestosService";
import type { Presupuesto, PresupuestoDetalle, Configuracion } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";

const itemDetalleSchema = z.object({
  tipoMadera: z.string().optional(),
  unidades: z.coerce.number().int().positive({ message: "Debe ser > 0" }).optional(),
  ancho: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(), 
  alto: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(), 
  largo: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(), 
  precioPorPie: z.coerce.number().nonnegative({ message: "Debe ser >= 0" }).optional(),
  cepillado: z.boolean().default(false).optional(),
});

const presupuestoFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  nombreCliente: z.string().min(2, "Mínimo 2 caracteres."),
  telefonoCliente: z.string().optional(),
  detalles: z.array(itemDetalleSchema)
    .min(1, "Debe agregar al menos un detalle.")
    .refine(
      (detalles) => detalles.some(d => 
        d.tipoMadera && d.tipoMadera.length > 0 &&
        d.unidades && d.unidades > 0 &&
        d.alto && d.alto > 0 &&
        d.ancho && d.ancho > 0 &&
        d.largo && d.largo > 0 &&
        d.precioPorPie !== undefined && !isNaN(d.precioPorPie)
      ),
      {
        message: "Debe completar al menos una fila de producto con todos sus campos (Tipo, Unidades, Dimensiones).",
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

const initialDetallesCount = 15;


export default function NuevoPresupuestoPage() {
  const { toast } = useToast();
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PresupuestoFormValues>({
    resolver: zodResolver(presupuestoFormSchema),
    // Default values will be set inside useEffect based on query params
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

        const initialDetails: Partial<z.infer<typeof itemDetalleSchema>>[] = [];
        let prefilledRows = 0;

        const cliente = searchParams.get('cliente') || '';
        const telefono = searchParams.get('telefono') || '';

        if (appConfig?.preciosMadera) {
          const preciosMap = new Map(appConfig.preciosMadera.map(p => [p.tipoMadera, p.precioPorPie]));

          for (const [tipoMadera, countStr] of searchParams.entries()) {
            if (tipoMadera === 'cliente' || tipoMadera === 'telefono') continue;

            const count = parseInt(countStr, 10);
            if (!isNaN(count) && count > 0 && preciosMap.has(tipoMadera)) {
              for (let i = 0; i < count; i++) {
                initialDetails.push({
                  tipoMadera: tipoMadera,
                  precioPorPie: preciosMap.get(tipoMadera),
                  unidades: undefined,
                  ancho: undefined,
                  alto: undefined,
                  largo: undefined,
                  cepillado: false,
                });
              }
              prefilledRows += count;
            }
          }
        }

        const emptyRowsToAdd = Math.max(0, initialDetallesCount - prefilledRows);
        for (let i = 0; i < emptyRowsToAdd; i++) {
          initialDetails.push(createEmptyDetalle());
        }
        
        form.reset({
          fecha: new Date(),
          nombreCliente: cliente,
          telefonoCliente: telefono,
          detalles: initialDetails,
        });

      } catch (error) {
        toast({
          title: "Error al Cargar Configuración",
          description: "No se pudieron obtener los tipos de madera y precios. " + (error instanceof Error ? error.message : ""),
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [searchParams, form, toast]);


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
    if (piesTablares === 0) return 0;

    let subtotal = piesTablares * precioPorPie;
    if (detalle.cepillado && config) {
      subtotal += piesTablares * (config.precioCepilladoPorPie || 0);
    }
    return subtotal;
  };
  
  const totalGeneralPresupuesto = useMemo(() => {
    if (!watchedDetalles) return 0;
    return watchedDetalles.reduce((acc, detalle) => {
      if (detalle && detalle.tipoMadera && detalle.unidades && detalle.alto && detalle.ancho && detalle.largo && typeof detalle.precioPorPie === 'number') { 
        const pies = calcularPiesTablares(detalle);
        return acc + calcularSubtotal(detalle, pies);
      }
      return acc;
    }, 0);
  }, [watchedDetalles, config]);

  const handleTipoMaderaChange = (value: string, index: number) => {
    form.setValue(`detalles.${index}.tipoMadera`, value, { shouldValidate: true });
    const maderaSeleccionada = config?.preciosMadera.find(m => m.tipoMadera === value);
    if (maderaSeleccionada) {
      form.setValue(`detalles.${index}.precioPorPie`, maderaSeleccionada.precioPorPie, { shouldValidate: true });
    } else {
      form.setValue(`detalles.${index}.precioPorPie`, undefined, { shouldValidate: true });
    }
  };

  const isRowEffectivelyEmpty = (detalle: Partial<z.infer<typeof itemDetalleSchema>>) => {
    if (!detalle) return true;
    return !detalle.tipoMadera && !detalle.unidades && !detalle.alto && !detalle.ancho && !detalle.largo && (detalle.precioPorPie === undefined || isNaN(Number(detalle.precioPorPie))) && !detalle.cepillado;
  };

  async function onSubmit(data: PresupuestoFormValues) {
    setIsSubmitting(true);
    try {
      const processedDetalles = data.detalles
        .filter(d => 
            d.tipoMadera && d.tipoMadera.length > 0 &&
            d.unidades && d.unidades > 0 &&
            d.alto && d.alto > 0 &&
            d.ancho && d.ancho > 0 &&
            d.largo && d.largo > 0 &&
            d.precioPorPie !== undefined && !isNaN(d.precioPorPie)
        )
        .map((d, index) => {
            const pies = calcularPiesTablares(d);
            const sub = calcularSubtotal(d, pies);
            const valorUnit = d.unidades! > 0 && sub > 0 ? sub / d.unidades! : 0;
            
            return {
                id: `pd-new-${Date.now()}-${index}`,
                tipoMadera: d.tipoMadera!,
                unidades: d.unidades!,
                ancho: d.ancho!,
                alto: d.alto!,
                largo: d.largo!,
                precioPorPie: d.precioPorPie!,
                cepillado: d.cepillado ?? false,
                piesTablares: pies,
                subTotal: sub,
                valorUnitario: valorUnit,
            } as PresupuestoDetalle;
        });

      if (processedDetalles.length === 0) {
        toast({
          title: "Formulario Incompleto",
          description: "Debe completar al menos una fila con todos los datos requeridos (tipo, unidades, dimensiones).",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const nuevoPresupuestoData: Omit<Presupuesto, 'id'> = {
        fecha: format(data.fecha, "yyyy-MM-dd"), 
        nombreCliente: data.nombreCliente,
        telefonoCliente: data.telefonoCliente,
        detalles: processedDetalles,
        totalPresupuesto: processedDetalles.reduce((sum, item) => sum + (item.subTotal || 0), 0)
      };
      
      await addPresupuesto(nuevoPresupuestoData);
      toast({
        title: "Presupuesto Registrado en Firebase",
        description: `Se ha registrado el presupuesto para ${data.nombreCliente}.`,
      });
      router.push('/presupuestos');

    } catch (error) {
       console.error("Error al registrar presupuesto:", error);
       toast({
        title: "Error al Registrar",
        description: "No se pudo registrar el presupuesto en Firebase. " + (error instanceof Error ? error.message : "Error desconocido."),
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
      <PageTitle title="Ingresar Nuevo Presupuesto" description="Registre los detalles de un nuevo presupuesto de madera en Firebase." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
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
              <CardDescription>Ingrese los productos a presupuestar. Las filas con tipo de madera y unidades se considerarán válidas.</CardDescription>
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
                      {/* Columna Precio/Pie Oculta */}
                      <TableHead className="w-[90px] text-center">Cepillado</TableHead>
                      <TableHead className="min-w-[110px] text-right">Pies Tabl.</TableHead>
                      <TableHead className="min-w-[120px] text-right">Valor Unit. ($)</TableHead>
                      <TableHead className="min-w-[120px] text-right">Subtotal ($)</TableHead>
                      <TableHead className="w-[50px] text-center">Borrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => {
                      const currentDetalle = watchedDetalles?.[index];
                      if (!currentDetalle) return null; // Safe guard for rendering
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
                          <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={valorUnitario > 0 ? valorUnitario.toFixed(2) : ""} className="bg-muted/50 text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={subTotal > 0 ? subTotal.toFixed(2) : ""} className="bg-muted/50 font-semibold text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-center align-middle">
                            {!isRowEffectivelyEmpty(currentDetalle) && (
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
              <Button type="submit" size="lg" disabled={isSubmitting || isLoading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Registrando..." : "Registrar Presupuesto"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
