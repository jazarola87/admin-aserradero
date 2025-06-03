
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCZGNWlB1BwJcsVbSCEWgdp6ZrBMqSQeek",
  authDomain: "administrador-de-aserrad-444b3.firebaseapp.com",
  projectId: "administrador-de-aserrad-444b3",
  storageBucket: "administrador-de-aserrad-444b3.appspot.com", // Corrected to .appspot.com
  messagingSenderId: "541305047586",
  appId: "1:541305047586:web:2f070fe1f2345a94ef187b",
  measurementId: "G-RGGZ6FLVD9"
};

// Initialize Firebase
export let app: FirebaseApp;
export let db: Firestore;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      console.log("Firebase (Client): Initialized successfully.");
    } catch (error) {
      console.error("Firebase (Client): Initialization Error", error);
      // @ts-ignore Assign error state for easier debugging if needed client-side
      db = { type: 'firestore-error-client-init', error: error } as Firestore; 
    }
  } else {
    app = getApps()[0];
    try {
      db = getFirestore(app);
      console.log("Firebase (Client): Re-using existing app instance.");
    } catch (error) {
      console.error("Firebase (Client): Error getting services from existing app", error);
      // @ts-ignore
      db = { type: 'firestore-error-client-existing', error: error } as Firestore;
    }
  }
} else {
  // Server-side or build-time initialization (simplified)
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      console.log("Firebase (Server/Build): Initialized successfully.");
    } catch (error) {
      console.error("Firebase (Server/Build): Initialization Error", error);
       // @ts-ignore
      db = { type: 'firestore-error-server-init', error: error } as Firestore;
    }
  } else {
    app = getApps()[0];
    try {
      db = getFirestore(app);
      console.log("Firebase (Server/Build): Re-using existing app instance.");
    } catch (error) {
      console.error("Firebase (Server/Build): Error getting services from existing app", error);
      // @ts-ignore
      db = { type: 'firestore-error-server-existing', error: error } as Firestore;
    }
  }
}

// @ts-ignore For debugging: Check the type of db right before export
console.log("Firebase Config (config.ts): db object type before export:", db && (db as any).type ? (db as any).type : (db ? 'Valid Firestore Instance' : 'Undefined DB Object'));
