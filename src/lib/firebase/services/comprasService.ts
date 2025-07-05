/**
 * @fileOverview Firestore service for Compra (Purchases) documents.
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
  Timestamp,
} from 'firebase/firestore';
import type { Compra } from '@/types';

const COMPRAS_COLLECTION = 'compras';

// Helper function to convert Firestore doc data to Compra
const mapDocToCompra = (document: any): Compra => {
  const data = document.data();
  if (!data) {
    throw new Error(`Documento vacío o sin datos para ID: ${document.id}`);
  }
  
  return {
    id: document.id,
    fecha: data.fecha, // Assume string "yyyy-MM-dd"
    tipoMadera: data.tipoMadera,
    volumen: Number(data.volumen) || 0,
    precioPorMetroCubico: data.precioPorMetroCubico !== undefined ? Number(data.precioPorMetroCubico) : undefined,
    costo: Number(data.costo) || 0,
    proveedor: data.proveedor,
    telefonoProveedor: data.telefonoProveedor || undefined,
  } as Compra;
};

export async function getAllCompras(): Promise<Compra[]> {
  if (!db) {
    console.error("comprasService: Firestore (db) no está inicializado.");
    return [];
  }
  try {
    const comprasCollection = collection(db, COMPRAS_COLLECTION);
    const q = query(comprasCollection, orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    const comprasList = querySnapshot.docs.map(mapDocToCompra);
    return comprasList;
  } catch (error) {
    console.error("Error fetching all compras, returning empty array.", error);
    return [];
  }
}

export async function getCompraById(id: string): Promise<Compra | null> {
  if (!db) {
    console.error("comprasService: Firestore (db) no está inicializado.");
    throw new Error("La base de datos (Firestore) no está disponible.");
  }
  try {
    const docRef = doc(db, COMPRAS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapDocToCompra(docSnap);
    } else {
      console.log(`No such compra document with ID: ${id}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching compra by ID ${id}: `, error);
    throw new Error("No se pudo obtener la compra.");
  }
}

export async function addCompra(compraData: Omit<Compra, 'id'>): Promise<Compra> {
  if (!db) {
    console.error("comprasService: Firestore (db) no está inicializado.");
    throw new Error("La base de datos (Firestore) no está disponible.");
  }
  try {
    const dataToSave = {
      ...compraData,
      fecha: typeof compraData.fecha === 'string' ? compraData.fecha : new Date(compraData.fecha).toISOString().split('T')[0],
    };
    const docRef = await addDoc(collection(db, COMPRAS_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave } as Compra;
  } catch (error) {
    console.error("Error adding compra: ", error);
    throw new Error("No se pudo agregar la compra.");
  }
}

export async function updateCompra(id: string, compraData: Partial<Omit<Compra, 'id'>>): Promise<void> {
  if (!db) {
    console.error("comprasService: Firestore (db) no está inicializado.");
    throw new Error("La base de datos (Firestore) no está disponible.");
  }
  try {
    const docRef = doc(db, COMPRAS_COLLECTION, id);
    const dataToUpdate = { ...compraData };
    if (dataToUpdate.fecha && typeof dataToUpdate.fecha !== 'string') {
      dataToUpdate.fecha = new Date(dataToUpdate.fecha).toISOString().split('T')[0];
    }
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error(`Error updating compra with ID ${id}: `, error);
    throw new Error("No se pudo actualizar la compra.");
  }
}

export async function deleteCompra(id: string): Promise<void> {
  if (!db) {
    console.error("comprasService: Firestore (db) no está inicializado.");
    throw new Error("La base de datos (Firestore) no está disponible.");
  }
  try {
    const docRef = doc(db, COMPRAS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting compra with ID ${id}: `, error);
    throw new Error("No se pudo eliminar la compra.");
  }
}
