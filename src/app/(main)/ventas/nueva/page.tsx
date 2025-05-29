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

// Assuming precioCepilladoPorPie is fetched from config or fixed
const PRECIO_CEPILLADO_POR_PIE_MOCK = 0.50; 

const ventaDetalleSchema = z.object({
  tipoMadera: z.string().min(1, "Requerido"),
  unidades: z.coerce.number().int().positive("Debe ser > 0"),
  ancho: z.coerce.number().positive("Debe ser > 0"), // pulgadas
  alto: z.coerce.number().positive("Debe ser > 0"), // pulgadas (espesor)
  largo: z.coerce.number().positive("Debe ser > 0"), // pies
  precioPorPie: z.coerce.number().nonnegative("Debe ser >= 0"),
  cepillado: z.boolean().default(false),
});

const ventaFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  nombreComprador: z.string().min(2, "Mínimo 2 caracteres."),
  telefonoComprador: z.string().optional(),
  detalles: z.array(ventaDetalleSchema).min(1, "Debe agregar al menos un detalle de venta."),
});

type VentaFormValues = z.infer<typeof ventaFormSchema>;

export default function NuevaVentaPage() {
  const { toast } = useToast();
  const [precioCepillado, setPrecioCepillado] = useState(PRECIO_CEPILLADO_POR_PIE_MOCK); // Load from config in real app

  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaFormSchema),
    defaultValues: {
      nombreComprador: "",
      telefonoComprador: "",
      detalles: [{ tipoMadera: "", unidades: 1, ancho: 0, alto: 0, largo: 0, precioPorPie: 0, cepillado: false }],
    },
  });

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
    const pies = calcularPiesTablares(detalle);
    return acc + calcularSubtotal(detalle, pies);
  }, 0);


  function onSubmit(data: VentaFormValues) {
    const processedData = {
      ...data,
      detalles: data.detalles.map(d => {
        const pies = calcularPiesTablares(d);
        return { ...d, piesTablares: pies, subTotal: calcularSubtotal(d, pies) };
      }),
      totalVenta: totalVentaGeneral
    };
    console.log("Nueva Venta Data:", processedData);
    toast({
      title: "Venta Registrada",
      description: `Se ha registrado la venta a ${data.nombreComprador}. Total: $${totalVentaGeneral.toFixed(2)}`,
      variant: "default"
    });
    form.reset({
      nombreComprador: "",
      telefonoComprador: "",
      detalles: [{ tipoMadera: "", unidades: 1, ancho: 0, alto: 0, largo: 0, precioPorPie: 0, cepillado: false }],
    });
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Ingresar Nueva Venta" description="Registre los detalles de una nueva venta de madera." />
      <Card className="mx-auto">
        <CardHeader>
          <CardTitle>Formulario de Venta</CardTitle>
          <CardDescription>Complete la información del cliente y los detalles de los productos vendidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid md:grid-cols-3 gap-6">
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
              </div>

              <Separator />
              <h3 className="text-lg font-medium">Detalles de la Venta</h3>
              {fields.map((field, index) => {
                const currentDetalle = watchedDetalles[index];
                const piesTablares = calcularPiesTablares(currentDetalle);
                const subTotal = calcularSubtotal(currentDetalle, piesTablares);

                return (
                <Card key={field.id} className="p-4 space-y-4 relative">
                   {fields.length > 1 && (
                     <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar detalle</span>
                      </Button>
                   )}
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`detalles.${index}.tipoMadera`} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Tipo Madera</FormLabel>
                          <FormControl><Input placeholder="Ej: Pino" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`detalles.${index}.unidades`} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Unidades</FormLabel>
                          <FormControl><Input type="number" placeholder="Cant." {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`detalles.${index}.precioPorPie`} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Precio / Pie Tablar ($)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="Ej: 2.50" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`detalles.${index}.alto`} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Alto (espesor, pulg.)</FormLabel>
                          <FormControl><Input type="number" step="0.1" placeholder="Ej: 2" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`detalles.${index}.ancho`} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Ancho (pulg.)</FormLabel>
                          <FormControl><Input type="number" step="0.1" placeholder="Ej: 6" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField control={form.control} name={`detalles.${index}.largo`} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Largo (pies)</FormLabel>
                          <FormControl><Input type="number" step="0.1" placeholder="Ej: 8" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 items-end">
                     <FormField control={form.control} name={`detalles.${index}.cepillado`} render={({ field: f }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 h-10">
                          <FormControl><Checkbox checked={f.value} onCheckedChange={f.onChange} /></FormControl>
                          <FormLabel className="font-normal">Cepillado (+${precioCepillado.toFixed(2)}/pie)</FormLabel>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel>Pies Tablares</FormLabel>
                      <Input readOnly value={piesTablares.toFixed(2)} className="bg-muted" />
                    </div>
                    <div>
                      <FormLabel>Subtotal ($)</FormLabel>
                      <Input readOnly value={subTotal.toFixed(2)} className="bg-muted font-semibold" />
                    </div>
                  </div>
                </Card>
              )})}
              <Button type="button" variant="outline" onClick={() => append({ tipoMadera: "", unidades: 1, ancho: 0, alto: 0, largo: 0, precioPorPie: 0, cepillado: false })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Otro Producto
              </Button>
              {form.formState.errors.detalles && !form.formState.errors.detalles.root && (
                 <p className="text-sm font-medium text-destructive">{form.formState.errors.detalles.message}</p>
              )}

              <Separator />
              <div className="flex justify-end items-center gap-4">
                <div className="text-xl font-semibold">
                  Total General: <span className="text-primary">${totalVentaGeneral.toFixed(2)}</span>
                </div>
                <Button type="submit" size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  Registrar Venta
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
