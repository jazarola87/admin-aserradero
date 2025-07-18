// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration
// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO DE FIREBASE
export const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_AUTH_DOMAIN_AQUI",
  projectId: "TU_PROJECT_ID_AQUI",
  storageBucket: "TU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUI",
  appId: "TU_APP_ID_AQUI",
  measurementId: "TU_MEASUREMENT_ID_AQUI"
};

// Function to safely check if all config keys are present
const isFirebaseConfigComplete = (config: typeof firebaseConfig): boolean => {
  return !!config.apiKey && !!config.authDomain && !!config.projectId;
};


// Initialize Firebase for SSR
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

// Only initialize if the config is complete
if (isFirebaseConfigComplete(firebaseConfig) && firebaseConfig.apiKey !== "TU_API_KEY_AQUI") {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  auth = getAuth(app);

  // Enable offline persistence only on the client-side
  if (typeof window !== 'undefined') {
    try {
      enableIndexedDbPersistence(db)
        .then(() => {
          console.log("Persistencia offline de Firestore habilitada.");
        })
        .catch((err) => {
          if (err.code == 'failed-precondition') {
            console.warn("La persistencia de Firestore no se pudo habilitar. Es probable que ya esté activa en otra pestaña.");
          } else if (err.code == 'unimplemented') {
            console.warn("El navegador actual no soporta la persistencia offline de Firestore.");
          }
        });
    } catch (error) {
      console.error("Error al intentar habilitar la persistencia de Firestore:", error);
    }
  }
} else {
  console.warn("La configuración de Firebase está incompleta o usa valores de placeholder. La inicialización de Firebase se omitirá.");
  // Provide dummy instances if initialization is skipped to avoid crashing the app
  // @ts-ignore
  app = {};
  // @ts-ignore
  db = {};
  // @ts-ignore
  auth = {};
}


export { app, db, auth };
