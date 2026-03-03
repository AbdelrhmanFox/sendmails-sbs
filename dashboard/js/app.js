(function () {
      const STORAGE_LANG = 'sbs_sendmails_lang';
      const AUTH_TOKEN = 'sbs_token';
      const AUTH_ROLE = 'sbs_role';
      const AUTH_USER = 'sbs_username';
      const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/1sUUpVcRs5tE1KzNGaVA4cnQShvr1eI1bvkO44jAsKtI/edit?gid=0#gid=0';

      var authToken = localStorage.getItem(AUTH_TOKEN);
      var authRole = localStorage.getItem(AUTH_ROLE);
      var authUsername = localStorage.getItem(AUTH_USER);
      var loginScreen = document.getElementById('login-screen');
      var appEl = document.getElementById('app');

      function showApp() {
        if (loginScreen) loginScreen.classList.remove('visible');
        if (appEl) { appEl.classList.remove('hidden'); appEl.style.display = 'block'; }
        var userEl = document.getElementById('loggedInUser');
        if (userEl && authUsername) userEl.textContent = authUsername;
        var adminTab = document.getElementById('tabBtnAdmin');
        var adminPane = document.getElementById('tab-admin');
        if (authRole === 'admin' && adminTab) adminTab.style.display = '';
      }
      function showLogin() {
        if (loginScreen) loginScreen.classList.add('visible');
        if (appEl) { appEl.classList.add('hidden'); appEl.style.display = 'none'; }
      }

      if (!authToken || !authRole) {
        showLogin();
      } else {
        showApp();
      }

      const i18n = {
        ar: {
          title: 'إرسال إيميلات SBS',
          subtitle: 'اختر الشيت، اكتب الموضوع ونص الإيميل، ثم شغّل الإرسال من واجهة واحدة',
          settings: 'الإعدادات',
          labelWebhook: 'رابط الـ Webhook في n8n',
          placeholderWebhook: 'https://your-n8n.com/webhook/sendmails-sbs',
          hintWebhook: 'ويب هوك واحد: زر «جلب الأعمدة» يشغّل المعاينة، وزر «بدء الإرسال» يشغّل الإرسال.',
          chooseAction: 'اختر الوظيفة',
          hintAction: 'حدّد ماذا تريد أن يفعل الـ Webhook الآن: معاينة أعمدة الشيت فقط، أو بدء إرسال الإيميلات فعلياً.',
          btnLoadColumns: 'جلب أعمدة الشيت',
          descLoadColumns: 'يعرض أسماء الأعمدة وصف كمثال للاستخدام في Subject و Body',
          btnSend: 'بدء إرسال الإيميلات',
          descSend: 'يبدأ إرسال الإيميلات من الشيت المحدد (إيميل كل 5 دقايق)',
          sheetTitle: 'الشيت (مصدر البيانات)',
          labelSheet: 'رابط جوجل شيت',
          placeholderSheet: 'https://docs.google.com/spreadsheets/d/...',
          hintSheet: 'يُستخدم نفس الشيت للقراءة وتحديث عمود «Email Sent» بعد الإرسال.',
          columnsSubtitle: 'أعمدة الشيت (للاستخدام في Subject و Body كـ {{اسم_العمود}})',
          sampleRowSubtitle: 'صف كمثال (أول صف بيانات)',
          loadingColumns: 'جاري تحميل الأعمدة...',
          chipTitle: 'استخدم في Subject أو Body',
          subjectTitle: 'عنوان الإيميل (Subject)',
          labelSubject: 'استخدم دمج مثل: {{Name}} ، {{Email}}',
          placeholderSubject: 'مثال: Ramadan Kareem – دعوة ويبنار، عزيزي {{Name}}',
          bodyTitle: 'نص الإيميل (Body)',
          labelBody: 'اكتب المحتوى مع التنسيق (عريض، روابط، قوائم). استخدم {{Name}} ، {{Email}} ، {{شهاده}} للدمج.',
          placeholderBody: 'اكتب نص الإيميل هنا...',
          previewTitle: 'معاينة مع بيانات تجريبية',
          hintPreview: 'العنوان والمعاينة بعد استبدال القيم التجريبية (أو من صف الشيت إن جلبته).',
          errWebhookRequired: 'أدخل رابط الـ Webhook أولاً.',
          errWebhookInvalid: 'رابط الـ Webhook غير صالح. يجب أن يبدأ بـ http أو https ويحتوي على webhook.',
          errSheetRequired: 'أدخل رابط الشيت أولاً.',
          errSheetInvalid: 'رابط جوجل شيت غير صالح. مثال: https://docs.google.com/spreadsheets/d/...',
          errSubjectRequired: 'أدخل عنوان الإيميل.',
          errNoColumns: 'لم يتم إرجاع أعمدة. تحقق من الشيت والـ workflow.',
          errServer: 'استجابة الخادم {{status}}: {{detail}}',
          errNetwork: 'تعذّر الاتصال بالخادم. إن كنت تفتح الصفحة من ملف محلي (file://)، جرّب تشغيلها من خادم محلي (npx serve) أو تحقق من رابط الـ Webhook و CORS.',
          errGeneric: 'خطأ في الاتصال: {{msg}}',
          err401: 'غير مصرح (401). تحقق من إعدادات n8n والـ Webhook.',
          err403: 'ممنوع (403). تحقق من صلاحيات الـ Webhook.',
          err404: 'الويب هوك غير موجود (404). تأكد من تشغيل الـ workflow ونسخ الرابط الصحيح.',
          err500: 'خطأ في الخادم (500). راجع تنفيذ الـ workflow في n8n (Executions).',
          loginTitle: 'تسجيل الدخول',
          loginUsername: 'اسم المستخدم',
          loginPassword: 'كلمة المرور',
          btnLogin: 'دخول',
          btnLogout: 'خروج',
          loginErr: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
          tabSendmails: 'إرسال الإيميلات',
          tabQr: 'QR Code',
          qrTitle: 'توليد QR Code',
          qrHint: 'ضع الرابط أو النص الذي تريد تحويله إلى صورة QR، ثم اضغط توليد.',
          qrLabelUrl: 'الرابط أو النص',
          qrPlaceholder: 'https://example.com أو أي نص',
          btnGenerateQr: 'توليد QR',
          btnDownloadQr: 'تحميل الصورة',
          qrErrEmpty: 'أدخل رابطاً أو نصاً أولاً.',
          tabAdmin: 'إدارة المستخدمين',
          adminHint: 'إضافة مستخدم جديد (يستطيع الدخول من أي جهاز بنفس اسم المستخدم وكلمة المرور).',
          newUsername: 'اسم المستخدم الجديد',
          newPassword: 'كلمة المرور',
          btnCreateUser: 'إضافة مستخدم',
          usersListTitle: 'المستخدمون الحاليون',
          thUsername: 'المستخدم',
          thRole: 'الدور',
          roleAdmin: 'مدير',
          roleUser: 'مستخدم',
          errTimeout: 'انتهت مهلة الاتصال. تحقق من أن n8n يعمل والرابط صحيح.',
          successSend: 'تم بدء الإرسال.',
          insertPlaceholder: 'إدراج متغير:',
          btnInsertPlaceholder: 'إدراج',
          editorHelpTitle: 'كيفية استخدام أدوات المحرر',
          editorHelpIntro: 'أدوات شريط التنسيق فوق منطقة الكتابة:',
          editorHelpBold: 'B — نص عريض (غامق).',
          editorHelpItalic: 'I — نص مائل.',
          editorHelpUnderline: 'U — تسطير تحت النص.',
          editorHelpStrike: 'S — يتوسط النص خط (للحذف أو التعديل).',
          editorHelpBlockquote: 'اقتباس — لعرض جملة كاقتباس بحد جانبي.',
          editorHelpCode: 'كود — لكتابة كود أو أمر بخط ثابت.',
          editorHelpH1: 'عنوان 1 / 2 / 3 — عناوين بدرجات مختلفة.',
          editorHelpList: 'قائمة مرقمة أو نقطية.',
          editorHelpIndent: 'تقليل/زيادة المسافة البادئة للسطر.',
          editorHelpAlign: 'محاذاة النص: لليمين، للوسط، لليسار.',
          editorHelpLink: 'رابط — إدراج رابط (URL) على النص المحدد.',
          editorHelpPlaceholder: '«إدراج متغير» — إدراج اسم عمود من الشيت (مثل {{Name}}) ليدمج مع كل إيميل.',
          writingDirection: 'اتجاه الكتابة:',
          dirRtl: 'من اليمين لليسار (RTL)',
          dirLtr: 'من اليسار لليمين (LTR)',
        },
        en: {
          title: 'SBS Sendmails',
          subtitle: 'Choose the sheet, set subject and body, then trigger sending from one place.',
          settings: 'Settings',
          labelWebhook: 'n8n Webhook URL',
          placeholderWebhook: 'https://your-n8n.com/webhook/sendmails-sbs',
          hintWebhook: 'One webhook: «Load columns» runs preview, «Start sending» runs the send flow.',
          chooseAction: 'Choose action',
          hintAction: 'Choose what the webhook should do now: preview sheet columns only, or start sending emails.',
          btnLoadColumns: 'Load sheet columns',
          descLoadColumns: 'Shows column names and a sample row for use in Subject and Body',
          btnSend: 'Start sending emails',
          descSend: 'Starts sending emails from the selected sheet (one email every 5 minutes)',
          sheetTitle: 'Sheet (data source)',
          labelSheet: 'Google Sheet URL',
          placeholderSheet: 'https://docs.google.com/spreadsheets/d/...',
          hintSheet: 'Same sheet is used for reading and updating the «Email Sent» column after sending.',
          columnsSubtitle: 'Sheet columns (use in Subject and Body as {{column_name}})',
          sampleRowSubtitle: 'Sample row (first data row)',
          loadingColumns: 'Loading columns...',
          chipTitle: 'Use in Subject or Body',
          subjectTitle: 'Email subject',
          labelSubject: 'Use merge like {{Name}}, {{Email}}',
          placeholderSubject: 'e.g. Ramadan Kareem – Webinar invite, dear {{Name}}',
          bodyTitle: 'Email body',
          labelBody: 'Write content with formatting. Use {{Name}}, {{Email}} for merge.',
          placeholderBody: 'Write your email body here...',
          previewTitle: 'Preview with sample data',
          hintPreview: 'Subject and body after replacing placeholders with sample values.',
          errWebhookRequired: 'Enter the Webhook URL first.',
          errWebhookInvalid: 'Invalid webhook URL. It must start with http or https and contain "webhook".',
          errSheetRequired: 'Enter the sheet URL first.',
          errSheetInvalid: 'Invalid Google Sheet URL. Example: https://docs.google.com/spreadsheets/d/...',
          errSubjectRequired: 'Enter the email subject.',
          errNoColumns: 'No columns returned. Check the sheet and workflow.',
          errServer: 'Server response {{status}}: {{detail}}',
          errNetwork: 'Could not reach the server. If opening from a local file (file://), try running from a local server (npx serve) or check webhook URL and CORS.',
          errGeneric: 'Connection error: {{msg}}',
          err401: 'Unauthorized (401). Check n8n and webhook settings.',
          err403: 'Forbidden (403). Check webhook permissions.',
          err404: 'Webhook not found (404). Make sure the workflow is active and the URL is correct.',
          err500: 'Server error (500). Check the workflow execution in n8n (Executions).',
          loginTitle: 'Login',
          loginUsername: 'Username',
          loginPassword: 'Password',
          btnLogin: 'Log in',
          btnLogout: 'Log out',
          loginErr: 'Invalid username or password.',
          tabSendmails: 'Send emails',
          tabQr: 'QR Code',
          qrTitle: 'Generate QR Code',
          qrHint: 'Enter the link or text to convert to a QR code image, then click Generate.',
          qrLabelUrl: 'Link or text',
          qrPlaceholder: 'https://example.com or any text',
          btnGenerateQr: 'Generate QR',
          btnDownloadQr: 'Download image',
          qrErrEmpty: 'Enter a link or text first.',
          tabAdmin: 'Manage users',
          adminHint: 'Add a new user (they can log in from any device with the same username and password).',
          newUsername: 'New username',
          newPassword: 'Password',
          btnCreateUser: 'Add user',
          usersListTitle: 'Current users',
          thUsername: 'Username',
          thRole: 'Role',
          roleAdmin: 'Admin',
          roleUser: 'User',
          errTimeout: 'Connection timed out. Ensure n8n is running and the URL is correct.',
          successSend: 'Sending started.',
          insertPlaceholder: 'Insert merge field:',
          btnInsertPlaceholder: 'Insert',
          editorHelpTitle: 'How to use the editor tools',
          editorHelpIntro: 'Toolbar above the typing area:',
          editorHelpBold: 'B — Bold text.',
          editorHelpItalic: 'I — Italic text.',
          editorHelpUnderline: 'U — Underline.',
          editorHelpStrike: 'S — Strikethrough.',
          editorHelpBlockquote: 'Quote — Show a sentence as a block quote.',
          editorHelpCode: 'Code — Monospace for code or commands.',
          editorHelpH1: 'Heading 1 / 2 / 3 — Different heading levels.',
          editorHelpList: 'Numbered or bullet list.',
          editorHelpIndent: 'Decrease / increase line indent.',
          editorHelpAlign: 'Align text: right, center, left.',
          editorHelpLink: 'Link — Insert a URL on selected text.',
          editorHelpPlaceholder: '«Insert merge field» — Insert a sheet column (e.g. {{Name}}) to merge in each email.',
          writingDirection: 'Writing direction:',
          dirRtl: 'Right to left (RTL)',
          dirLtr: 'Left to right (LTR)',
        }
      };

      let lang = localStorage.getItem(STORAGE_LANG) || 'ar';
      if (lang !== 'ar' && lang !== 'en') lang = 'ar';

      function t(key) {
        const str = i18n[lang][key];
        return str != null ? str : key;
      }
      function tReplace(key, vars) {
        let str = t(key);
        if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(new RegExp('{{' + k + '}}', 'g'), v);
        return str;
      }

      function applyLang() {
        document.documentElement.lang = lang;
        document.body.classList.toggle('lang-ar', lang === 'ar');
        document.body.classList.toggle('lang-en', lang === 'en');
        document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
          const key = el.getAttribute('data-i18n');
          if (key && i18n[lang][key]) el.textContent = i18n[lang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
          const key = el.getAttribute('data-i18n-placeholder');
          if (key && i18n[lang][key]) el.placeholder = i18n[lang][key];
        });
        if (window.quillEditor && i18n[lang].placeholderBody) quillEditor.root.setAttribute('data-placeholder', i18n[lang].placeholderBody);
        document.getElementById('langEn').classList.toggle('active', lang === 'en');
        document.getElementById('langAr').classList.toggle('active', lang === 'ar');
        var helpEl = document.getElementById('editorHelpContent');
        if (helpEl) {
          var intro = i18n[lang].editorHelpIntro;
          var items = [['editorHelpBold','editorHelpItalic','editorHelpUnderline','editorHelpStrike'],['editorHelpBlockquote','editorHelpCode'],['editorHelpH1','editorHelpList','editorHelpIndent','editorHelpAlign'],['editorHelpLink'],['editorHelpPlaceholder']];
          var flat = [];
          items.forEach(function(row) { row.forEach(function(k) { if (i18n[lang][k]) flat.push(i18n[lang][k]); }); });
          helpEl.innerHTML = '<p style="margin:0 0 10px 0">' + intro + '</p><ul style="margin:0; padding-left:1.4em">' + flat.map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ul>';
        }
        var lbl = document.querySelector('.editor-insert-bar label');
        if (lbl && i18n[lang].insertPlaceholder) lbl.textContent = i18n[lang].insertPlaceholder;
        var btnIns = document.getElementById('btnInsertPlaceholder');
        if (btnIns && i18n[lang].btnInsertPlaceholder) btnIns.textContent = i18n[lang].btnInsertPlaceholder;
        var sum = document.querySelector('.editor-help-summary');
        if (sum && i18n[lang].editorHelpTitle) sum.textContent = i18n[lang].editorHelpTitle;
        var dirRtlBtn = document.getElementById('dirRtl');
        if (dirRtlBtn) dirRtlBtn.textContent = (i18n[lang].dirRtl || 'RTL').replace(/\s*\(RTL\)\s*|\s*\(LTR\)\s*/g, '').trim() || 'RTL';
        var dirLtrBtn = document.getElementById('dirLtr');
        if (dirLtrBtn) dirLtrBtn.textContent = (i18n[lang].dirLtr || 'LTR').replace(/\s*\(RTL\)\s*|\s*\(LTR\)\s*/g, '').trim() || 'LTR';
      }

      document.getElementById('langEn').addEventListener('click', function () { lang = 'en'; localStorage.setItem(STORAGE_LANG, lang); applyLang(); });
      document.getElementById('langAr').addEventListener('click', function () { lang = 'ar'; localStorage.setItem(STORAGE_LANG, lang); applyLang(); });

      var loginForm = document.getElementById('loginForm');
      var loginError = document.getElementById('loginError');
      var btnLogin = document.getElementById('btnLogin');
      if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          var u = (document.getElementById('loginUsername').value || '').trim();
          var p = document.getElementById('loginPassword').value;
          if (loginError) { loginError.classList.remove('visible'); loginError.textContent = ''; }
          if (!u || !p) return;
          if (btnLogin) btnLogin.disabled = true;
          try {
            var res = await fetch('/.netlify/functions/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
            var data = {};
            try { data = await res.json(); } catch (_) {}
            if (res.ok && data.token && data.role) {
              localStorage.setItem(AUTH_TOKEN, data.token);
              localStorage.setItem(AUTH_ROLE, data.role);
              localStorage.setItem(AUTH_USER, data.username || u);
              window.location.reload();
              return;
            }
            if (loginError) { loginError.textContent = data.error || t('loginErr'); loginError.classList.add('visible'); }
          } catch (err) {
            if (loginError) { loginError.textContent = err.message || t('loginErr'); loginError.classList.add('visible'); }
          }
          if (btnLogin) btnLogin.disabled = false;
        });
      }

      var btnLogout = document.getElementById('btnLogout');
      if (btnLogout) btnLogout.addEventListener('click', function () { localStorage.removeItem(AUTH_TOKEN); localStorage.removeItem(AUTH_ROLE); localStorage.removeItem(AUTH_USER); window.location.reload(); });

      function getAuthHeaders() { var tok = localStorage.getItem(AUTH_TOKEN); return tok ? { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' } : {}; }

      const webhookUrlEl = document.getElementById('webhookUrl');
      const sheetUrlEl = document.getElementById('sheetUrl');
      const subjectEl = document.getElementById('subject');
      const previewSubject = document.getElementById('previewSubject');
      const previewBody = document.getElementById('previewBody');
      const btnSend = document.getElementById('btnSend');
      const btnLoadColumns = document.getElementById('btnLoadColumns');
      const messageEl = document.getElementById('message');
      const columnsSection = document.getElementById('columnsSection');
      const columnsChips = document.getElementById('columnsChips');
      const sampleTableHead = document.getElementById('sampleTableHead');
      const sampleTableBody = document.getElementById('sampleTableBody');
      const columnsLoading = document.getElementById('columnsLoading');
      const columnsError = document.getElementById('columnsError');

      var toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': [1, 2, 3, false] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        ['link']
      ];
      var quill;
      try {
        quill = new Quill('#editor-wrap', {
          theme: 'snow',
          placeholder: t('placeholderBody'),
          modules: { toolbar: toolbarOptions }
        });
      } catch (e) {
        quill = new Quill('#editor-wrap', { theme: 'snow', placeholder: t('placeholderBody') });
      }
      window.quillEditor = quill;

      var editorDirection = localStorage.getItem('sbs_sendmails_editor_dir') || 'rtl';
      function setEditorDirection(dir) {
        editorDirection = dir;
        localStorage.setItem('sbs_sendmails_editor_dir', dir);
        if (quill && quill.root) quill.root.setAttribute('dir', dir);
        var r = document.getElementById('dirRtl');
        var l = document.getElementById('dirLtr');
        if (r) r.classList.toggle('active', dir === 'rtl');
        if (l) l.classList.toggle('active', dir === 'ltr');
      }

      try {
        (function injectDirToolbar() {
          var toolbar = document.querySelector('#editor-wrap .ql-toolbar');
          if (!toolbar) return;
          var span = document.createElement('span');
          span.className = 'ql-formats ql-dir-group';
          span.setAttribute('title', t('writingDirection'));
          var btnRtl = document.createElement('button');
          btnRtl.type = 'button';
          btnRtl.className = 'dir-btn active';
          btnRtl.id = 'dirRtl';
          btnRtl.setAttribute('data-dir', 'rtl');
          btnRtl.textContent = 'RTL';
          var btnLtr = document.createElement('button');
          btnLtr.type = 'button';
          btnLtr.className = 'dir-btn';
          btnLtr.id = 'dirLtr';
          btnLtr.setAttribute('data-dir', 'ltr');
          btnLtr.textContent = 'LTR';
          span.appendChild(btnRtl);
          span.appendChild(btnLtr);
          toolbar.appendChild(span);
        })();