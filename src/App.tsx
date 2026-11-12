import { Suspense, lazy } from 'react';
import { Loader2, SearchX } from 'lucide-react';
import { isFirebaseConfigured } from './lib/firebase';
import { useRoute } from './lib/router';
import Display from './pages/Display';

// صفحتا الضيف والمشرف بتحميل كسول؛ شاشة العرض مضمّنة في الحزمة الأساسية
const Guest = lazy(() => import('./pages/Guest'));
const Admin = lazy(() => import('./pages/Admin'));

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-accent" role="status" aria-label="جارٍ التحميل">
      <Loader2 className="animate-spin" size={36} />
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="gold-frame max-w-xl rounded-3xl p-8 text-center">
        <SearchX className="mx-auto mb-3 h-12 w-12 text-gold" aria-hidden="true" />
        <h1 className="font-cairo text-2xl font-extrabold text-ink">لم يُضبط الاتصال بـ Firebase</h1>
        <p className="mt-3 leading-8 text-ink-soft">
          أنشئ ملف <code dir="ltr">.env.local</code> من <code dir="ltr">.env.example</code> واملأ مفاتيح مشروع Firebase، ثم أعد تشغيل
          التطبيق. في Cloudflare Pages أضف المتغيرات نفسها ضمن Environment variables ثم أعد البناء.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  if (!isFirebaseConfigured) return <SetupNotice />;
  if (route === 'display') return <Display />;
  return <Suspense fallback={<Loading />}>{route === 'guest' ? <Guest /> : <Admin />}</Suspense>;
}
