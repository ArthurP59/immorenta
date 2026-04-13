import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { deleteAllUserSimulations } from '@/lib/simulations';

export function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function deleteAccountAndUserData() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Aucun utilisateur connecté.');
  }

  const userId = currentUser.uid;

  await deleteAllUserSimulations(userId);
  await deleteUser(currentUser);
}