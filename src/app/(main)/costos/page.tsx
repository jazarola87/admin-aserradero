
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { Save, PlusCircle, Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { initialConfigData, updateConfigData } from "@/lib/config-data"; 
import type { Configuracion as ConfiguracionFormValues } from "@/types"; 
import React, { useState } from "react";

const precioMaderaSchema = z.object({
  tipoMadera: z.string().min(1, "El tipo de madera es requerido."),
  precioPorPie: z.coerce.number().positive("El precio debe ser positivo."),
});

const costosFormSchema = z.object({
  nombreAserradero: z.string().min(3, {
    message: "El nombre del aserradero debe tener al menos 3 caracteres.",
  }),
  logoUrl: z.string().optional().or(z.literal("")), // Will store Data URI or existing URL
  lemaEmpresa: z.string().optional(),
  preciosMadera: z.array(precioMaderaSchema).optional(),
  precioCepilladoPorPie: z.coerce.number().nonnegative({
    message: "El precio de cepillado no puede ser negativo.",
  }),
});


export default function CostosPage() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | undefined>(initialConfigData.logoUrl);

  const form = useForm<ConfiguracionFormValues>({
    resolver: zodResolver(costosFormSchema),
    defaultValues: initialConfigData, 
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "preciosMadera",
  });

  React.useEffect(() => {
    // Initialize logo preview from form default values
    setLogoPreview(form.getValues("logoUrl"));
  }, [form]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        form.setValue("logoUrl", dataUri, { shouldValidate: true });
        setLogoPreview(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(data: ConfiguracionFormValues) {
    updateConfigData(data); 
    console.log("Configuración de Costos Guardada:", data);
    toast({
      title: "Costos Guardados",
      description: "Los cambios en la configuración de costos han sido guardados exitosamente.",
      variant: "default"
    });
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Gestión de Costos y Precios Base" 
        description="Defina la información del aserradero, tipos de madera, precios y otros costos operativos." 
      />
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Ajustes Generales y de Precios</CardTitle>
          <CardDescription>Personalice la información del aserradero y los precios base para los cálculos de venta.</CardDescription>
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
              
              <FormItem>
                <FormLabel>Logo de la Empresa</FormLabel>
                <FormControl>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </FormControl>
                {logoPreview && (
                  <div className="mt-2 p-2 border rounded-md inline-block bg-muted">
                    <Image src={logoPreview} alt="Vista previa del logo" width={100} height={100} className="object-contain rounded" data-ai-hint="logo company"/>
                  </div>
                )}
                 {!logoPreview && (
                  <div className="mt-2 p-2 border rounded-md inline-flex items-center justify-center bg-muted w-[100px] h-[100px]">
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                <FormDescription>Seleccione un archivo de imagen para el logo (PNG, JPG, etc.).</FormDescription>
                <FormMessage>{form.formState.errors.logoUrl?.message}</FormMessage>
              </FormItem>

              <FormField
                control={form.control}
                name="lemaEmpresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lema de la Empresa</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ej: Calidad y tradición en maderas desde 1985." {...field} />
                    </FormControl>
                    <FormDescription>Un eslogan o frase que represente a su aserradero.</FormDescription>
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
                  Guardar Costos
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
