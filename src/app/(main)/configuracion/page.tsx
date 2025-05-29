"use client";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { Save, PlusCircle, Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

const precioMaderaSchema = z.object({
  tipoMadera: z.string().min(1, "El tipo de madera es requerido."),
  precioPorPie: z.coerce.number().positive("El precio debe ser positivo."),
});

const configuracionFormSchema = z.object({
  nombreAserradero: z.string().min(3, {
    message: "El nombre del aserradero debe tener al menos 3 caracteres.",
  }),
  logoUrl: z.string().url({ message: "Por favor ingrese una URL válida para el logo." }).optional().or(z.literal("")),
  preciosMadera: z.array(precioMaderaSchema).optional(),
  precioCepilladoPorPie: z.coerce.number().nonnegative({
    message: "El precio de cepillado no puede ser negativo.",
  }),
});

type ConfiguracionFormValues = z.infer<typeof configuracionFormSchema>;

// Mock initial config
const initialConfig: ConfiguracionFormValues = {
  nombreAserradero: "Aserradero El Roble",
  logoUrl: "https://placehold.co/150x150.png?text=Logo",
  preciosMadera: [
    { tipoMadera: "Pino", precioPorPie: 2.50 },
    { tipoMadera: "Roble", precioPorPie: 5.00 },
  ],
  precioCepilladoPorPie: 0.50,
};

export default function ConfiguracionPage() {
  const { toast } = useToast();
  const form = useForm<ConfiguracionFormValues>({
    resolver: zodResolver(configuracionFormSchema),
    defaultValues: initialConfig, // Load from storage/API in real app
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "preciosMadera",
  });

  function onSubmit(data: ConfiguracionFormValues) {
    console.log("Configuración Guardada:", data);
    // In a real app, save this data to a backend or local storage
    toast({
      title: "Configuración Guardada",
      description: "Los cambios en la configuración han sido guardados exitosamente.",
      variant: "default"
    });
  }

  const logoPreview = form.watch("logoUrl");

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Configuración General y de Precios" description="Ajuste los parámetros de su aserradero." />
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Ajustes del Aserradero</CardTitle>
          <CardDescription>Personalice la información y los precios base.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="nombreAserradero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Aserradero</FormLabel>
                    <FormControl>
                      <Input placeholder="Mi Aserradero S.A." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Logo</FormLabel>
                    <FormControl>
                      <Input placeholder="https://ejemplo.com/logo.png" {...field} />
                    </FormControl>
                    {logoPreview && (
                      <div className="mt-2 p-2 border rounded-md inline-block bg-muted">
                        <Image src={logoPreview} alt="Vista previa del logo" width={100} height={100} className="object-contain rounded" data-ai-hint="logo wood"/>
                      </div>
                    )}
                     {!logoPreview && (
                      <div className="mt-2 p-2 border rounded-md inline-flex items-center justify-center bg-muted w-[100px] h-[100px]">
                        <ImageIcon className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    <FormDescription>Ingrese la URL completa de la imagen del logo.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />
              <h3 className="text-lg font-medium">Precios de Madera por Pie Tablar</h3>
              {fields.map((item, index) => (
                <div key={item.id} className="flex items-end gap-4 p-4 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`preciosMadera.${index}.tipoMadera`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Tipo de Madera</FormLabel>
                        <FormControl><Input placeholder="Ej: Pino" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`preciosMadera.${index}.precioPorPie`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Precio / Pie ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="Ej: 2.75" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="shrink-0">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar precio</span>
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => append({ tipoMadera: "", precioPorPie: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Tipo de Madera
              </Button>

              <Separator />
              <FormField
                control={form.control}
                name="precioCepilladoPorPie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Cepillado por Pie Tablar ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 0.50" {...field} />
                    </FormControl>
                    <FormDescription>Costo adicional por pie tablar si la madera es cepillada.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Configuración
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
