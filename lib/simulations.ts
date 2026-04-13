import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScenarioInput } from '@/lib/calculations/contracts';

export type SavedSimulation = {
  id: string;
  userId: string;
  name: string;
  scenario: ScenarioInput;
  createdAt?: any;
  updatedAt?: any;
};

const COLLECTION_NAME = 'simulations';

function getSortValue(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string') return new Date(value).getTime();
  return 0;
}

export async function getSimulations(userId: string): Promise<SavedSimulation[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as any),
    }))
    .sort(
      (a, b) =>
        getSortValue(b.updatedAt ?? b.createdAt) -
        getSortValue(a.updatedAt ?? a.createdAt),
    ) as SavedSimulation[];
}

export async function createSimulation(
  userId: string,
  name: string,
  scenario: ScenarioInput,
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    userId,
    name,
    scenario,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function updateSimulation(
  simulationId: string,
  scenario: ScenarioInput,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, simulationId), {
    scenario,
    updatedAt: new Date().toISOString(),
  });
}

export async function renameSimulation(
  simulationId: string,
  name: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, simulationId), {
    name,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSimulation(simulationId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, simulationId));
}

export async function deleteAllUserSimulations(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
  );

  const snapshot = await getDocs(q);

  await Promise.all(snapshot.docs.map((docItem) => deleteDoc(docItem.ref)));
}