import Link from "next/link";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle } from "lucide-react";
import type { Venta, VentaDetalle } from "@/types";

// Mock data for sales
const mockVentas: Venta[] = [
  { 
    id: "venta001", 
    fecha: "2024-07-20", 
    nombreComprador: "Juan Pérez", 
    telefonoComprador: "555-8765",
    detalles: [
      { id: "d001", tipoMadera: "Pino", unidades: 10, ancho: 6, alto: 2, largo: 8, precioPorPie: 2.50, cepillado: true, piesTablares: 80, subTotal: 220 }, // 80ft * $2.5 + cepillado
      { id: "d002", tipoMadera: "Roble", unidades: 5, ancho: 8, alto: 3, largo: 10, precioPorPie: 5.00, cepillado: false, piesTablares: 100, subTotal: 500 }, // 100ft * $5.00
    ],
    totalVenta: 720,
  },
  { 
    id: "venta002", 
    fecha: "2024-07-22", 
    nombreComprador: "Constructora Moderna", 
    telefonoComprador: "555-4321",
    detalles: [
      { id: "d003", tipoMadera: "Cedro", unidades: 20, ancho: 4, alto: 1, largo: 12, precioPorPie: 4.00, cepillado: true, piesTablares: 80, subTotal: 360 }, // 80ft * $4.00 + cepillado
    ],
    totalVenta: 360,
  },
];

export default function VentasPage() {
  const ventas = mockVentas; // In a real app, fetch this data

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Registro de Ventas" description="Listado de todas las ventas de madera.">
        <Button asChild>
          <Link href="/ventas/nueva">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Venta
          </Link>
        </Button>
      </PageTitle>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
           <CardDescription>
            {ventas.length > 0 
              ? `Mostrando ${ventas.length} ventas.` 
              : "Aún no se han registrado ventas."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ventas.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {ventas.map((venta) => (
                <AccordionItem value={venta.id} key={venta.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex justify-between w-full pr-4">
                      <span>Venta a: {venta.nombreComprador}</span>
                      <span>Fecha: {new Date(venta.fecha).toLocaleDateString('es-ES')}</span>
                      <span>Total: ${venta.totalVenta?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2"><strong>Teléfono Comprador:</strong> {venta.telefonoComprador || "N/A"}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo Madera</TableHead>
                          <TableHead>Unidades</TableHead>
                          <TableHead>Dimensiones (Ancho x Alto x Largo)</TableHead>
                          <TableHead>Pies Tablares</TableHead>
                          <TableHead>Precio/Pie</TableHead>
                          <TableHead>Cepillado</TableHead>
                          <TableHead>Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {venta.detalles.map((detalle) => (
                          <TableRow key={detalle.id}>
                            <TableCell>{detalle.tipoMadera}</TableCell>
                            <TableCell>{detalle.unidades}</TableCell>
                            <TableCell>{detalle.ancho}" x {detalle.alto}" x {detalle.largo}'</TableCell>
                            <TableCell>{detalle.piesTablares?.toFixed(2)}</TableCell>
                            <TableCell>${detalle.precioPorPie.toFixed(2)}</TableCell>
                            <TableCell>{detalle.cepillado ? "Sí" : "No"}</TableCell>
                            <TableCell>${detalle.subTotal?.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
             <div className="text-center py-10 text-muted-foreground">
              <p>No hay ventas registradas.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/ventas/nueva">Registrar la primera venta</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
