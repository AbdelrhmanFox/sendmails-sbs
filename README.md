# Sendmails SBS – الداشبورد + الأتميشن

## محتويات المجلد

- **`automation/`** – workflow خاص بـ n8n يُشغَّل من الداشبورد (Webhook).
- **`dashboard/`** – صفحة الداشبورد (افتح `dashboard/index.html` في المتصفح أو ارفع المشروع على GitHub وربطه بـ Netlify؛ إعدادات النشر في `netlify.toml`).
- **`netlify/functions/`** – دوال السيرفر لتسجيل الدخول وإنشاء المستخدمين (تعمل مع Supabase).
- **`SUPABASE_SETUP.md`** – خطوات إعداد Supabase ومتغيرات Netlify لتشغيل تسجيل الدخول (يوزر/باسورد من أي جهاز، أدمن ينشئ مستخدمين).

### رفع على GitHub ثم Netlify (بعد تثبيت Git)
1. في مجلد المشروع: `git init` ثم `git add .` ثم `git commit -m "Initial"`
2. على GitHub: أنشئ repo جديد (مثلاً `sendmails-sbs`) بدون README.
3. `git remote add origin https://github.com/اسمك/sendmails-sbs.git` ثم `git branch -M main` ثم `git push -u origin main`
4. في Netlify: Add new site → Import from GitHub → اختر الـ repo → Publish directory: **dashboard** → Deploy.

---

## طريقة الاستخدام (للموظف)

1. **تشغيل الـ workflow في n8n**
   - استورد الملف `automation/workflow.json` داخل n8n.
   - فعّل الـ workflow وانسخ **رابط الـ Webhook** من نود الـ Webhook (مثال: `https://your-n8n.com/webhook/sendmails-sbs`).

2. **فتح الداشبورد**
   - افتح الملف `dashboard/index.html` في المتصفح (مثلاً double-click أو من خلال خادم محلي).

3. **في الداشبورد**
   - في **الإعدادات**: الصق رابط الـ Webhook.
   - في **الشيت**: الصق رابط جوجل شيت اللي هتقرا منه الداتا (الأعمدة: Email, Name, Row, Email Sent، واختياري: شهاده).
   - في **Subject**: اكتب عنوان الإيميل، واستخدم مثلاً `{{Name}}` عشان يتحط اسم الشخص.
   - في **Body**: اكتب نص الإيميل بالتنسيق اللي تحبه (عريض، روابط، إلخ). النص يُحفظ كـ HTML عشان التنسيق ما يبوظش. استخدم `{{Name}}` و `{{Email}}` و `{{شهاده}}` للدمج.

4. **معاينة**
   - جزء «معاينة مع بيانات تجريبية» يوريك الموضوع والـ body بعد استبدال القيم التجريبية.

5. **بدء الإرسال**
   - اضغط **بدء إرسال الإيميلات**. الطلب يروح لـ n8n، والـ workflow يرد فوراً ثم يقرأ الشيت ويرسل إيميل إيميل (بفاصل 5 دقايق بين كل واحد).

## ملاحظات

- لازم يكون في n8n: **Google Sheets** و **SMTP** (Hostinger أو غيره) مضبوطين في الـ credentials.
- عمود **Row** في الشيت لازم يكون موجود (مثلاً `=ROW()`) عشان التحديث يحدث الصف الصح.
- لو حابب ترجع للنسخة اللي تشتغل على **جدولة كل 5 ساعات** بدون داشبورد، استخدم الـ workflow الأصلي `SBS_SENDMAILS.json` من مجلد Downloads.
