// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCWfewzRFvoR9Jv16cK5vFL63i7U_onrv0",
  authDomain: "aserradero-lhm-336e9.firebaseapp.com",
  projectId: "aserradero-lhm-336e9",
  storageBucket: "aserradero-lhm-336e9.appspot.com",
  messagingSenderId: "453456443377",
  appId: "1:453456443377:web:44c4aa9ab6618215b77650",
  measurementId: "G-HCGK19WQDQ"
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export { app, db, auth };
