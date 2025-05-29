
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader2, Send } from "lucide-react";
import { consultarAsistente, type AsistenteConsultasInput, type AsistenteConsultasOutput } from "@/ai/flows/asistente-consultas-flow";
import type { Compra, Venta } from "@/types";

const formSchema = z.object({
  prompt: z.string().min(5, {
    message: "La consulta debe tener al menos 5 caracteres.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

// Helper to strip down VentaDetalle to what's needed for the prompt to avoid overly large context
const simplifyVentaDetalle = (detalle: any) => ({
  tipoMadera: detalle.tipoMadera,
  unidades: detalle.unidades,
  ancho: detalle.ancho,
  alto: detalle.alto,
  largo: detalle.largo,
  precioPorPie: detalle.precioPorPie,
  cepillado: detalle.cepillado,
  piesTablares: detalle.piesTablares,
  subTotal: detalle.subTotal,
});

const simplifyVenta = (venta: Venta) => ({
  id: venta.id,
  fecha: venta.fecha,
  nombreComprador: venta.nombreComprador,
  detalles: (venta.detalles || []).map(simplifyVentaDetalle),
  totalVenta: venta.totalVenta,
});

const simplifyCompra = (compra: Compra) => ({
  id: compra.id,
  fecha: compra.fecha,
  tipoMadera: compra.tipoMadera,
  volumen: compra.volumen,
  proveedor: compra.proveedor,
  costo: compra.costo,
});


export default function AsistenteVirtualPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [respuestaAsistente, setRespuestaAsistente] = useState<string | null>(null);

  const [comprasData, setComprasData] = useState<any[]>([]);
  const [ventasData, setVentasData] = useState<any[]>([]);

  useEffect(() => {
    // Cargar datos de localStorage al montar el componente
    if (typeof window !== 'undefined') {
      const storedCompras = localStorage.getItem('comprasList');
      const storedVentas = localStorage.getItem('ventasList');
      if (storedCompras) {
        try {
          const parsedCompras: Compra[] = JSON.parse(storedCompras);
          setComprasData(parsedCompras.map(simplifyCompra));
        } catch (e) { console.error("Error parsing compras data for assistant:", e); }
      }
      if (storedVentas) {
         try {
          const parsedVentas: Venta[] = JSON.parse(storedVentas);
          setVentasData(parsedVentas.map(simplifyVenta));
        } catch (e) { console.error("Error parsing ventas data for assistant:", e); }
      }
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setRespuestaAsistente(null);

    if (comprasData.length === 0 && ventasData.length === 0) {
        toast({
            title: "No hay datos",
            description: "No hay datos de compras o ventas cargados en el sistema para consultar.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }

    try {
      const inputData: AsistenteConsultasInput = {
        prompt: data.prompt,
        comprasData: comprasData,
        ventasData: ventasData,
      };
      const result = await consultarAsistente(inputData);
      setRespuestaAsistente(result.respuesta);
      toast({
        title: "Respuesta Recibida",
        description: "El asistente ha procesado tu consulta.",
      });
    } catch (error) {
      console.error("Error al consultar al asistente:", error);
      toast({
        title: "Error",
        description: "No se pudo obtener una respuesta del asistente. Intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle
        title="Asistente Virtual de Datos"
        description="Realice consultas en lenguaje natural sobre sus registros de compras y ventas."
      />
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Realizar Consulta</CardTitle>
            <CardDescription>
              Escriba su pregunta sobre los datos. Por ejemplo: &quot;¿Cuál fue la venta más grande en Julio?&quot; o &quot;¿Cuántos m³ de Pino compré este año?&quot;
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Su Pregunta:</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: ¿Cuál es el tipo de madera más vendido?"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "Procesando..." : "Enviar Consulta"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Respuesta del Asistente</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[200px] flex items-center justify-center">
            {isLoading && (
              <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">El asistente está pensando...</p>
              </div>
            )}
            {!isLoading && !respuestaAsistente && (
              <div className="text-center text-muted-foreground">
                <Bot className="mx-auto h-12 w-12 mb-4" />
                <p>La respuesta del asistente aparecerá aquí.</p>
              </div>
            )}
            {respuestaAsistente && !isLoading && (
              <div className="w-full text-left space-y-4 p-4 bg-muted rounded-md whitespace-pre-wrap">
                <p>{respuestaAsistente}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
