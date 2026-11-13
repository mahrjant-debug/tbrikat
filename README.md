# جدارية التهاني والتبريكات

تطبيق ويب عربي (RTL) لحفل زواج جماعي: يعرض تهاني الضيوف على شاشة القاعة مباشرة، ويستقبلها من هواتفهم، ويعتمدها مشرف قبل العرض.

**التقنيات:** React 19 · TypeScript · Vite · Tailwind CSS 4 · motion · canvas-confetti · qrcode · lucide-react · PWA (vite-plugin-pwa) · Firebase (Firestore + Auth). بلا خادم خلفي؛ يُنشر ملفات ثابتة.

## الصفحات

| المسار | الوصف |
| --- | --- |
| `/` | شاشة العرض (تلفاز/شاشة كبيرة). شريط التنقل يظهر عند تحريك الفأرة فقط |
| `/congratulate` | صفحة الضيف (الجوال) |
| `/admin` | لوحة المشرف (تسجيل دخول Firebase Auth) |

## الإعداد

1. أنشئ مشروعاً في [Firebase Console](https://console.firebase.google.com).
2. **Firestore:** أنشئ قاعدة بيانات بالإصدار **Standard** (وضع الإنتاج)، وفعّل خطة **Blaze** (الدفع حسب الاستخدام) — لا تعتمد على الحصة المجانية المحدودة لحفل مباشر — ثم أضف **تنبيه ميزانية** من Google Cloud Billing → Budgets & alerts (مثلاً 5 دولارات).
3. **Authentication:** فعّل مزوّد *Email/Password*، وأنشئ حسابات المشرفين يدوياً من تبويب Users. عطّل التسجيل الذاتي إن وُجد خيار ذلك (Settings → User actions).
4. عدّل قائمة بريد المشرفين في [`firestore.rules`](firestore.rules) (الدالة `isAdmin`) ثم انشر القواعد:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
   > أنشئ حسابات المشرفين أنت من Firebase Console **قبل** نشر القواعد، حتى لا يستطيع أحد تسجيل بريد مشرف لم تُنشئه بعد.
5. إن كانت قاعدة Firestore **مسمّاة** (وليست `(default)`) فاكتب معرّفها في `VITE_FIREBASE_DATABASE_ID`، وعدّل `database` في `firebase.json` ليطابقها.
6. انسخ `.env.example` إلى `.env.local` واملأ مفاتيح تطبيق الويب (Project settings → Your apps).

```bash
npm install
npm run dev        # تطوير
npm run build      # tsc --noEmit ثم vite build
npm run typecheck  # tsc --noEmit
```

## النشر على Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `NODE_VERSION=22` ومتغيرات `VITE_FIREBASE_*` نفسها من `.env.example`
- أضف نطاق Pages (`xxx.pages.dev` ونطاقك المخصص) في Firebase → Authentication → Settings → **Authorized domains**.
- ملف `public/_headers` يضبط الكاش: `/assets/*` سنة كاملة، و`sw.js` و`index.html` و`manifest` بلا كاش.

## كيف تعمل الدورة

1. الضيف يمسح رمز QR الظاهر على الشاشة ويرسل تهنئته (`/congratulate`).
2. الحالة الابتدائية: كلمة محظورة → `hidden`، اعتماد تلقائي مفعّل ولم يُشترط المشرف → `approved`، وإلا `pending`.
3. المشرف يراجع في `/admin` ويعتمد؛ فتظهر على الشاشة خلال ثوانٍ مع وميض ذهبي وقصاصات ونغمة وبطاقة بارزة 7 ثوانٍ.

## تصميم البيانات (Firestore)

| المسار | الاستخدام |
| --- | --- |
| `congratulations/{id}` | `name` · `text` · `status` · `createdAt` · `approvedAt?` · `displayDuration?` |
| `settings/global` | الإعدادات العامة (يشترك فيها الضيوف والشاشة) |
| `settings/logo` · `settings/background` | الشعار والخلفية المرفوعان `{dataUrl}` — في وثيقتين مستقلتين حتى لا تثقل إعدادات هواتف الضيوف |
| `photos/{id}` | صور شريط العرسان (JPEG مضغوط < 180KB، `dataUrl`) |
| `partners/{id}` | شركاء النجاح |
| `bannedWords/{id}` | الكلمات المحظورة |

- هواتف الضيوف تشترك في `settings/global` و`bannedWords` فقط ولا تقرأ التهاني.
- الصور مخزّنة كنص Base64 داخل Firestore (لا Firebase Storage) لتبقى الحلول بلا خادم؛ لذلك الضغط التلقائي إلزامي.

## ملاحظات أمان

- التسجيل الذاتي عبر واجهة Firebase قد يبقى متاحاً تقنياً لأي شخص يعرف مفتاح الـ API، لكنه لا يمنحه أي صلاحية كتابة: القواعد تقصر الكتابة على قائمة بريد المشرفين.
- إنشاء تهنئة من الضيوف مسموح بحقول محددة وأطوال محدودة، والحالة `approved` لا تُقبل إلا حين يكون الاعتماد التلقائي مفعّلاً في الإعدادات.
