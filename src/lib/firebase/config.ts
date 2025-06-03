
// Removed 'use client'; directive

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth'; // Not used currently
// import { getStorage } from 'firebase/storage'; // Not used currently

console.log("--- Firebase Config (config.ts) --- Evaluation START ---");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("Firebase Config Check - API Key:", firebaseConfig.apiKey ? "SET" : "MISSING!");
console.log("Firebase Config Check - Project ID:", firebaseConfig.projectId ? "SET" : "MISSING!");

// Initialize Firebase
export let app: FirebaseApp;
export let db: Firestore;
// export let auth; // Not used currently
// export let storage; // Not used currently

if (typeof window !== 'undefined' && !getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    // auth = getAuth(app); // Uncomment if needed
    // storage = getStorage(app); // Uncomment if needed
    console.log("Firebase (Client): Initialized and services obtained.");
  } catch (error) {
    console.error("Firebase (Client): Initialization Error", error);
    // @ts-ignore
    db = { type: 'firestore-error-client', error: error } as Firestore; // Assign error state
  }
} else if (getApps().length > 0) {
  app = getApps()[0];
  try {
    db = getFirestore(app);
    // auth = getAuth(app); // Uncomment if needed
    // storage = getStorage(app); // Uncomment if needed
    console.log("Firebase (Client/Server): Re-using existing app instance and services.");
  } catch (error) {
    console.error("Firebase (Client/Server): Error getting services from existing app", error);
    // @ts-ignore
    db = { type: 'firestore-error-existing-app', error: error } as Firestore; // Assign error state
  }
} else {
  // This case should ideally not be hit if !getApps().length is handled for server below,
  // but as a fallback for server-side only context where window is not defined.
  // This is a simplified server-side init, more robust server-side would use Admin SDK.
  try {
    app = initializeApp(firebaseConfig); // Initialize if no apps exist (could be server context)
    db = getFirestore(app);
    console.log("Firebase (Server-like context): Initialized and Firestore service obtained.");
  } catch (error) {
    console.error("Firebase (Server-like context): Initialization Error", error);
    // @ts-ignore
    db = { type: 'firestore-error-server-like', error: error } as Firestore; // Assign error state
  }
}
// @ts-ignore
console.log("--- Firebase Config (config.ts) --- DB Object before export:", db && db.type ? db.type : (db ? 'Valid Firestore Instance' : 'Undefined DB Object'));
console.log("--- Firebase Config (config.ts) --- Evaluation END ---");
