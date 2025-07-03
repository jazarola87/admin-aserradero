// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCZGNWlB1BwJcsVbSCEWgdp6ZrBMqSQeek",
  authDomain: "administrador-de-aserrad-444b3.firebaseapp.com",
  projectId: "administrador-de-aserrad-444b3",
  storageBucket: "administrador-de-aserrad-444b3.appspot.com",
  messagingSenderId: "541305047586",
  appId: "1:541305047586:web:2f070fe1f2345a94ef187b",
  measurementId: "G-RGGZ6FLVD9"
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export { app, db, auth };