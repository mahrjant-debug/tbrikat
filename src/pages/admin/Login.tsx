import { useState, type FormEvent } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { LogoMark } from '../../components/Logo';
import { authErrorMessage, login } from '../../lib/auth';
import { inputCls } from '../../components/ui';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center px-4 pt-12">
      <form onSubmit={onSubmit} className="gold-frame w-full max-w-sm rounded-3xl p-6" noValidate>
        <div className="mb-5 text-center">
          <LogoMark className="mx-auto h-14 w-14" />
          <h1 className="mt-2 font-cairo text-2xl font-extrabold text-ink">لوحة المشرف</h1>
          <p className="text-sm text-ink-soft">سجّل الدخول لإدارة التهاني</p>
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-bold text-ink">البريد الإلكتروني</span>
          <input
            type="email"
            dir="ltr"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-bold text-ink">كلمة المرور</span>
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>
        {error ? (
          <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-cairo font-extrabold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <LockKeyhole size={18} />}
          {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  );
}
