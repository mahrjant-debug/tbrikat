import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from '@firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import { normalizeSettings } from './defaults';
import type { BannedWord, Congrat, CongratStatus, Partner, Photo, Settings } from './types';

type Raw = Record<string, unknown>;

function toMs(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return 0;
}

function mapCongrat(d: QueryDocumentSnapshot<DocumentData>): Congrat {
  // 'estimate' يمنع ظهور null للتهاني التي لم يؤكد الخادم وقتها بعد
  const x = d.data({ serverTimestamps: 'estimate' }) as Raw;
  return {
    id: d.id,
    name: String(x.name ?? ''),
    text: String(x.text ?? ''),
    status: (x.status as CongratStatus) ?? 'pending',
    createdAt: toMs(x.createdAt),
    approvedAt: x.approvedAt ? toMs(x.approvedAt) : undefined,
    displayDuration: typeof x.displayDuration === 'number' ? x.displayDuration : undefined,
  };
}

function errCb(scope: string) {
  return (e: unknown) => handleFirestoreError(scope, e);
}

// ---------------- اشتراكات (listeners) ----------------

export function subscribeSettings(cb: (s: Settings, exists: boolean) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'settings', 'global'),
    (snap) => cb(normalizeSettings(snap.data() as Raw | undefined), snap.exists()),
    errCb('settings'),
  );
}

export function subscribeAsset(name: 'logo' | 'background', cb: (dataUrl: string) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'settings', name),
    (snap) => cb(String((snap.data() as Raw | undefined)?.dataUrl ?? '')),
    errCb(`asset:${name}`),
  );
}

export function subscribeBannedWords(cb: (words: BannedWord[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'bannedWords'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, word: String((d.data() as Raw).word ?? '') }))),
    errCb('bannedWords'),
  );
}

/** التهاني المعتمدة فقط (بدون فهرس مركّب؛ الترتيب في الواجهة) */
export function subscribeApproved(cb: (list: Congrat[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'congratulations'), where('status', '==', 'approved')),
    (snap) => cb(snap.docs.map(mapCongrat)),
    errCb('approved'),
  );
}

export function subscribeAllCongrats(
  cb: (list: Congrat[], meta: { fromCache: boolean; added: Congrat[] }) => void,
): Unsubscribe {
  // includeMetadataChanges: بدونه لا تصلنا لقطة «انتقلت من الكاش إلى الخادم» إن لم تتغير البيانات،
  // فلا نعرف متى اكتمل خط الأساس وقد نفوّت أول تهنئة جديدة
  return onSnapshot(
    query(collection(db, 'congratulations'), orderBy('createdAt', 'desc'), limit(600)),
    { includeMetadataChanges: true },
    (snap) => {
      const added = snap.docChanges().filter((c) => c.type === 'added').map((c) => mapCongrat(c.doc));
      cb(snap.docs.map(mapCongrat), { fromCache: snap.metadata.fromCache, added });
    },
    errCb('congratulations'),
  );
}

export function subscribePhotos(cb: (list: Photo[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'photos'), orderBy('order', 'asc')),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const x = d.data({ serverTimestamps: 'estimate' }) as Raw;
          return {
            id: d.id,
            dataUrl: String(x.dataUrl ?? ''),
            name: String(x.name ?? ''),
            order: typeof x.order === 'number' ? x.order : 0,
            createdAt: toMs(x.createdAt),
          };
        }),
      ),
    errCb('photos'),
  );
}

export function subscribePartners(cb: (list: Partner[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'partners'), orderBy('order', 'asc')),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const x = d.data() as Raw;
          return {
            id: d.id,
            name: String(x.name ?? ''),
            category: String(x.category ?? ''),
            logo: String(x.logo ?? ''),
            order: typeof x.order === 'number' ? x.order : 0,
          };
        }),
      ),
    errCb('partners'),
  );
}

/** عدّاد تجميعي رخيص (لا يقرأ الوثائق نفسها) — مرة عند الفتح ومرة بعد كل إرسال */
export async function countCongratulations(): Promise<number | null> {
  try {
    const snap = await getCountFromServer(collection(db, 'congratulations'));
    return snap.data().count;
  } catch (e) {
    handleFirestoreError('count', e);
    return null;
  }
}

// ---------------- كتابة: الضيوف ----------------

export async function submitCongrat(name: string, text: string, status: CongratStatus): Promise<void> {
  await addDoc(collection(db, 'congratulations'), { name, text, status, createdAt: serverTimestamp() });
}

// ---------------- كتابة: المشرف ----------------

export async function setCongratStatus(id: string, status: CongratStatus): Promise<void> {
  const patch: Raw = { status };
  if (status === 'approved') patch.approvedAt = serverTimestamp();
  await updateDoc(doc(db, 'congratulations', id), patch);
}

export async function updateCongrat(
  id: string,
  patch: { name: string; text: string; displayDuration?: number },
): Promise<void> {
  await updateDoc(doc(db, 'congratulations', id), {
    name: patch.name,
    text: patch.text,
    displayDuration: patch.displayDuration && patch.displayDuration > 0 ? patch.displayDuration : null,
  });
}

export async function deleteCongrat(id: string): Promise<void> {
  await deleteDoc(doc(db, 'congratulations', id));
}

/** تحديث جماعي: [id, الحالة الجديدة] — على دفعات من 400 */
export async function batchSetStatus(items: { id: string; status: CongratStatus }[]): Promise<void> {
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(db);
    for (const it of items.slice(i, i + 400)) {
      const patch: Raw = { status: it.status };
      if (it.status === 'approved') patch.approvedAt = serverTimestamp();
      batch.update(doc(db, 'congratulations', it.id), patch);
    }
    await batch.commit();
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  // مفتاح تشغيل التسليط يُكتب فقط من زر «تسليط الضوء»؛ حفظ الإعدادات لا يلمسه حتى لا يُعيد تشغيله
  const { spotlightTriggerAt: _t, spotlightPhotoId: _p, ...rest } = s;
  void _t;
  void _p;
  await setDoc(doc(db, 'settings', 'global'), rest, { merge: true });
}

export async function patchSettings(patch: Partial<Settings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'global'), patch, { merge: true });
}

export async function saveAsset(name: 'logo' | 'background', dataUrl: string): Promise<void> {
  await setDoc(doc(db, 'settings', name), { dataUrl, updatedAt: serverTimestamp() });
}

export async function triggerSpotlight(photoId: string): Promise<number> {
  const at = Date.now();
  await setDoc(doc(db, 'settings', 'global'), { spotlightTriggerAt: at, spotlightPhotoId: photoId }, { merge: true });
  return at;
}

export async function addBannedWords(words: string[]): Promise<void> {
  const batch = writeBatch(db);
  for (const word of words) batch.set(doc(collection(db, 'bannedWords')), { word, createdAt: serverTimestamp() });
  await batch.commit();
}

export async function deleteBannedWord(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bannedWords', id));
}

export async function addPhoto(dataUrl: string, order: number, name = ''): Promise<void> {
  await addDoc(collection(db, 'photos'), { dataUrl, name, order, createdAt: serverTimestamp() });
}

export async function updatePhotoName(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'photos', id), { name });
}

export async function deletePhoto(id: string): Promise<void> {
  await deleteDoc(doc(db, 'photos', id));
}

/** حذف كل الصور على دفعات من 400 */
export async function deleteAllPhotos(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + 400)) batch.delete(doc(db, 'photos', id));
    await batch.commit();
  }
}

export async function swapOrder(
  coll: 'photos' | 'partners',
  a: { id: string; order: number },
  b: { id: string; order: number },
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, coll, a.id), { order: b.order });
  batch.update(doc(db, coll, b.id), { order: a.order });
  await batch.commit();
}

export async function savePartner(
  id: string | null,
  data: { name: string; category: string; logo: string },
  order: number,
): Promise<void> {
  if (id) await updateDoc(doc(db, 'partners', id), data);
  else await addDoc(collection(db, 'partners'), { ...data, order, createdAt: serverTimestamp() });
}

export async function deletePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, 'partners', id));
}
