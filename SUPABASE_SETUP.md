# إعداد تسجيل الدخول (Supabase + Netlify)

## خطوة واحدة مطلوبة منك (مرة واحدة فقط)

الجدول `app_users` لازم يُنشأ داخل Supabase. من هنا لا أستطيع تنفيذ SQL على مشروعك بدون صلاحيات إضافية، لذلك تحتاج تنفيذها من متصفحك مرة واحدة:

1. افتح **محرر SQL** لمشروعك:  
   **https://supabase.com/dashboard/project/lpvoooyqhndizycsukcm/sql/new**

2. الصق هذا الـ SQL بالكامل ثم اضغط **Run**:

```sql
create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','user')),
  created_at timestamptz default now()
);
```

3. بعد ما يظهر "Success"، شغّل البذر:
   - **من هنا:** قل لي "شغّل البذر" وسأشغّله عنك.
   - **أو محلياً:** من مجلد المشروع شغّل: `.\scripts\seed-admin.ps1` (أو أنشئ `.env` من `.env.example` واملأ القيم ثم شغّل `node scripts/seed-admin.js`).

---

لتشغيل تسجيل الدخول وإدارة المستخدمين، تحتاج أيضاً:

1. **إنشاء مشروع Supabase (مجاني)**  
   - ادخل [supabase.com](https://supabase.com) → Create new project.  
   - بعد الإنشاء: **Settings** → **API** → انسخ **Project URL** و **service_role** (مفتاح سري، لا تشاركه).

2. **إنشاء الجدول في Supabase**  
   - من Supabase: **SQL Editor** → New query، ثم انسخ محتوى الملف **`supabase/schema.sql`** وشغّله (أو الصق الـ SQL الموجود في الملف).

3. **إضافة المتغيرات في Netlify**  
   - من موقعك في Netlify: **Site settings** → **Environment variables** → **Add a variable** (أو **Import from .env**).  
   - أضف:

| الاسم | القيمة | ملاحظات |
|------|--------|---------|
| `SUPABASE_URL` | Project URL من Supabase | مثال: https://xxx.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح service_role من Supabase | سري |
| `JWT_SECRET` | أي نص عشوائي طويل | مثال: استخدم مولد كلمات مرور |
| `SEED_SECRET` | كلمة سر لمرة واحدة لإنشاء الأدمن | اختياري، لاستدعاء seed |

4. **إنشاء حساب الأدمن (admin / 123)**  
   - **من Netlify (بعد الـ deploy):** افتح في المتصفح أو استدعِ:
   `https://YOUR-SITE.netlify.app/.netlify/functions/seed?key=SEED_SECRET`
   - **أو محلياً:** انسخ `.env.example` إلى `.env` واملأ `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY`، ثم شغّل:
   `node scripts/seed-admin.js`

   بعدها يمكن تسجيل الدخول بـ **admin** / **123** وإنشاء المستخدمين من تاب «إدارة المستخدمين».

---

**ملخص:**  
- الدخول من أي جهاز بنفس اليوزر/الباسورد.  
- الأدمن (admin) يضيف مستخدمين جدد من الداشبورد.  
- البيانات مخزنة في Supabase (سيرفر)، وليس في المتصفح فقط.
