/**
 * @fileOverview Firestore service for StockMaderaAserrada documents.
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
import type { StockMaderaAserrada } from '@/types';

const STOCK_COLLECTION = 'stockMaderaAserrada';

// Helper function to convert Firestore doc data to StockMaderaAserrada
const mapDocToStockEntry = (document: any): StockMaderaAserrada => {
  const data = document.data();
  if (!data) {
    throw new Error(`Documento vacío o sin datos para ID: ${document.id}`);
  }
  
  return {
    id: document.id,
    fecha: data.fecha, // Assume string "yyyy-MM-dd"
    detalles: data.detalles || [],
    totalPiesTablares: Number(data.totalPiesTablares) || 0,
    costoAserrioSnapshot: Number(data.costoAserrioSnapshot) || 0,
    notas: data.notas || undefined,
  } as StockMaderaAserrada;
};

export async function getAllStockEntries(): Promise<StockMaderaAserrada[]> {
  if (!db) {
    console.error("stockService: Firestore (db) no está inicializado.");
    return [];
  }
  try {
    const stockCollection = collection(db, STOCK_COLLECTION);
    const q = query(stockCollection, orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    const stockList = querySnapshot.docs.map(mapDocToStockEntry);
    return stockList;
  } catch (error) {
    console.error("Error fetching all stock entries, returning empty array.", error);
    return [];
  }
}

export async function addStockEntry(stockData: Omit<StockMaderaAserrada, 'id'>): Promise<StockMaderaAserrada> {
  if (!db) {
    console.error("stockService: Firestore (db) no está inicializado.");
    throw new Error("La base de datos (Firestore) no está disponible.");
  }
  try {
    const dataToSave = {
      ...stockData,
      fecha: typeof stockData.fecha === 'string' ? stockData.fecha : new Date(stockData.fecha).toISOString().split('T')[0],
    };
    const docRef = await addDoc(collection(db, STOCK_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave } as StockMaderaAserrada;
  } catch (error) {
    console.error("Error adding stock entry: ", error);
    throw new Error("No se pudo agregar el ingreso de stock.");
  }
}

export async function deleteStockEntry(id: string): Promise<void> {
  if (!db) {
    console.error("stockService: Firestore (db) no está inicializado.");
    throw new Error("La base de datos (Firestore) no está disponible.");
  }
  try {
    const docRef = doc(db, STOCK_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting stock entry with ID ${id}: `, error);
    throw new Error("No se pudo eliminar el ingreso de stock.");
  }
}
