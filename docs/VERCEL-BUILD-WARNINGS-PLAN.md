# خطة حل تحذيرات بناء Vercel وإصلاحها

هذا المستند يلخص **التحذيرات** التي تظهر أثناء `npm install` و `next build` على Vercel، مع تصنيفها وطرق **التفادي** أو **الإصلاح** دون كسر البناء. البناء حالياً **ينجح**؛ الهدف تقليل التحذيرات إلى الحد المعقول.

---

## ملخص التحذيرات

| التحذير | المصدر | النوع | أولوية المعالجة |
|--------|--------|-------|------------------|
| `rimraf@3.0.2` deprecated | flat-cache (سلسلة ESLint) | تبعية غير مباشرة | متوسطة |
| `inflight@1.0.6` غير مدعوم | glob (سلسلة ESLint / Next) | تبعية غير مباشرة | متوسطة |
| `google-p12-pem@4.0.1` لم يعد يُصان | firebase-admin أو حزمة Google | تبعية غير مباشرة | منخفضة |
| `@humanwhocodes/config-array@0.13.0` | eslint | تبعية غير مباشرة | متوسطة |
| `@humanwhocodes/object-schema@2.0.3` | eslint | تبعية غير مباشرة | متوسطة |
| `glob@8.1.0` / `7.2.3` / `10.3.10` ثغرات | أنواع وحزم مختلفة (ESLint، Next) | تبعية غير مباشرة | متوسطة |
| `eslint@8.57.1` لم يعد مدعوماً | **تبعية مباشرة** في package.json | مباشرة | عالية (اختياري) |
| webpack PackFileCacheStrategy serializing big strings | Next.js / webpack داخلي | أداء كاش | منخفضة |

---

## 1. تحذيرات npm (حزم deprecated أو غير مدعومة)

### 1.1 التبعيات المباشرة القابلة للتعديل

- **eslint@8.57.1** (في `package.json` تحت `devDependencies`):
  - **الوضع الحالي:** ESLint 8 لم يعد مدعوماً رسمياً.
  - **الخيار أ (موصى به للاستقرار):** الإبقاء على ESLint 8 مع `eslint-config-next@14.2.x` و Next.js 14؛ التحذير لا يمنع البناء.
  - **الخيار ب (لاحقاً):** عند الترقية إلى Next.js 15+، ترقية ESLint إلى 9 وتبني على [الـ flat config](https://eslint.org/docs/latest/use/configure/configuration-files-new)؛ يتطلب تحديث `eslint-config-next` وإعداد ESLint 9 حسب [دليل الإعداد](https://blog.linotte.dev/eslint-9-next-js-935c2b6d0371).
  - **إجراء فوري:** لا تغيير إلزامي؛ يمكن توثيق الخيار ب في قسم "لاحقاً" أدناه.

### 1.2 التبعيات غير المباشرة (transitive)

المصادر في المشروع:

- **rimraf@3.0.2:** من `flat-cache` (سلسلة ESLint للأداء).
- **inflight:** من `glob` (يُستخدم في عدة حزم تابعة لـ ESLint و Next).
- **glob (إصدارات قديمة):** من `@next/eslint-plugin-next` (glob 10.3.10)، و `@types/glob`، وحزم أخرى.
- **@humanwhocodes/config-array** و **object-schema:** من `eslint`؛ البديل الرسمي هو `@eslint/config-array` و `@eslint/object-schema` (غالباً مع ESLint 9).
- **google-p12-pem:** من `firebase-admin` أو حزمة Google أخرى؛ الحزمة لم تعد تُصان؛ الترقية تعتمد على تحديث `firebase-admin` من طرف Google.

**الإجراء المقترح (اختياري ولا يُنفّذ دون اختبار):**

- استخدام **npm overrides** في `package.json` لفرض إصدارات أحدث **فقط** حيث لا يكسر ذلك التوافق:
  - **rimraf:** تجربة `"rimraf": "^5.0.0"` (أو `"^4.0.0"`) تحت `"overrides"`؛ ثم `npm install` و `npm run build` و `npm run lint` محلياً.
  - **glob / inflight / humanwhocodes:** لا يُنصح بفرض إصدارات يدوياً لأن ESLint 8 و eslint-config-next يعتمدان على شجرة تبعيات محددة؛ الترقية تكون مع نقل المشروع إلى ESLint 9 لاحقاً.
- **google-p12-pem:** لا override؛ انتظار تحديث من `firebase-admin`؛ التحذير لا يمنع البناء.

إذا تم إضافة overrides، يُفضّل توثيقها في هذا الملف مع نتيجة الاختبار المحلي.

---

## 2. تحذير Webpack (PackFileCacheStrategy)

- **النص:** `Serializing big strings (133kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)`.
- **السبب:** سلوك داخلي في Next.js/webpack عند تخزين الكاش؛ غالباً مرتبط بحزمة أو chunk كبير (مثلاً middleware أو مكتبة ثقيلة).
- **التأثير:** أداء إعادة القراءة من الكاش فقط؛ لا يؤثر على صحة البناء أو سلوك التطبيق.
- **الإجراء المقترح:**
  - **قصير المدى:** قبول التحذير أو توثيقه هنا؛ لا تغيير إلزامي.
  - **طويل المدى (اختياري):** مراجعة إن كان هناك chunk كبير (مثلاً من middleware أو من حزمة واحدة) يمكن تقليل حجمه (code splitting، استيراد جزئي)، أو انتظار إصلاح من Next.js.

---

## 3. خطة تنفيذ مقترحة (بالترتيب)

### المرحلة 1: توثيق وقبول (بدون تغيير كود)

- [x] إنشاء هذا المستند (VERCEL-BUILD-WARNINGS-PLAN.md).
- [ ] إضافة فقرة قصيرة في [README.md](../README.md) أو [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) تشير إلى أن تحذيرات الحزم المعطلة معروفة وموثقة في هذا الملف، وأن البناء ينجح رغمها.

### المرحلة 2: overrides آمنة (اختياري)

- [ ] في `package.json` إضافة حقل `"overrides"` مع تجربة:
  - `"rimraf": "^5.0.5"` (أو أحدث 5.x).
- [ ] تشغيل `npm install` ثم `npm run build` و `npm run lint` محلياً.
- [ ] إن نجح كل شيء، رفع التعديل ومراجعة بناء Vercel؛ إن ظهرت أخطاء، إرجاع الـ override وتوثيق أن rimraf يُترك على 3.x حتى ترقية سلسلة ESLint لاحقاً.

### المرحلة 3: ترقية ESLint (لاحقاً مع ترقية Next)

- [ ] عند الانتقال إلى Next.js 15 (أو أحدث)، ترقية `eslint` و `eslint-config-next` وتبني إعداد ESLint 9 (flat config) حسب الوثائق الرسمية و[دليل ESLint 9 + Next.js](https://blog.linotte.dev/eslint-9-next-js-935c2b6d0371).
- [ ] بعد الترقية، التحقق من اختفاء تحذيرات `@humanwhocodes/*` و `eslint@8.57.1`.

### المرحلة 4: تحذيرات لا إجراء عليها حالياً

- **google-p12-pem:** لا إجراء محلي؛ انتظار تحديث من firebase-admin.
- **inflight / glob القديم:** مرتبطان بشجرة ESLint و Next؛ تُعالج مع ترقية ESLint/Next في المرحلة 3.
- **webpack PackFileCacheStrategy:** توثيق فقط؛ إجراء اختياري لاحقاً إن رُغب في تحسين أداء الكاش.

---

## 4. قائمة تحقق سريعة بعد أي تغيير

بعد تعديل `package.json` أو `package-lock.json`:

1. تشغيل `npm install` بدون أخطاء.
2. تشغيل `npm run build` بنجاح.
3. تشغيل `npm run lint` بدون أخطاء.
4. إن أمكن، التأكد من أن النشر على Vercel يمر بنجاح وأن التحذيرات إما انخفضت أو موثقة.

---

## 5. المراجع

- [ESLint Version Support](https://eslint.org/version-support)
- [ESLint 9 + Next.js 14 Setup](https://blog.linotte.dev/eslint-9-next-js-935c2b6d0371)
- [eslint-config-next (npm)](https://www.npmjs.com/package/eslint-config-next)
- [Next.js Telemetry (إيقاف اختياري)](https://nextjs.org/telemetry) — إن رغبت في إيقاف رسالة الـ telemetry فقط وليس إصلاح تحذيرات الحزم.

بعد تنفيذ المراحل أعلاه تكون تحذيرات البناء إما مُقلّلة أو موثقة وواضحة للمشروع.
