/**
 * Persistencia Firestore + export helpers
 * Preparado para aiRecommendations (OpenAI) en el futuro.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAclvp8IB1SS_7rnv5MVAE3kIfR6Rz6ahg',
  authDomain: 'paginaweb-cf486.firebaseapp.com',
  projectId: 'paginaweb-cf486',
  appId: '1:136417590997:web:6ae1e65956018d8f77ec5c'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const COL = 'arquetipos_test';

export async function saveResult(payload) {
  const docPayload = {
    ...payload,
    aiRecommendations: null,
    createdAt: serverTimestamp(),
    clientCreatedAt: new Date().toISOString()
  };
  try {
    const ref = await addDoc(collection(db, COL, 'data', 'results'), docPayload);
    localStorage.setItem('raices_last_result_id', ref.id);
    return { ok: true, id: ref.id };
  } catch (err) {
    console.warn('Firestore save failed, keeping local backup', err);
    localStorage.setItem('raices_last_result', JSON.stringify(docPayload));
    return { ok: false, error: err.message, local: true };
  }
}

export async function fetchResults(max = 100) {
  const q = query(collection(db, COL, 'data', 'results'), orderBy('clientCreatedAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function upsertQuestion(question) {
  const id = String(question.id);
  await setDoc(doc(db, COL, 'data', 'questions', id), question, { merge: true });
}

export async function removeQuestion(id) {
  await deleteDoc(doc(db, COL, 'data', 'questions', String(id)));
}

export async function fetchRemoteQuestions() {
  const snap = await getDocs(collection(db, COL, 'data', 'questions'));
  return snap.docs.map((d) => d.data()).sort((a, b) => a.id - b.id);
}

export async function upsertArchetype(archetype) {
  await setDoc(doc(db, COL, 'data', 'archetypes', archetype.id), archetype, { merge: true });
}

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function adminLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  return signOut(auth);
}

export function resultsToCsv(rows) {
  const headers = [
    'id', 'name', 'email', 'whatsapp', 'tiktok', 'primary', 'secondary', 'affinity', 'level', 'durationMs', 'durationLabel', 'clientCreatedAt'
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        csv(r.name),
        csv(r.email),
        csv(r.whatsapp),
        csv(r.tiktok),
        csv(r.primary),
        csv(r.secondary),
        r.affinity,
        csv(r.level?.label || r.level),
        r.durationMs,
        csv(r.durationLabel),
        csv(r.clientCreatedAt)
      ].join(',')
    );
  }
  return lines.join('\n');
}

/** Una fila por respuesta — para ver exactamente qué eligió cada persona */
export function resultsToCsvFull(rows, questionsMap = {}) {
  const headers = [
    'resultId', 'name', 'email', 'whatsapp', 'primary', 'affinity',
    'questionId', 'question', 'answerLetter', 'answerText', 'archetype', 'clientCreatedAt'
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const answers = r.answers || [];
    if (!answers.length) {
      lines.push([
        r.id, csv(r.name), csv(r.email), csv(r.whatsapp), csv(r.primary), r.affinity,
        '', '', '', '', '', csv(r.clientCreatedAt)
      ].join(','));
      continue;
    }
    for (const ans of answers) {
      const q = questionsMap[ans.questionId];
      const chosen = q?.answers?.find((a) => a.letter === ans.letter);
      lines.push([
        r.id,
        csv(r.name),
        csv(r.email),
        csv(r.whatsapp),
        csv(r.primary),
        r.affinity,
        ans.questionId,
        csv(q?.question || ''),
        csv(ans.letter),
        csv(chosen?.text || ''),
        csv(ans.archetype),
        csv(r.clientCreatedAt)
      ].join(','));
    }
  }
  return lines.join('\n');
}

function csv(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
