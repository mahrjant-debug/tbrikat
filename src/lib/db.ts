import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
import { normalizeSettings, normalizeVideoConfig } from './defaults';
import type { AdminProfile, BannedWord, Congrat, CongratStatus, Partner, Photo, Settings, Video, VideoConfig } from './types';

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

export type AssetName = 'logo' | 'background' | 'footer';

export function subscribeAsset(name: AssetName, cb: (dataUrl: string) => void): Unsubscribe {
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
            message: String(x.message ?? ''),
            order: typeof x.order === 'number' ? x.order : 0,
          };
        }),
      ),
    errCb('partners'),
  );
}

export function subscribeVideos(cb: (list: Video[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'videos'), orderBy('order', 'asc')),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const x = d.data({ serverTimestamps: 'estimate' }) as Raw;
          return {
            id: d.id,
            title: String(x.title ?? ''),
            videoId: String(x.videoId ?? ''),
            start: typeof x.start === 'number' ? x.start : 0,
            scheduleAt: typeof x.scheduleAt === 'number' ? x.scheduleAt : 0,
            durationSec: typeof x.durationSec === 'number' ? x.durationSec : 0,
            repeatCount: typeof x.repeatCount === 'number' && x.repeatCount >= 1 ? x.repeatCount : 1,
            repeatEveryMin: typeof x.repeatEveryMin === 'number' && x.repeatEveryMin >= 1 ? x.repeatEveryMin : 10,
            repeatUntil: typeof x.repeatUntil === 'number' && x.repeatUntil > 0 ? x.repeatUntil : 0,
            enabled: x.enabled !== false,
            order: typeof x.order === 'number' ? x.order : 0,
            createdAt: toMs(x.createdAt),
          };
        }),
      ),
    errCb('videos'),
  );
}

export function subscribeVideoConfig(cb: (c: VideoConfig) => void): Unsubscribe {
  return onSnapshot(doc(db, 'settings', 'video'), (snap) => cb(normalizeVideoConfig(snap.data() as Raw | undefined)), errCb('videoConfig'));
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
  const { spotlightTriggerAt: _t, spotlightPhotoId: _p, sponsorTriggerAt: _s, sponsorTriggerId: _i, ...rest } = s;
  void _t;
  void _p;
  void _s;
  void _i;
  await setDoc(doc(db, 'settings', 'global'), rest, { merge: true });
}

export async function patchSettings(patch: Partial<Settings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'global'), patch, { merge: true });
}

export async function saveAsset(name: AssetName, dataUrl: string): Promise<void> {
  await setDoc(doc(db, 'settings', name), { dataUrl, updatedAt: serverTimestamp() });
}

export async function triggerSpotlight(photoId: string): Promise<number> {
  const at = Date.now();
  await setDoc(doc(db, 'settings', 'global'), { spotlightTriggerAt: at, spotlightPhotoId: photoId }, { merge: true });
  return at;
}

export async function triggerSponsor(partnerId: string): Promise<number> {
  const at = Date.now();
  await setDoc(doc(db, 'settings', 'global'), { sponsorTriggerAt: at, sponsorTriggerId: partnerId }, { merge: true });
  return at;
}

export async function patchVideoConfig(patch: Partial<Pick<VideoConfig, 'enabled' | 'intervalMin' | 'maxMin'>>): Promise<void> {
  await setDoc(doc(db, 'settings', 'video'), patch, { merge: true });
}

/** videoDocId: '' = التالي بالتناوب، VIDEO_STOP = إيقاف، وإلا معرّف فيديو محدد */
export async function triggerVideo(videoDocId: string): Promise<number> {
  const at = Date.now();
  await setDoc(doc(db, 'settings', 'video'), { triggerAt: at, triggerId: videoDocId }, { merge: true });
  return at;
}

/** يعيد ترقيم الفيديوهات 1..n حسب الترتيب المعطى (دفعة واحدة) */
export async function setVideosOrder(ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach((id, i) => batch.update(doc(db, 'videos', id), { order: i + 1 }));
  await batch.commit();
}

export async function addVideo(data: { title: string; videoId: string; start: number; scheduleAt: number; durationSec: number; repeatCount: number; repeatEveryMin: number; repeatUntil: number }, order: number): Promise<void> {
  await addDoc(collection(db, 'videos'), { ...data, enabled: true, order, createdAt: serverTimestamp() });
}

export async function updateVideo(id: string, patch: { title: string; scheduleAt: number; durationSec: number; repeatCount: number; repeatEveryMin: number; repeatUntil: number }): Promise<void> {
  await updateDoc(doc(db, 'videos', id), patch);
}

export async function setVideoEnabled(id: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, 'videos', id), { enabled });
}

export async function deleteVideo(id: string): Promise<void> {
  await deleteDoc(doc(db, 'videos', id));
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
  coll: 'photos' | 'partners' | 'videos',
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
  data: { name: string; category: string; logo: string; message: string },
  order: number,
): Promise<void> {
  if (id) await updateDoc(doc(db, 'partners', id), data);
  else await addDoc(collection(db, 'partners'), { ...data, order, createdAt: serverTimestamp() });
}

export async function deletePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, 'partners', id));
}

// ---------------- المشرفون ----------------

function mapAdmin(id: string, x: Raw): AdminProfile {
  return {
    email: String(x.email ?? id),
    name: String(x.name ?? ''),
    role: x.role === 'owner' ? 'owner' : 'admin',
    createdAt: toMs(x.createdAt),
    createdBy: typeof x.createdBy === 'string' ? x.createdBy : undefined,
  };
}

/** وثيقة مشرف واحد؛ الخطأ (permission-denied) يعني أن الحساب ليس مشرفاً أو سُحبت صلاحيته. */
export function subscribeAdminProfile(
  email: string,
  cb: (profile: AdminProfile | null, fromCache: boolean) => void,
  onError: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'admins', email),
    (snap) => cb(snap.exists() ? mapAdmin(snap.id, snap.data({ serverTimestamps: 'estimate' }) as Raw) : null, snap.metadata.fromCache),
    onError,
  );
}

export function subscribeAdmins(cb: (list: AdminProfile[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'admins'),
    (snap) =>
      cb(
        snap.docs
          .map((d) => mapAdmin(d.id, d.data({ serverTimestamps: 'estimate' }) as Raw))
          .sort((a, b) => (a.role === b.role ? a.createdAt - b.createdAt : a.role === 'owner' ? -1 : 1)),
      ),
    errCb('admins'),
  );
}

export async function createAdminProfile(
  email: string,
  name: string,
  createdBy: string,
  role: 'admin' | 'owner' = 'admin',
): Promise<void> {
  await setDoc(doc(db, 'admins', email), { name, email, role, createdAt: serverTimestamp(), createdBy });
}

export async function updateAdminName(email: string, name: string): Promise<void> {
  const snap = await getDoc(doc(db, 'admins', email));
  if (!snap.exists()) throw new Error('admin-not-found');
  const x = snap.data() as Raw;
  // القواعد تشترط إرسال الوثيقة كاملة بنفس الدور والبريد وتاريخ الإنشاء
  await setDoc(doc(db, 'admins', email), {
    name,
    email,
    role: x.role === 'owner' ? 'owner' : 'admin',
    createdAt: x.createdAt,
    ...(typeof x.createdBy === 'string' ? { createdBy: x.createdBy } : {}),
  });
}

export async function deleteAdminProfile(email: string): Promise<void> {
  await deleteDoc(doc(db, 'admins', email));
}
