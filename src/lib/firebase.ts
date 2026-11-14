import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { UserProfile } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionChecked = false;
export async function testFirestoreConnection(): Promise<void> {
  if (connectionChecked) return;
  connectionChecked = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export async function signInWithGooglePopup(): Promise<{ user: User; idToken: string }> {
  const credential = await signInWithPopup(auth, googleAuthProvider);
  const idToken = await credential.user.getIdToken();
  return { user: credential.user, idToken };
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeFirebaseAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

function sanitizeId(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  return clean || 'fullstack-dev';
}

export async function syncUserWorkspaceToFirestore(
  user: User,
  profile: UserProfile,
): Promise<void> {
  if (!user.emailVerified || !user.uid) return;
  const userPath = `users/${user.uid}`;
  const privatePath = `users/${user.uid}/private/info`;

  const displayName = (profile.name || user.displayName || 'PathForge Learner').slice(0, 80);
  const headline = (profile.headline || 'Career Readiness Builder').slice(0, 160);
  const education = (profile.education || 'PathForge Academy').slice(0, 120);
  const targetCareerId = sanitizeId(profile.targetCareerId || 'fullstack-dev');
  const streakPoints = Math.max(0, Math.min(10000000, Math.round(profile.streakPoints || 0)));
  const streakDays = Math.max(0, Math.min(36500, Math.round(profile.streakDays || 1)));
  const gamesWon = Math.max(0, Math.min(1000000, Math.round(profile.gamesWon || 0)));
  const email = (user.email || profile.email || '').slice(0, 200);
  const authProvider =
    profile.authProvider === 'microsoft' || profile.authProvider === 'email'
      ? profile.authProvider
      : 'google';

  try {
    const userRef = doc(db, 'users', user.uid);
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');
    const existingSnap = await getDoc(userRef);

    if (!existingSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(userRef, {
        uid: user.uid,
        displayName,
        headline,
        education,
        targetCareerId,
        streakPoints,
        streakDays,
        gamesWon,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(privateRef, {
        uid: user.uid,
        email,
        authProvider,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      await updateDoc(userRef, {
        displayName,
        headline,
        education,
        targetCareerId,
        streakPoints,
        streakDays,
        gamesWon,
        updatedAt: serverTimestamp(),
      });
      const privSnap = await getDoc(privateRef);
      if (privSnap.exists()) {
        await updateDoc(privateRef, {
          email,
          authProvider,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(privateRef, {
          uid: user.uid,
          email,
          authProvider,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${userPath} (${privatePath})`);
  }
}

export async function logAssessmentToFirestore(
  user: User,
  input: {
    skillName: string;
    scorePct: number;
    remedialTriggered: boolean;
    notes?: string;
  },
): Promise<void> {
  if (!user.emailVerified || !user.uid) return;
  const docId = `assess-${Date.now()}`.slice(0, 128);
  const path = `users/${user.uid}/assessments/${docId}`;
  try {
    await setDoc(doc(collection(db, 'users', user.uid, 'assessments'), docId), {
      uid: user.uid,
      skillName: input.skillName.slice(0, 80) || 'General Skill',
      scorePct: Math.max(0, Math.min(100, Math.round(input.scorePct))),
      remedialTriggered: Boolean(input.remedialTriggered),
      notes: (input.notes || '').slice(0, 400),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
