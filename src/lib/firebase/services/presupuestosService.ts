'use server';
/**
 * @fileOverview Firestore service for Presupuesto (Quotes) documents.
 * This service is modeled after the working comprasService.ts to ensure robust communication with Firebase.
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

// Helper function to convert Firestore doc data to Presupuesto
const mapDocToPresupuesto = (document: any): Presupuesto => {
  const data = document.data();
  if (!data) {
    throw new Error(`Documento de presupuesto vacío o sin datos para ID: ${document.id}`);
  }

  // Ensure all details have numeric values where expected
  const detalles = (data.detalles || []).map((d: any) => ({
    ...d,
    unidades: Number(d.unidades) || 0,
    ancho: Number(d.ancho) || 0,
    alto: Number(d.alto) || 0,
    largo: Number(d.largo) || 0,
    precioPorPie: Number(d.precioPorPie) || 0,
    piesTablares: Number(d.piesTablares) || 0,
    subTotal: Number(d.subTotal) || 0,
    valorUnitario: Number(d.valorUnitario) || 0,
  }));

  return {
    id: document.id,
    fecha: data.fecha, // Assume string "yyyy-MM-dd"
    nombreCliente: data.nombreCliente,
    telefonoCliente: data.telefonoCliente || undefined,
    detalles: detalles,
    totalPresupuesto: data.totalPresupuesto !== undefined ? Number(data.totalPresupuesto) : undefined,
  } as Presupuesto;
};

export async function getAllPresupuestos(): Promise<Presupuesto[]> {
  // @ts-ignore
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    console.error("presupuestosService: getAllPresupuestos - Firestore (db) no está inicializado correctamente.");
    return [];
  }
  try {
    const presupuestosCollection = collection(db, PRESUPUESTOS_COLLECTION);
    const q = query(presupuestosCollection, orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocToPresupuesto);
  } catch (error) {
    console.error("Error al obtener todos los presupuestos, returning empty array. This might be due to missing indexes or permissions on a new project.", error);
    return [];
  }
}

export async function getPresupuestoById(id: string): Promise<Presupuesto | null> {
  // @ts-ignore
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    console.error("presupuestosService: getPresupuestoById - Firestore (db) no está inicializado correctamente.");
    throw new Error("La base de datos (Firestore) no está inicializada correctamente para obtener el presupuesto.");
  }
  try {
    const docRef = doc(db, PRESUPUESTOS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapDocToPresupuesto(docSnap);
    } else {
      console.log(`No se encontró un presupuesto con el ID: ${id}`);
      return null;
    }
  } catch (error) {
    console.error(`Error al obtener el presupuesto por ID ${id}:`, error);
    throw new Error("No se pudo obtener el presupuesto. Verifique la conexión y las reglas de seguridad de Firebase.");
  }
}

export async function addPresupuesto(presupuestoData: Omit<Presupuesto, 'id'>): Promise<Presupuesto> {
  // @ts-ignore
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    console.error("presupuestosService: addPresupuesto - Firestore (db) no está inicializado correctamente.");
    throw new Error("La base de datos (Firestore) no está inicializada correctamente para agregar el presupuesto.");
  }
  try {
    // Ensure all data is serializable and in correct format
    const dataToSave = {
      ...presupuestoData,
      fecha: typeof presupuestoData.fecha === 'string' ? presupuestoData.fecha : new Date(presupuestoData.fecha).toISOString().split('T')[0],
      totalPresupuesto: Number(presupuestoData.totalPresupuesto) || 0,
      detalles: (presupuestoData.detalles || []).map(d => ({...d})) // Ensure it's a plain object array
    };
    const docRef = await addDoc(collection(db, PRESUPUESTOS_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave } as Presupuesto;
  } catch (error) {
    console.error("Error al agregar el presupuesto: ", error);
    throw new Error("No se pudo agregar el presupuesto. Verifique los datos y las reglas de seguridad de Firebase.");
  }
}

export async function updatePresupuesto(id: string, presupuestoData: Partial<Omit<Presupuesto, 'id'>>): Promise<void> {
  // @ts-ignore
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    console.error("presupuestosService: updatePresupuesto - Firestore (db) no está inicializado correctamente.");
    throw new Error("La base de datos (Firestore) no está inicializada correctamente para actualizar el presupuesto.");
  }
  try {
    const docRef = doc(db, PRESUPUESTOS_COLLECTION, id);
    const dataToUpdate = { ...presupuestoData };
    if (dataToUpdate.fecha && typeof dataToUpdate.fecha !== 'string') {
        dataToUpdate.fecha = new Date(dataToUpdate.fecha).toISOString().split('T')[0];
    }
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error(`Error al actualizar el presupuesto con ID ${id}:`, error);
    throw new Error("No se pudo actualizar el presupuesto. Verifique los datos y las reglas de seguridad de Firebase.");
  }
}

export async function deletePresupuesto(id: string): Promise<void> {
  // @ts-ignore
  if (!db || !('type' in db) || (db as any).type !== 'firestore') {
    console.error("presupuestosService: deletePresupuesto - Firestore (db) no está inicializado correctamente.");
    throw new Error("La base de datos (Firestore) no está inicializada correctamente para eliminar el presupuesto.");
  }
  try {
    const docRef = doc(db, PRESUPUESTOS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error al eliminar el presupuesto con ID ${id}:`, error);
    throw new Error("No se pudo eliminar el presupuesto. Verifique la conexión y las reglas de seguridad de Firebase.");
  }
}
