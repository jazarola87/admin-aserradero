
"use client";

import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, Search, Pencil, Loader2 } from "lucide-react";
import type { Compra } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const COMPRAS_STORAGE_KEY = 'comprasList';

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadComprasFromLocalStorage = useCallback(() => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      const storedCompras = localStorage.getItem(COMPRAS_STORAGE_KEY);
      if (storedCompras) {
        try {
          const parsedCompras = JSON.parse(storedCompras);
          if (Array.isArray(parsedCompras)) {
            // Ensure dates are valid and sort
            const validCompras = parsedCompras.filter(c => c.fecha && isValid(parseISO(c.fecha)));
            validCompras.sort((a,b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime());
            setCompras(validCompras);
          }
        } catch (e) {
          console.error("Error parsing compras from localStorage", e);
          toast({ title: "Error al cargar compras", description: "No se pudieron cargar los datos de localStorage.", variant: "destructive" });
          setCompras([]);
        }
      } else {
        setCompras([]); // No data in localStorage
      }
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadComprasFromLocalStorage();
  }, [loadComprasFromLocalStorage]);

  const handleDeleteCompra = async (idToDelete: string) => {
    if (typeof window !== 'undefined') {
      const updatedCompras = compras.filter(compra => compra.id !== idToDelete);
      localStorage.setItem(COMPRAS_STORAGE_KEY, JSON.stringify(updatedCompras));
      setCompras(updatedCompras);
      toast({
        title: "Compra Eliminada",
        description: "La compra ha sido eliminada exitosamente de localStorage.",
        variant: "default",
      });
    }
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
      <PageTitle title="Registro de Compras (LocalStorage)" description="Listado de todas las compras de madera desde localStorage.">
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
              {isLoading ? "Cargando compras..." :
                (filteredCompras.length > 0
                  ? `Mostrando ${filteredCompras.length} de ${compras.length} compra(s). (Ordenadas por fecha descendente)`
                  : compras.length === 0 ? "Aún no se han registrado compras en localStorage." : "No se encontraron compras con los criterios de búsqueda.")
              }
            </CardDescription>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por proveedor, teléfono, tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[300px]"
                disabled={isLoading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p>Cargando compras desde localStorage...</p>
            </div>
          ) : compras.length === 0 && !searchTerm ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No hay compras registradas en localStorage.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/compras/nueva">Registrar la primera compra</Link>
              </Button>
            </div>
          ) : filteredCompras.length === 0 && searchTerm ? (
             <div className="text-center py-10 text-muted-foreground">
              <p>No se encontraron compras que coincidan con su búsqueda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo de Madera</TableHead>
                  <TableHead>Volumen (m³)</TableHead>
                  <TableHead>Precio/m³</TableHead>
                  <TableHead>Costo Total</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompras.map((compra) => (
                  <TableRow key={compra.id}>
                    <TableCell>{compra.fecha && isValid(parseISO(compra.fecha)) ? format(parseISO(compra.fecha), 'PPP', { locale: es }) : 'Fecha inválida'}</TableCell>
                    <TableCell>{compra.tipoMadera}</TableCell>
                    <TableCell>{compra.volumen} m³</TableCell>
                    <TableCell>${(compra.precioPorMetroCubico ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>${compra.costo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{compra.proveedor}</TableCell>
                    <TableCell>{compra.telefonoProveedor || "N/A"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/compras/${compra.id}/editar`}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar Compra</span>
                        </Link>
                      </Button>
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
                              Esta acción no se puede deshacer. Esto eliminará permanentemente la compra de localStorage.
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
