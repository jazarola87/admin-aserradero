/**
 * @fileOverview Firestore service for application configuration.
 */
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { Configuracion } from '@/types';
import { defaultConfig } from '@/lib/config-data';

const CONFIG_COLLECTION = 'configuracion';
const CONFIG_DOC_ID = 'main';

/**
 * Fetches the application configuration from Firestore.
 * If no configuration document exists, it creates one with default values.
 * If a configuration document exists but is missing fields, it merges it with the defaults.
 * @returns {Promise<Configuracion>} The application configuration.
 */
export async function getAppConfig(): Promise<Configuracion> {
  if (!db) {
    console.error("configuracionService: Firestore (db) is not initialized.");
    // Return a structured, valid default config to prevent downstream errors
    return defaultConfig;
  }
  try {
    const configDocRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const docSnap = await getDoc(configDocRef);

    if (docSnap.exists()) {
      // Merge fetched data with defaults to ensure all keys are present
      const fetchedData = docSnap.data() as Partial<Configuracion>;
      return { ...defaultConfig, ...fetchedData };
    } else {
      // Config does not exist, so create it with default values
      console.log("No configuration found in Firestore. Creating new one with default values.");
      await setDoc(configDocRef, defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error("Error fetching or creating application configuration. This is likely a permissions issue on a new project. Falling back to local default config.", error);
    // On error, return the structured default config
    return defaultConfig;
  }
}

/**
 * Updates the application configuration in Firestore.
 * @param {Partial<Configuracion>} configData - The configuration fields to update.
 * @returns {Promise<void>}
 */
export async function updateAppConfig(configData: Partial<Configuracion>): Promise<void> {
   if (!db) {
    console.error("configuracionService: Firestore (db) is not initialized.");
    throw new Error("La base de datos no está disponible.");
  }
  try {
    const configDocRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    // When updating, we only send the partial data. Firestore's updateDoc will merge it.
    await updateDoc(configDocRef, configData);
  } catch (error) {
    console.error("Error updating application configuration: ", error);
    throw new Error("No se pudo actualizar la configuración de la aplicación.");
  }
}
