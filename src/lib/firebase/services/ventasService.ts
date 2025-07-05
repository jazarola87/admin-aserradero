'use server';
/**
 * @fileOverview Firestore service for Venta (Sales) documents.
 */
import { db } from '@/lib/firebase/config';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import type { Venta } from '@/types';

const VENTAS_COLLECTION = 'ventas';

// Helper function to convert Firestore doc data to Venta
const mapDocToVenta = (document: any): Venta => {
  const data = document.data();
  if (!data) {
    throw new Error(`Documento vacío o sin datos para ID: ${document.id}`);
  }

  return {
    id: document.id,
    fecha: data.fecha, // Assume string "yyyy-MM-dd"
    nombreComprador: data.nombreComprador,
    telefonoComprador: data.telefonoComprador || undefined,
    detalles: data.detalles || [],
    totalVenta: data.totalVenta !== undefined ? Number(data.totalVenta) : undefined,
    idOriginalPresupuesto: data.idOriginalPresupuesto || undefined,
    fechaEntregaEstimada: data.fechaEntregaEstimada || undefined,
    sena: data.sena !== undefined ? Number(data.sena) : undefined,
    costoOperario: data.costoOperario !== undefined ? Number(data.costoOperario) : undefined,
    costoMaderaVentaSnapshot: data.costoMaderaVentaSnapshot !== undefined ? Number(data.costoMaderaVentaSnapshot) : undefined,
    costoAserrioVentaSnapshot: data.costoAserrioVentaSnapshot !== undefined ? Number(data.costoAserrioVentaSnapshot) : undefined,
  } as Venta;
};

export async function getAllVentas(): Promise<Venta[]> {
    if (!db || !('type' in db) || (db as any).type !== 'firestore') {
      console.error("ventasService: Firestore (db) is not initialized correctly.");
      return [];
  }
  try {
    const ventasCollection = collection(db, VENTAS_COLLECTION);
    const q = query(ventasCollection, orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    const ventasList = querySnapshot.docs.map(mapDocToVenta);
    return ventasList;
  } catch (error) {
    console.error("Error fetching all ventas, returning empty array. This might be due to missing indexes or permissions on a new project.", error);
    return [];
  }
}


export async function getVentaById(id: string): Promise<Venta | null> {
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    throw new Error("La base de datos no está disponible.");
  }
  try {
    const docRef = doc(db, VENTAS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapDocToVenta(docSnap);
    } else {
      console.log(`No such venta document with ID: ${id}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching venta by ID ${id}: `, error);
    throw new Error("No se pudo obtener la venta.");
  }
}

export async function addVenta(ventaData: Omit<Venta, 'id'>): Promise<Venta> {
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    throw new Error("La base de datos no está disponible.");
  }
  try {
    const docRef = await addDoc(collection(db, VENTAS_COLLECTION), ventaData);
    return { id: docRef.id, ...ventaData } as Venta;
  } catch (error) {
    console.error("Error adding venta: ", error);
    throw new Error("No se pudo agregar la venta.");
  }
}

export async function updateVenta(id: string, ventaData: Partial<Omit<Venta, 'id'>>): Promise<void> {
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    throw new Error("La base de datos no está disponible.");
  }
  try {
    const docRef = doc(db, VENTAS_COLLECTION, id);
    await updateDoc(docRef, ventaData);
  } catch (error) {
    console.error(`Error updating venta with ID ${id}: `, error);
    throw new Error("No se pudo actualizar la venta.");
  }
}

export async function deleteVenta(id: string): Promise<void> {
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    throw new Error("La base de datos no está disponible.");
  }
  try {
    const docRef = doc(db, VENTAS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting venta with ID ${id}: `, error);
    throw new Error("No se pudo eliminar la venta.");
  }
}
