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
  where,
  writeBatch,
} from 'firebase/firestore';
import type { StockMaderaAserrada, Venta } from '@/types';
import { getAppConfig } from './configuracionService';


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
    idVentaConsumo: data.idVentaConsumo || undefined,
    nombreClienteConsumo: data.nombreClienteConsumo || undefined,
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

export interface StockSummaryItem {
  key: string; // e.g., "Pino-2-4-3.05-false"
  tipoMadera: string;
  alto: number;
  ancho: number;
  largo: number;
  cepillado: boolean;
  unidades: number;
}

export async function getStockSummary(): Promise<StockSummaryItem[]> {
  const allEntries = await getAllStockEntries();
  const summaryMap = new Map<string, StockSummaryItem>();

  (allEntries || []).forEach(entry => {
      (entry.detalles || []).forEach(detalle => {
          if (!detalle.tipoMadera || !detalle.alto || !detalle.ancho || !detalle.largo || !detalle.unidades) return;
          const cepillado = !!detalle.cepillado;
          const key = `${detalle.tipoMadera}-${detalle.alto}-${detalle.ancho}-${detalle.largo}-${cepillado}`;
          
          const existing = summaryMap.get(key);
          if (existing) {
              existing.unidades += detalle.unidades;
          } else {
              summaryMap.set(key, {
                  key,
                  tipoMadera: detalle.tipoMadera,
                  alto: detalle.alto,
                  ancho: detalle.ancho,
                  largo: detalle.largo,
                  cepillado: cepillado,
                  unidades: detalle.unidades,
              });
          }
      });
  });

  return Array.from(summaryMap.values()).filter(item => item.unidades > 0);
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

export async function revertStockConsumption(ventaId: string): Promise<void> {
  if (!db) {
    console.error("stockService: Firestore (db) no está inicializado.");
    throw new Error("La base de datos (Firestore) no está disponible.");
  }
  try {
    const stockCollection = collection(db, STOCK_COLLECTION);
    const q = query(stockCollection, where("idVentaConsumo", "==", ventaId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return; // No previous consumption to revert
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error(`Error reverting stock consumption for Venta ID ${ventaId}:`, error);
  }
}

export async function consumeStockForSale(venta: Venta): Promise<void> {
  if (!db) {
    console.error("stockService: Firestore (db) no está inicializado.");
    throw new Error("La base de datos no está disponible.");
  }
  
  const stockItemsToConsume = venta.detalles.filter(d => d.unidadesDeStock && d.unidadesDeStock > 0);
  if (stockItemsToConsume.length === 0) {
    return;
  }
  
  const stockSummary = await getStockSummary();
  const config = await getAppConfig();
  const batch = writeBatch(db);

  for (const detalle of stockItemsToConsume) {
    const { tipoMadera, alto, ancho, largo, cepillado } = detalle;
    const unidadesDeStock = detalle.unidadesDeStock;
    if (!tipoMadera || !alto || !ancho || !largo || !unidadesDeStock) continue;

    const availableSources = stockSummary
      .filter(s => {
        if (
          s.tipoMadera !== tipoMadera ||
          s.alto !== alto ||
          s.ancho !== ancho ||
          s.largo < (largo || 0) ||
          s.unidades <= 0
        ) return false;
        
        // If sale item is cepillado, we can use both cepillado and non-cepillado stock.
        // If sale item is NOT cepillado, we can ONLY use non-cepillado stock.
        return cepillado ? true : !s.cepillado;
      })
      .sort((a, b) => {
        // 1. Prioritize shorter lengths first (to use up smaller pieces)
        if (a.largo < b.largo) return -1;
        if (a.largo > b.largo) return 1;

        // 2. If lengths are equal and sale is cepillado, prioritize consuming existing cepillado stock first
        if (cepillado) {
          if (a.cepillado && !b.cepillado) return -1;
          if (!a.cepillado && b.cepillado) return 1;
        }
        
        return 0;
      });

    let unitsToConsume = unidadesDeStock;

    for (const source of availableSources) {
      if (unitsToConsume <= 0) break;

      const unitsFromThisSource = Math.min(unitsToConsume, source.unidades);
      
      const piesTablaresPorUnidad = source.alto * source.ancho * source.largo * 0.2734;
      const totalPiesTablaresConsumidos = piesTablaresPorUnidad * unitsFromThisSource;

      const precioNafta = Number(config.precioLitroNafta) || 0;
      const precioAfilado = Number(config.precioAfiladoSierra) || 0;
      const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
      const costoAjustado = costoOperativoBase * 1.38;
      const costoPorPieAserrio = (costoAjustado > 0 && isFinite(costoAjustado)) ? costoAjustado / 600 : 0;
      const costoAserrioConsumido = totalPiesTablaresConsumidos * costoPorPieAserrio;

      const consumptionEntry: Omit<StockMaderaAserrada, 'id'> = {
        fecha: venta.fecha,
        detalles: [{
          ...source,
          unidades: -unitsFromThisSource,
          id: `con-${source.key}-${Date.now()}`
        }],
        totalPiesTablares: -totalPiesTablaresConsumidos,
        costoAserrioSnapshot: -costoAserrioConsumido,
        notas: `Consumo para Venta #${venta.id}`,
        idVentaConsumo: venta.id,
        nombreClienteConsumo: venta.nombreComprador,
      };
      
      const newDocRef = doc(collection(db, STOCK_COLLECTION));
      batch.set(newDocRef, consumptionEntry);

      source.unidades -= unitsFromThisSource;
      unitsToConsume -= unitsFromThisSource;
    }
    
    if (unitsToConsume > 0) {
      // This might be a race condition, so we just log a warning. The form validation should prevent this.
      console.warn(`Could not consume ${unitsToConsume} units of ${tipoMadera} for Venta #${venta.id} due to insufficient stock at time of saving.`);
    }
  }
  
  await batch.commit();
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
