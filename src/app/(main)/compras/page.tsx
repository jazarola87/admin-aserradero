import Link from "next/link";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import type { Compra } from "@/types";

// Mock data for purchases
const mockCompras: Compra[] = [
  { id: "comp001", fecha: "2024-07-15", tipoMadera: "Pino", volumen: 500, costo: 2500, proveedor: "Maderas del Sur S.A.", telefonoProveedor: "555-1234" },
  { id: "comp002", fecha: "2024-07-18", tipoMadera: "Roble", volumen: 200, costo: 3000, proveedor: "Bosques del Norte Ltda." },
  { id: "comp003", fecha: "2024-07-20", tipoMadera: "Cedro", volumen: 150, costo: 2250, proveedor: "Importadora Tropical", telefonoProveedor: "555-5678" },
];


export default function ComprasPage() {
  const compras = mockCompras; // In a real app, fetch this data

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Registro de Compras" description="Listado de todas las compras de madera.">
        <Button asChild>
          <Link href="/compras/nueva">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Compra
          </Link>
        </Button>
      </PageTitle>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
          <CardDescription>
            {compras.length > 0 
              ? `Mostrando ${compras.length} compras.` 
              : "Aún no se han registrado compras."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compras.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo de Madera</TableHead>
                  <TableHead>Volumen</TableHead>
                  <TableHead>Costo Total</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Teléfono</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compras.map((compra) => (
                  <TableRow key={compra.id}>
                    <TableCell>{new Date(compra.fecha).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>{compra.tipoMadera}</TableCell>
                    <TableCell>{compra.volumen} pies</TableCell> {/* Assuming volume is in board feet */}
                    <TableCell>${compra.costo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{compra.proveedor}</TableCell>
                    <TableCell>{compra.telefonoProveedor || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>No hay compras registradas.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/compras/nueva">Registrar la primera compra</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
