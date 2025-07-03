'use server';

import { auth } from '@/lib/firebase/config';
import { 
    signInWithEmailAndPassword as firebaseSignIn, 
    signOut as firebaseSignOut 
} from 'firebase/auth';

export async function signInWithEmailAndPassword(email: string, password: string) {
    try {
        const userCredential = await firebaseSignIn(auth, email, password);
        return userCredential.user;
    } catch (error) {
        // The error is intentionally not logged here.
        // It's caught and handled by the UI component, which shows a toast to the user.
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
