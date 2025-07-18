// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration is now read from environment variables
// These are automatically provided by Firebase App Hosting.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
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
  console.warn("La configuración de Firebase está incompleta. La inicialización de Firebase se omitirá. Esto puede ser normal durante el proceso de build, pero es un error en producción.");
  // Provide dummy instances if initialization is skipped to avoid crashing the app
  // @ts-ignore
  app = {};
  // @ts-ignore
  db = {};
  // @ts-ignore
  auth = {};
}


export { app, db, auth };
