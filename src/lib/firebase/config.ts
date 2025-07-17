// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration is now read from environment variables
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase for SSR
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

// Enable offline persistence
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


export { app, db, auth };
