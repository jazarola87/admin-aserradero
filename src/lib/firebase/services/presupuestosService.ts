
'use server';
/**
 * @fileOverview Firestore service for Presupuesto (Quotes) documents.
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
import type { Presupuesto } from '@/types';

const PRESUPUESTOS_COLLECTION = 'presupuestos';

const mapDocToPresupuesto = (document: any): Presupuesto => {
  const data = document.data();
  if (!data) {
    throw new Error(`Documento vacío o sin datos para ID: ${document.id}`);
  }

  return {
    id: document.id,
    fecha: data.fecha, // Assume string "yyyy-MM-dd"
    nombreCliente: data.nombreCliente,
    telefonoCliente: data.telefonoCliente || undefined,
    detalles: data.detalles || [],
    totalPresupuesto: data.totalPresupuesto !== undefined ? Number(data.totalPresupuesto) : undefined,
  } as Presupuesto;
};

export async function getAllPresupuestos(): Promise<Presupuesto[]> {
  if (!db) {
    console.error("presupuestosService: Firestore (db) is not initialized.");
    throw new Error("La base de datos no está disponible.");
  }
  try {
    const presupuestosCollection = collection(db, PRESUPUESTOS_COLLECTION);
    const q = query(presupuestosCollection, orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocToPresupuesto);
  } catch (error) {
    console.error("Error fetching all presupuestos:", error);
    throw new Error("No se pudieron obtener los presupuestos. " + (error instanceof Error ? error.message : ""));
  }
}

export async function getPresupuestoById(id: string): Promise<Presupuesto | null> {
  if (!db) {
     throw new Error("La base de datos no está disponible.");
  }
  try {
    const docRef = doc(db, PRESUPUESTOS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapDocToPresupuesto(docSnap);
    } else {
      console.log(`No such presupuesto document with ID: ${id}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching presupuesto by ID ${id}:`, error);
    throw new Error("No se pudo obtener el presupuesto. " + (error instanceof Error ? error.message : ""));
  }
}

export async function addPresupuesto(presupuestoData: Omit<Presupuesto, 'id'>): Promise<Presupuesto> {
  if (!db) {
     throw new Error("La base de datos no está disponible.");
  }
  try {
    const docRef = await addDoc(collection(db, PRESUPUESTOS_COLLECTION), presupuestoData);
    return { id: docRef.id, ...presupuestoData } as Presupuesto;
  } catch (error) {
    console.error("Error adding presupuesto:", error);
    throw new Error("No se pudo agregar el presupuesto. " + (error instanceof Error ? error.message : ""));
  }
}

export async function updatePresupuesto(id: string, presupuestoData: Partial<Omit<Presupuesto, 'id'>>): Promise<void> {
  if (!db) {
     throw new Error("La base de datos no está disponible.");
  }
  try {
    const docRef = doc(db, PRESUPUESTOS_COLLECTION, id);
    await updateDoc(docRef, presupuestoData);
  } catch (error) {
    console.error(`Error updating presupuesto with ID ${id}:`, error);
    throw new Error("No se pudo actualizar el presupuesto. " + (error instanceof Error ? error.message : ""));
  }
}

export async function deletePresupuesto(id: string): Promise<void> {
  if (!db) {
     throw new Error("La base de datos no está disponible.");
  }
  try {
    const docRef = doc(db, PRESUPUESTOS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting presupuesto with ID ${id}:`, error);
    throw new Error("No se pudo eliminar el presupuesto. " + (error instanceof Error ? error.message : ""));
  }
}
