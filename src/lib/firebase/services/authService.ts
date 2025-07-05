import { auth } from '@/lib/firebase/config';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type UserCredential,
} from 'firebase/auth';

/**
 * Signs in a user with email and password.
 * @param email The user's email.
 * @param password The user's password.
 * @returns A promise that resolves with the user's credential.
 */
export const signIn = (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Signs out the current user.
 * @returns A promise that resolves when the user is signed out.
 */
export const signOut = (): Promise<void> => {
  return firebaseSignOut(auth);
};
