
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import type { Compra } from "@/types";

const COMPRAS_STORAGE_KEY = 'comprasList';

const compraFormSchema = z.object({
  fecha: z.date({
    required_error: "La fecha de compra es obligatoria.",
  }),
  tipoMadera: z.string().min(2, {
    message: "El tipo de madera debe tener al menos 2 caracteres.",
  }),
  volumen: z.coerce.number().positive({
    message: "El volumen debe ser un número positivo.",
  }),
  costo: z.coerce.number().positive({
    message: "El costo debe ser un número positivo.",
  }),
  proveedor: z.string().min(2, {
    message: "El nombre del proveedor debe tener al menos 2 caracteres.",
  }),
  telefonoProveedor: z.string().optional(),
});

type CompraFormValues = z.infer<typeof compraFormSchema>;

export default function NuevaCompraPage() {
  const { toast } = useToast();
  const form = useForm<CompraFormValues>({
    resolver: zodResolver(compraFormSchema),
    defaultValues: {
      fecha: new Date(),
      tipoMadera: "",
      proveedor: "",
      telefonoProveedor: "",
    },
  });

  function onSubmit(data: CompraFormValues) {
    const nuevaCompra: Compra = {
      ...data,
      id: `compra-${Date.now()}`,
      fecha: format(data.fecha, "yyyy-MM-dd"),
    };

    if (typeof window !== 'undefined') {
      const storedCompras = localStorage.getItem(COMPRAS_STORAGE_KEY);
      const comprasActuales: Compra[] = storedCompras ? JSON.parse(storedCompras) : [];
      comprasActuales.push(nuevaCompra);
      localStorage.setItem(COMPRAS_STORAGE_KEY, JSON.stringify(comprasActuales));
    }
    
    console.log("Nueva Compra Data:", nuevaCompra);
    toast({
      title: "Compra Registrada",
      description: `Se ha registrado la compra de ${data.tipoMadera} de ${data.proveedor}.`,
      variant: "default"
    });
    form.reset({ // Reset form after submission, keeping date as new Date()
      fecha: new Date(),
      tipoMadera: "",
      volumen: undefined, // use undefined for react-hook-form to clear number inputs
      costo: undefined,
      proveedor: "",
      telefonoProveedor: "",
    });
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Ingresar Nueva Compra" description="Registre los detalles de una nueva adquisición de madera." />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Formulario de Compra</CardTitle>
          <CardDescription>Complete todos los campos para registrar la compra.</CardDescription>
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
                    <FormControl>
                      <Input placeholder="Ej: Pino, Roble, Cedro" {...field} />
                    </FormControl>
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
                    <FormLabel>Volumen (pies tablares)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 1500" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormDescription>Cantidad de madera en pies tablares.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Total ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 3500.50" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormDescription>Costo total de la compra.</FormDescription>
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
                  Registrar Compra
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
