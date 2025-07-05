/**
 * @fileOverview Firestore service for Compra (Purchases) documents.
 */
import { db } from '@/lib/firebase/config'; // Firestore instance, ensure alias is used
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
  // serverTimestamp, // No se usa actualmente
  // setDoc // No se usa actualmente
} from 'firebase/firestore';
import type { Compra } from '@/types';

const COMPRAS_COLLECTION = 'compras';

// Helper function to convert Firestore doc data to Compra
const mapDocToCompra = (document: any): Compra => {
  const data = document.data();
  if (!data) {
    // Esto no debería ocurrir si docSnap.exists() es true, pero es una guarda.
    throw new Error(`Documento vacío o sin datos para ID: ${document.id}`);
  }
  
  // Asumimos que 'fecha' se guarda como string "yyyy-MM-dd" en Firestore.
  // Si se guardara como Firestore Timestamp, se necesitaría conversión:
  // const fechaFromDB = data.fecha;
  // let fechaString: string;
  // if (fechaFromDB instanceof Timestamp) {
  //   fechaString = fechaFromDB.toDate().toISOString().split('T')[0];
  // } else if (typeof fechaFromDB === 'string') {
  //   fechaString = fechaFromDB; // Asumir formato correcto
  // } else {
  //   console.warn(`Fecha inválida o faltante para compra ID ${document.id}, usando fecha actual.`);
  //   fechaString = new Date().toISOString().split('T')[0];
  // }

  return {
    id: document.id,
    fecha: data.fecha, // Asumir que es string "yyyy-MM-dd"
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
    console.error("comprasService: getAllCompras - Firestore (db) no está inicializado correctamente.");
    return [];
  }
  try {
    const comprasCollection = collection(db, COMPRAS_COLLECTION);
    const q = query(comprasCollection, orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    const comprasList = querySnapshot.docs.map(mapDocToCompra);
    return comprasList;
  } catch (error) {
    console.error("Error fetching all compras, returning empty array. This might be due to missing indexes or permissions on a new project.", error);
    return [];
  }
}

export async function getCompraById(id: string): Promise<Compra | null> {
  if (!db) {
      console.error("comprasService: getCompraById - Firestore (db) no está inicializado correctamente.");
      throw new Error("Firestore (db) no está inicializado correctamente para getCompraById.");
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
      console.error("comprasService: addCompra - Firestore (db) no está inicializado correctamente.");
      throw new Error("Firestore (db) no está inicializado correctamente para addCompra.");
  }
  try {
    // Asegurarse que fecha es string "yyyy-MM-dd"
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
      console.error("comprasService: updateCompra - Firestore (db) no está inicializado correctamente.");
      throw new Error("Firestore (db) no está inicializado correctamente para updateCompra.");
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
      console.error("comprasService: deleteCompra - Firestore (db) no está inicializado correctamente.");
      throw new Error("Firestore (db) no está inicializado correctamente para deleteCompra.");
  }
  try {
    const docRef = doc(db, COMPRAS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting compra with ID ${id}: `, error);
    throw new Error("No se pudo eliminar la compra.");
  }
}
