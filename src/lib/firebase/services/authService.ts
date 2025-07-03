'use server';

import { auth } from '@/lib/firebase/config';
import { 
    signInWithEmailAndPassword as firebaseSignIn, 
    signOut as firebaseSignOut 
} from 'firebase/auth';

export async function signInWithEmailAndPassword(email: string, password: string) {
    console.log(`Intentando iniciar sesión para el usuario: ${email} en el proyecto de Firebase: ${auth.app.options.projectId}`);
    try {
        const userCredential = await firebaseSignIn(auth, email, password);
        console.log(`Inicio de sesión exitoso para el usuario: ${email}`);
        return userCredential.user;
    } catch (error) {
        // Este log es crucial para el debug del lado del servidor.
        console.error(`Error de autenticación de Firebase para el usuario ${email}:`, error);
        throw error;
    }
}

export async function signOut() {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Error in signOut:", error);
        throw error;
    }
}
