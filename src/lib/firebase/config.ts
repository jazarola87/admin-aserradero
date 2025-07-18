// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration
// REEMPLAZA "TU_API_KEY_AQUI" CON TU CLAVE REAL DE FIREBASE
export const firebaseConfig = {
  apiKey: "AIzaSyBqKPxyK_nfaQQXqvCV6bxkowgxv57kpVc",
  authDomain: "aserradero-lhm-336e9.firebaseapp.com",
  projectId: "aserradero-lhm-336e9",
  storageBucket: "aserradero-lhm-336e9.appspot.com",
  messagingSenderId: "453456443377",
  appId: "1:453456443377:web:44c4aa9ab6618215b77650",
  measurementId: "G-HCGK19WQDQ"
};

// Function to safely check if all config keys are present
const isFirebaseConfigComplete = (config: typeof firebaseConfig): boolean => {
  return !!config.apiKey && config.apiKey !== "TU_API_KEY_AQUI" && !!config.authDomain && !!config.projectId;
};


// Initialize Firebase for SSR
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

// Only initialize if the config is complete
if (isFirebaseConfigComplete(firebaseConfig)) {
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
