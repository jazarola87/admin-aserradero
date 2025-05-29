
"use client";

import Link from "next/link";
import React, { useState, useMemo } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, Search } from "lucide-react";
import type { Compra } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Mock data for purchases
const mockComprasData: Compra[] = [
  { id: "comp001", fecha: "2024-07-15", tipoMadera: "Pino", volumen: 500, costo: 2500, proveedor: "Maderas del Sur S.A.", telefonoProveedor: "555-1234" },
  { id: "comp002", fecha: "2024-07-18", tipoMadera: "Roble", volumen: 200, costo: 3000, proveedor: "Bosques del Norte Ltda." },
  { id: "comp003", fecha: "2024-07-20", tipoMadera: "Cedro", volumen: 150, costo: 2250, proveedor: "Importadora Tropical", telefonoProveedor: "555-5678" },
];


export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>(mockComprasData);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const handleDeleteCompra = (idToDelete: string) => {
    setCompras(prevCompras => prevCompras.filter(compra => compra.id !== idToDelete));
    toast({
      title: "Compra Eliminada",
      description: "La compra ha sido eliminada exitosamente.",
      variant: "default",
    });
  };

  const filteredCompras = useMemo(() => {
    if (!searchTerm) return compras;
    return compras.filter(compra => 
      compra.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (compra.telefonoProveedor && compra.telefonoProveedor.includes(searchTerm)) ||
      compra.tipoMadera.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [compras, searchTerm]);

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardDescription>
              {filteredCompras.length > 0 
                ? `Mostrando ${filteredCompras.length} de ${compras.length} compra(s).` 
                : "No se encontraron compras con los criterios de búsqueda."}
              {compras.length === 0 && " Aún no se han registrado compras."}
            </CardDescription>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por proveedor, teléfono, tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {compras.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No hay compras registradas.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/compras/nueva">Registrar la primera compra</Link>
              </Button>
            </div>
          ) : filteredCompras.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
              <p>No se encontraron compras que coincidan con su búsqueda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo de Madera</TableHead>
                  <TableHead>Volumen</TableHead>
                  <TableHead>Costo Total</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompras.map((compra) => (
                  <TableRow key={compra.id}>
                    <TableCell>{new Date(compra.fecha).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>{compra.tipoMadera}</TableCell>
                    <TableCell>{compra.volumen} pies</TableCell>
                    <TableCell>${compra.costo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{compra.proveedor}</TableCell>
                    <TableCell>{compra.telefonoProveedor || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar Compra</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente la compra.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCompra(compra.id)} className="bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
