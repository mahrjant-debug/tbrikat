import { useState, type FormEvent } from 'react';
import { Crown, Eye, EyeOff, KeyRound, Loader2, Mail, Pencil, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { Button, ConfirmDialog, Field, Modal, inputCls, useToast } from '../../components/ui';
import { authErrorMessage, changeOwnPassword, createAdminAccount, sendResetLink, updateOwnDisplayName } from '../../lib/auth';
import { createAdminProfile, deleteAdminProfile, updateAdminName } from '../../lib/db';
import { handleFirestoreError } from '../../lib/firebase';
import { timeAgo } from '../../lib/dates';
import type { AdminProfile } from '../../lib/types';

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          dir="ltr"
          autoComplete={autoComplete}
          className={`${inputCls} pe-10`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-soft hover:bg-accent-soft"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
}

function ErrorLine({ text }: { text: string }) {
  return text ? (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
      {text}
    </p>
  ) : null;
}

export function AdminsTab({ admins, me }: { admins: AdminProfile[]; me: AdminProfile }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminProfile | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState<AdminProfile | null>(null);
  const [resetting, setResetting] = useState<AdminProfile | null>(null);
  const [existing, setExisting] = useState<{ email: string; name: string } | null>(null);

  const meIsOwner = me.role === 'owner';

  const grantExisting = async () => {
    const target = existing;
    setExisting(null);
    if (!target) return;
    try {
      await createAdminProfile(target.email, target.name, me.email);
      setAdding(false);
      toast.success(`مُنح ${target.name} صلاحية المشرف (كلمة مروره الحالية باقية)`);
    } catch (e) {
      handleFirestoreError('admin-grant', e);
      toast.error('تعذّر منح الصلاحية.');
    }
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm leading-7 text-ink-soft">
          كل مشرف يدخل بحسابه الخاص (بريد وكلمة مرور). المشرف الرئيسي <span className="font-bold">لا يمكن حذفه</span> ولا يُقفل عليه الدخول.
          كلمة مرورك تغيّرها مباشرة، أما كلمة مرور مشرف آخر فيُرسَل إليه رابط لتعيينها بنفسه (حفاظاً على سرّية كلمات المرور).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => setChangingPassword(true)}>
            <KeyRound size={16} /> تغيير كلمة مروري
          </Button>
          <Button onClick={() => setAdding(true)}>
            <UserPlus size={16} /> إضافة مشرف
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {admins.map((a) => {
          const isMe = a.email === me.email;
          const isOwnerRow = a.role === 'owner';
          const canEdit = !isOwnerRow || meIsOwner;
          return (
            <li key={a.email} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-cairo text-xl font-extrabold ${
                  isOwnerRow ? 'bg-amber-300 text-amber-900' : 'bg-accent-soft text-accent'
                }`}
                aria-hidden="true"
              >
                {Array.from(a.name.trim())[0] ?? '؟'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-cairo font-extrabold text-ink">{a.name}</span>
                  {isOwnerRow ? (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      <Crown size={12} /> المشرف الرئيسي
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      <ShieldCheck size={12} /> مشرف
                    </span>
                  )}
                  {isMe ? <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">أنت</span> : null}
                </div>
                <div dir="ltr" className="truncate text-start text-sm text-ink-soft">
                  {a.email}
                </div>
                {!isOwnerRow && a.createdAt ? (
                  <div className="text-xs text-ink-soft">أُضيف {timeAgo(a.createdAt)}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {canEdit ? (
                  <Button variant="soft" onClick={() => setEditing(a)} aria-label={`تعديل اسم ${a.name}`}>
                    <Pencil size={16} /> الاسم
                  </Button>
                ) : null}
                {!isMe ? (
                  <Button variant="ghost" onClick={() => setResetting(a)} aria-label={`إرسال رابط كلمة المرور إلى ${a.name}`} title="إرسال رابط لتعيين كلمة المرور">
                    <Mail size={16} /> كلمة المرور
                  </Button>
                ) : null}
                {!isOwnerRow && !isMe ? (
                  <Button variant="ghost" className="text-red-600" onClick={() => setDeleting(a)} aria-label={`حذف ${a.name}`}>
                    <Trash2 size={16} />
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Modal open={adding} onClose={() => setAdding(false)} title="إضافة مشرف">
        {adding ? (
          <AddAdminForm
            me={me}
            admins={admins}
            onCancel={() => setAdding(false)}
            onDone={(name) => {
              setAdding(false);
              toast.success(`أُضيف المشرف «${name}»`);
            }}
            onExisting={(email, name) => setExisting({ email, name })}
          />
        ) : null}
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="تعديل اسم المشرف">
        {editing ? (
          <EditNameForm
            key={editing.email}
            admin={editing}
            isMe={editing.email === me.email}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              toast.success('تم حفظ الاسم');
            }}
          />
        ) : null}
      </Modal>

      <Modal open={changingPassword} onClose={() => setChangingPassword(false)} title="تغيير كلمة مروري">
        {changingPassword ? (
          <ChangePasswordForm
            onCancel={() => setChangingPassword(false)}
            onDone={() => {
              setChangingPassword(false);
              toast.success('تم تغيير كلمة المرور. استخدمها في الدخول القادم.');
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={resetting !== null}
        title="إرسال رابط كلمة المرور"
        message={`سيُرسل رابط لتعيين كلمة مرور جديدة إلى بريد «${resetting?.name ?? ''}» (${resetting?.email ?? ''}). لن تتغير كلمة مروره الحالية حتى يستخدم الرابط.`}
        confirmLabel="إرسال الرابط"
        danger={false}
        onCancel={() => setResetting(null)}
        onConfirm={async () => {
          const t = resetting;
          setResetting(null);
          if (!t) return;
          try {
            await sendResetLink(t.email);
            toast.success('أُرسل رابط إعادة التعيين إلى بريده');
          } catch (e) {
            toast.error(authErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="حذف المشرف"
        message={`سيفقد «${deleting?.name ?? ''}» صلاحية الدخول إلى لوحة التحكم فوراً. حسابه (البريد وكلمة المرور) يبقى كما هو ويمكنك إعادة إضافته لاحقاً.`}
        confirmLabel="حذف المشرف"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const t = deleting;
          setDeleting(null);
          if (!t) return;
          try {
            await deleteAdminProfile(t.email);
            toast.success('تم حذف المشرف');
          } catch (e) {
            handleFirestoreError('admin-delete', e);
            toast.error('تعذّر الحذف.');
          }
        }}
      />

      <ConfirmDialog
        open={existing !== null}
        title="هذا البريد مسجّل مسبقاً"
        message={`البريد ${existing?.email ?? ''} له حساب موجود (ربما مشرف سابق حذفتَه). لن تتغير كلمة مروره. هل تريد منحه صلاحية المشرف الآن؟ تأكد أن البريد يخصّ الشخص المقصود، ويمكنك بعد ذلك إرسال رابط لتعيين كلمة مرور جديدة له.`}
        confirmLabel="منح الصلاحية"
        danger={false}
        onCancel={() => setExisting(null)}
        onConfirm={() => void grantExisting()}
      />
    </section>
  );
}

function AddAdminForm({
  me,
  admins,
  onCancel,
  onDone,
  onExisting,
}: {
  me: AdminProfile;
  admins: AdminProfile[];
  onCancel: () => void;
  onDone: (name: string) => void;
  onExisting: (email: string, name: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2 || cleanName.length > 60) return setError('اكتب اسماً من حرفين إلى 60 حرفاً.');
    if (!EMAIL_RE.test(cleanEmail)) return setError('صيغة البريد الإلكتروني غير صحيحة.');
    if (admins.some((a) => a.email === cleanEmail)) return setError('هذا البريد مشرف بالفعل.');
    if (password.length < MIN_PASSWORD) return setError(`كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD} أحرف.`);
    if (password !== confirm) return setError('كلمتا المرور غير متطابقتين.');

    setBusy(true);
    setError('');
    let accountReady = false;
    try {
      const result = await createAdminAccount(cleanEmail, password, cleanName);
      if (result === 'existing') {
        // لا نمنح الصلاحية تلقائياً لبريد مسجّل سلفاً دون تأكيد صريح
        onExisting(cleanEmail, cleanName);
        return;
      }
      accountReady = true;
      await createAdminProfile(cleanEmail, cleanName, me.email);
      onDone(cleanName);
    } catch (err) {
      if (accountReady) {
        handleFirestoreError('admin-profile', err);
        setError('أُنشئ الحساب لكن تعذّر منحه صلاحية المشرف. أعد إضافة نفس البريد وسيُعرض عليك منح الصلاحية.');
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="الاسم">
        <input className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="البريد الإلكتروني (للدخول)">
        <input type="email" dir="ltr" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </Field>
      <PasswordField label="كلمة المرور" value={password} onChange={setPassword} autoComplete="new-password" hint={`${MIN_PASSWORD} أحرف على الأقل. أعطِها للمشرف وليغيّرها بنفسه بعد أول دخول.`} />
      <PasswordField label="تأكيد كلمة المرور" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <ErrorLine text={error} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          إلغاء
        </Button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} إضافة
        </button>
      </div>
    </form>
  );
}

function EditNameForm({
  admin,
  isMe,
  onCancel,
  onDone,
}: {
  admin: AdminProfile;
  isMe: boolean;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(admin.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < 2 || clean.length > 60) return setError('اكتب اسماً من حرفين إلى 60 حرفاً.');
    setBusy(true);
    setError('');
    try {
      await updateAdminName(admin.email, clean);
      if (isMe) await updateOwnDisplayName(clean).catch(() => undefined);
      onDone();
    } catch (err) {
      handleFirestoreError('admin-name', err);
      setError('تعذّر حفظ الاسم. تحقق من الاتصال وصلاحياتك.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p dir="ltr" className="text-start text-sm text-ink-soft">
        {admin.email}
      </p>
      <Field label="الاسم">
        <input className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <ErrorLine text={error} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          إلغاء
        </Button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null} حفظ
        </button>
      </div>
    </form>
  );
}

function ChangePasswordForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!current) return setError('اكتب كلمة المرور الحالية.');
    if (next.length < MIN_PASSWORD) return setError(`كلمة المرور الجديدة يجب ألا تقل عن ${MIN_PASSWORD} أحرف.`);
    if (next === current) return setError('كلمة المرور الجديدة مطابقة للحالية.');
    if (next !== confirm) return setError('كلمتا المرور الجديدتان غير متطابقتين.');
    setBusy(true);
    setError('');
    try {
      await changeOwnPassword(current, next);
      onDone();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'كلمة المرور الحالية غير صحيحة.'
          : authErrorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <PasswordField label="كلمة المرور الحالية" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField label="كلمة المرور الجديدة" value={next} onChange={setNext} autoComplete="new-password" hint={`${MIN_PASSWORD} أحرف على الأقل.`} />
      <PasswordField label="تأكيد كلمة المرور الجديدة" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <ErrorLine text={error} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          إلغاء
        </Button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} تغيير
        </button>
      </div>
    </form>
  );
}
