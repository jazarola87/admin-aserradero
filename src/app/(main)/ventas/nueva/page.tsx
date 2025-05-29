
"use client";

import { useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Assuming precioCepilladoPorPie is fetched from config or fixed
const PRECIO_CEPILLADO_POR_PIE_MOCK = 0.50; 

const ventaDetalleSchema = z.object({
  tipoMadera: z.string().optional().or(z.literal("")),
  unidades: z.coerce.number().int().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()), // Allow 0 or NaN for empty rows
  ancho: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()), // pulgadas
  alto: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()), // pulgadas (espesor)
  largo: z.coerce.number().positive({ message: "Debe ser > 0" }).optional().or(z.literal(0)).or(z.nan()), // pies
  precioPorPie: z.coerce.number().nonnegative({ message: "Debe ser >= 0" }).optional().or(z.literal(0)).or(z.nan()),
  cepillado: z.boolean().default(false).optional(),
});

const ventaFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  nombreComprador: z.string().min(2, "Mínimo 2 caracteres."),
  telefonoComprador: z.string().optional(),
  detalles: z.array(ventaDetalleSchema)
    .min(1, "Debe agregar al menos un detalle de venta.")
    .refine(
      (arr) => arr.some(d => d.tipoMadera && d.tipoMadera.length > 0 && d.unidades && d.unidades > 0 && d.precioPorPie !== undefined),
      {
        message: "Debe ingresar al menos un artículo válido en los detalles (con tipo de madera, unidades y precio por pie).",
      }
    ),
});

type VentaFormValues = z.infer<typeof ventaFormSchema>;

const createEmptyDetalle = (): z.infer<typeof ventaDetalleSchema> => ({
  tipoMadera: "",
  unidades: undefined,
  ancho: undefined,
  alto: undefined,
  largo: undefined,
  precioPorPie: undefined,
  cepillado: false,
});

const initialDetalles = Array(15).fill(null).map(() => createEmptyDetalle());


export default function NuevaVentaPage() {
  const { toast } = useToast();
  const [precioCepillado, setPrecioCepillado] = useState(PRECIO_CEPILLADO_POR_PIE_MOCK); // Load from config in real app

  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaFormSchema),
    defaultValues: {
      fecha: undefined, // Initialize as undefined to avoid server/client mismatch
      nombreComprador: "",
      telefonoComprador: "",
      detalles: initialDetalles,
    },
  });

  // Set initial date on client-side to avoid hydration mismatch
  useEffect(() => {
    form.setValue('fecha', new Date());
  }, [form.setValue]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  const watchedDetalles = form.watch("detalles");

  const calcularPiesTablares = (detalle: typeof watchedDetalles[0] | undefined) => {
    if (!detalle || !detalle.alto || !detalle.ancho || !detalle.largo || !detalle.unidades) return 0;
    return (detalle.alto * detalle.ancho * detalle.largo * detalle.unidades) / 12;
  };

  const calcularSubtotal = (detalle: typeof watchedDetalles[0] | undefined, piesTablares: number) => {
    if (!detalle || typeof detalle.precioPorPie !== 'number') return 0;
    let subtotal = piesTablares * detalle.precioPorPie;
    if (detalle.cepillado) {
      subtotal += piesTablares * precioCepillado;
    }
    return subtotal;
  };
  
  const totalVentaGeneral = watchedDetalles.reduce((acc, detalle) => {
    if (detalle && detalle.tipoMadera && detalle.unidades && detalle.unidades > 0 && detalle.precioPorPie !== undefined) { 
      const pies = calcularPiesTablares(detalle);
      return acc + calcularSubtotal(detalle, pies);
    }
    return acc;
  }, 0);


  function onSubmit(data: VentaFormValues) {
    const processedDetalles = data.detalles.filter(
      d => d.tipoMadera && d.tipoMadera.length > 0 && d.unidades && d.unidades > 0 && d.precioPorPie !== undefined
    ).map(d => {
      const pies = calcularPiesTablares(d);
      return { ...d, piesTablares: pies, subTotal: calcularSubtotal(d, pies) };
    });

    if (processedDetalles.length === 0) {
      toast({
        title: "Error en la Venta",
        description: "No hay artículos válidos para registrar. Asegúrese de completar tipo de madera, unidades y precio.",
        variant: "destructive",
      });
      return;
    }

    const processedData = {
      ...data,
      detalles: processedDetalles,
      totalVenta: processedDetalles.reduce((sum, item) => sum + (item.subTotal || 0), 0)
    };

    console.log("Nueva Venta Data:", processedData);
    toast({
      title: "Venta Registrada",
      description: `Se ha registrado la venta a ${data.nombreComprador}. Total: $${processedData.totalVenta.toFixed(2)}`,
      variant: "default"
    });
    form.reset({
      fecha: new Date(), // Reset with new Date on client side is fine
      nombreComprador: "",
      telefonoComprador: "",
      detalles: Array(15).fill(null).map(() => createEmptyDetalle()),
    });
  }

  const isRowEffectivelyEmpty = (detalle: typeof watchedDetalles[0] | undefined) => {
    if (!detalle) return true;
    return !detalle.tipoMadera && !detalle.unidades && !detalle.alto && !detalle.ancho && !detalle.largo && !detalle.precioPorPie;
  };


  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Ingresar Nueva Venta" description="Registre los detalles de una nueva venta de madera." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Información del Comprador y Fecha</CardTitle>
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
                      <TableHead className="min-w-[120px] text-right">Subtotal ($)</TableHead>
                      <TableHead className="w-[50px] text-center">Borrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const currentDetalle = watchedDetalles[index];
                      const piesTablares = calcularPiesTablares(currentDetalle);
                      const subTotal = calcularSubtotal(currentDetalle, piesTablares);
                      const isEffectivelyEmpty = isRowEffectivelyEmpty(currentDetalle);

                      return (
                        <TableRow key={field.id} className={cn(isEffectivelyEmpty && index >= 1 && "opacity-70 hover:opacity-100 focus-within:opacity-100")}>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.tipoMadera`} render={({ field: f }) => (
                              <FormItem><FormControl><Input placeholder="Ej: Pino" {...f} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.unidades`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" placeholder="Cant." {...f} onChange={e => f.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.alto`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 2" {...f} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.ancho`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 6" {...f} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.largo`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.1" placeholder="Ej: 8" {...f} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.precioPorPie`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 2.50" {...f} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
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
                            <Input readOnly value={subTotal > 0 ? subTotal.toFixed(2) : ""} className="bg-muted/50 font-semibold text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-center align-middle">
                            {!isEffectivelyEmpty && fields.length > 1 ? (
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            ) : null}
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


    