
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
import { Save, PlusCircle, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { getAppConfig, updateAppConfig } from "@/lib/firebase/services/configuracionService"; 
import type { Configuracion } from "@/types"; 
import React, { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const precioMaderaSchema = z.object({
  tipoMadera: z.string().min(1, "El tipo de madera es requerido."),
  precioPorPie: z.coerce.number().positive("El precio debe ser positivo."),
});

// Schema for this page, focusing on selling prices and general company info
const preciosVentaFormSchema = z.object({
  nombreAserradero: z.string().min(3, {
    message: "El nombre del aserradero debe tener al menos 3 caracteres.",
  }),
  logoUrl: z.string().optional().or(z.literal("")),
  enlaceWhatsApp: z.string().url({ message: "Por favor, ingrese una URL válida." }).or(z.literal("")).optional(),
  telefonoEmpresa: z.string().optional(),
  lemaEmpresa: z.string().optional(),
  preciosMadera: z.array(precioMaderaSchema).optional(), // Selling prices per board foot
  precioCepilladoPorPie: z.coerce.number().nonnegative({
    message: "El precio de cepillado no puede ser negativo.",
  }),
});

type PreciosVentaFormValues = z.infer<typeof preciosVentaFormSchema>;


export default function PreciosVentaPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined);
  
  const form = useForm<PreciosVentaFormValues>({
    resolver: zodResolver(preciosVentaFormSchema),
    defaultValues: {
      nombreAserradero: "",
      logoUrl: "",
      enlaceWhatsApp: "",
      telefonoEmpresa: "",
      lemaEmpresa: "",
      preciosMadera: [],
      precioCepilladoPorPie: 0,
    },
  });

  useEffect(() => {
    async function fetchConfig() {
      setIsLoading(true);
      try {
        const config = await getAppConfig();
        form.reset({
          nombreAserradero: config.nombreAserradero,
          logoUrl: config.logoUrl,
          enlaceWhatsApp: config.enlaceWhatsApp,
          telefonoEmpresa: config.telefonoEmpresa,
          lemaEmpresa: config.lemaEmpresa,
          preciosMadera: config.preciosMadera || [],
          precioCepilladoPorPie: config.precioCepilladoPorPie || 0,
        });
        setLogoPreview(config.logoUrl);
      } catch (error) {
        toast({
          title: "Error al Cargar Configuración",
          description: "No se pudo obtener la configuración desde Firebase. Se usarán valores por defecto.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchConfig();
  }, [form, toast]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "preciosMadera",
  });

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
  
  async function onSubmit(data: PreciosVentaFormValues) {
    setIsSubmitting(true);
    try {
      await updateAppConfig(data);
      toast({
        title: "Precios de Venta Guardados",
        description: "Los cambios se han guardado en Firebase.",
      });
    } catch(error) {
       toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la configuración en Firebase.",
        variant: "destructive"
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

  const watchedPreciosMadera = form.watch("preciosMadera");

  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Gestión de Precios de Venta" 
        description="Defina la información del aserradero, tipos de madera para la venta, sus precios por pie tablar y costo de cepillado." 
      />
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Ajustes Generales y Precios de Venta</CardTitle>
          <CardDescription>Personalice la información del aserradero y los precios base para los productos de venta.</CardDescription>
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
                  {logoPreview && logoPreview.startsWith('data:image') ? (
                    <div className="mt-2 p-2 border rounded-md inline-block bg-muted">
                      <Image src={logoPreview} alt="Vista previa del logo" width={100} height={100} className="object-contain rounded" data-ai-hint="logo company"/>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 border rounded-md inline-flex items-center justify-center bg-muted w-[104px] h-[104px]">
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <FormDescription>Logo para presupuestos y facturas.</FormDescription>
                  {form.formState.errors.logoUrl && <FormMessage>{form.formState.errors.logoUrl.message}</FormMessage>}
              </FormItem>
              
              <FormField
                control={form.control}
                name="enlaceWhatsApp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enlace de WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="https://wa.me/54911..." {...field} value={field.value ?? ""} />
                    </FormControl>
                     <FormDescription>
                       El enlace completo de WhatsApp (incluyendo https://) que se usará en los PDFs.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefonoEmpresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de la Empresa (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: +54 9 11 1234-5678" {...field} />
                    </FormControl>
                    <FormDescription>El número de teléfono principal para contacto (informativo).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lemaEmpresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lema de la Empresa (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ej: Calidad y tradición en maderas desde 1985." {...field} />
                    </FormControl>
                    <FormDescription>Un eslogan o frase que represente a su aserradero.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />
              <h3 className="text-lg font-medium">Tipos de Madera y Precios de Venta por Pie Tablar</h3>
              {fields.map((item, index) => {
                const tipoMaderaActual = watchedPreciosMadera?.[index]?.tipoMadera;
                return (
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
                        <FormLabel>Precio Venta / Pie ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="Ej: 2.75" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="icon" className="shrink-0">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar tipo y precio</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Está realmente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción es permanente y eliminará el tipo de madera "{tipoMaderaActual || 'este tipo'}". Si este tipo de madera se usa en compras, ventas o presupuestos, podría afectar los reportes históricos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => remove(index)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Sí, Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )})}
              <Button type="button" variant="outline" onClick={() => append({ tipoMadera: "", precioPorPie: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Tipo de Madera y Precio
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
                    <FormDescription>Costo adicional por pie tablar si la madera es cepillada para la venta.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={isSubmitting || isLoading}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSubmitting ? "Guardando..." : "Guardar Precios de Venta"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
