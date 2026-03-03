# إعداد Netlify + Supabase (مشروع sbstools)

بما أن Netlify مربوط بمشروع Supabase (**SBsloution's Project**)، المتغيرات التالية تُعيّن تلقائياً:
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_DATABASE_URL`

## ما تضيفه يدوياً في Netlify

من **Project configuration** → **Environment variables** (أو من نفس صفحة Supabase في الإعدادات):

| المتغير | القيمة | ملاحظة |
|--------|--------|--------|
| `SUPABASE_PROJECT_REF` | `lpvoooyqhndizycsukcm` | لبناء رابط الـ API تلقائياً |
| `SEED_SECRET` | أي كلمة سر تختارها (مثل `my-seed-2024`) | لاستدعاء seed مرة واحدة فقط |

لا حاجة لـ `JWT_SECRET` منفصل — الكود يستخدم `SUPABASE_JWT_SECRET` اللي Netlify يعيّنه من الربط.

## إنشاء الجدول في Supabase (مرة واحدة)

1. ادخل [Supabase](https://supabase.com) → مشروعك → **SQL Editor**.
2. انسخ محتوى الملف **`supabase/schema.sql`** والصقه في استعلام جديد.
3. اضغط **Run** لتنفيذ الـ SQL.

## إنشاء حساب الأدمن (مرة واحدة بعد الـ deploy)

1. بعد أن تضيف `SEED_SECRET` في Netlify وتعمل **Redeploy**.
2. افتح في المتصفح (غيّر `YOUR_SEED_SECRET` إلى القيمة اللي حطيتها):

   **https://sbstools.netlify.app/.netlify/functions/seed?key=YOUR_SEED_SECRET**

3. لو ظهرت رسالة مثل `{"ok":true,"message":"Admin created (admin / 123)"}` فتم إنشاء الأدمن.
4. ادخل على **https://sbstools.netlify.app/** وسجّل دخول بـ **admin** / **123**.

---

**ملخص:** أضف `SUPABASE_PROJECT_REF` و `SEED_SECRET` في Netlify → شغّل الـ SQL من `supabase/schema.sql` في Supabase → Redeploy → افتح رابط الـ seed مرة واحدة → بعدها الدخول يعمل.
