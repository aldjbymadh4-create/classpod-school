from pathlib import Path

sp = Path("server.js")
ap = Path("public/app.js")
s = sp.read_text(encoding="utf-8")
a = ap.read_text(encoding="utf-8")

start = s.find("app.post('/api/login'")
end = s.find("app.post('/api/logout'", start)
if start < 0 or end < 0:
    raise SystemExit("توقف: لم أجد مسارات الدخول المتوقعة.")

auth = r"""
const hashPassword = password => {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(String(password), salt, 64).toString('hex');
};
const checkPassword = (password, stored) => {
  try {
    const [salt, hash] = String(stored || '').split(':');
    if (!salt || !hash) return false;
    const actual = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
};

app.post('/api/login', (q, r) => {
  if (tooMany(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');
  const name = clean(q.body.name, 40);
  const password = String(q.body.password || '');
  const u = db.users.find(x =>
    String(x.name || '').toLowerCase() === name.toLowerCase() && x.passwordHash
  );
  if (!u || !checkPassword(password, u.passwordHash)) {
    attempts[q.ip].n++;
    return E(r, 401, 'الاسم أو كلمة المرور غير صحيحة');
  }
  attempts[q.ip].n = 0;
  startSession(r, u);
  r.json({ ok: 1 });
});

app.post('/api/join', (q, r) => {
  if (tooMany(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');

  const code = String(q.body.code || '').trim();
  const admin = db.users.find(u => u.role === 'admin');
  let role = null;

  if (code === String(db.school.studentCode)) role = 'student';
  else if (code === String(db.school.teacherCode)) role = 'teacher';
  else if (admin && code === String(admin.code)) role = 'admin';

  if (!role) {
    attempts[q.ip].n++;
    return E(r, 401, 'رمز الدخول غير صحيح');
  }

  const name = clean(q.body.name, 40);
  const password = String(q.body.password || '');

  if (name.length < 2) return E(r, 400, 'اكتب اسمك');
  if (password.length < 8 || password.length > 128)
    return E(r, 400, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');

  const duplicate = db.users.some(u =>
    String(u.name || '').toLowerCase() === name.toLowerCase() &&
    !(role === 'admin' && admin && u.id === admin.id)
  );
  if (duplicate) return E(r, 409, 'هذا الاسم مستخدم بالفعل، اختر اسمًا آخر');

  if (role === 'admin') {
    if (!admin) return E(r, 500, 'حساب المسؤول الحالي غير موجود');
    if (admin.passwordHash)
      return E(r, 409, 'تم إعداد حساب المسؤول مسبقًا. سجّل الدخول بالاسم وكلمة المرور');

    admin.name = name;
    admin.passwordHash = hashPassword(password);
    admin.createdAt = admin.createdAt || Date.now();
    save();
    attempts[q.ip].n = 0;
    startSession(r, admin);
    return r.json({ ok: 1 });
  }

  let classId = null;
  if (role === 'student') {
    const grade = String(q.body.grade || '');
    const grades = ['أول ثانوي', 'ثاني ثانوي', 'ثالث ثانوي'];
    const number = Number(q.body.classNumber);

    if (!grades.includes(grade)) return E(r, 400, 'اختر المرحلة الدراسية');
    if (!Number.isInteger(number) || number < 1 || number > 9)
      return E(r, 400, 'اختر رقم الفصل من 1 إلى 9');

    const className = 'فصل ' + number;
    let cls = db.classes.find(c => c.grade === grade && c.name === className);
    if (!cls) {
      cls = { id: uid(), grade, name: className };
      db.classes.push(cls);
    }
    classId = cls.id;
  }

  db.users.push({
    id: uid(),
    name,
    role,
    classId,
    nationality: '',
    passwordHash: hashPassword(password),
    createdAt: Date.now()
  });

  attempts[q.ip].n = 0;
  startSession(r, db.users[db.users.length - 1]);
  r.json({ ok: 1 });
});
"""
s = s[:start] + auth + s[end:]

old_route = "app.get('/api/users', auth, need('admin'), (q, r) => r.json(db.users.map(u => ({ ...pub(u), code: u.role === 'admin' ? u.code : undefined }))));"
new_route = "app.get('/api/users', auth, need('admin'), (q, r) => r.json(db.users.map(u => ({ ...pub(u), createdAt: u.createdAt || null }))));"
if old_route not in s:
    raise SystemExit("توقف: لم أجد مسار قائمة المستخدمين المتوقع.")

s = s.replace(old_route, new_route, 1)

if "let authMode = 'login';" not in a:
    marker = "const ROLE = { admin: 'مسؤولة النظام', teacher: 'معلم', student: 'طالب' };"
    if marker not in a:
        raise SystemExit("توقف: لم أجد تعريف الأدوار.")
    a = a.replace(marker, marker + "\nlet authMode = 'login';", 1)

ui_start = a.find("async function step(s)")
ui_end = a.find("\n\nfunction go(t)", ui_start)
if ui_start < 0 or ui_end < 0:
    raise SystemExit("توقف: لم أجد شاشة الدخول المتوقعة.")

ui = r"""function loginView() {
  const f = (id, label, placeholder, extra = '') =>
    `<label>${label}</label><input id="${id}" placeholder="${placeholder}" ${extra}>`;

  const header = `<div class="floaty"><span>📚</span><span>🏆</span><span>⭐</span><span>💬</span></div>
    <img class="pop" src="logo.png" onerror="this.style.display='none'">
    <h1>أهلاً بك في ClassPod</h1>
    <p class="fade">كلاس بود · مدرسة أم القرى<br>مجموعتك، نقاطك، وترتيبك بين الأفضل 🏆</p>`;

  let form;
  if (authMode === 'login') {
    form = `<div class="card"><h3>تسجيل الدخول</h3>
      ${f('authName', 'الاسم', 'اكتب اسم الحساب', 'maxlength="40" autocomplete="username"')}
      ${f('authPassword', 'كلمة المرور', 'اكتب كلمة المرور', 'type="password" maxlength="128" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')doLogin()"')}
      <button class="btn" onclick="doLogin()">دخول 🚀</button>
      <p class="mut">أول مرة تستخدم التطبيق؟</p>
      <button class="btn ghost" onclick="authMode='signup';render()">إنشاء حساب جديد</button></div>`;
  } else {
    form = `<div class="card"><h3>إنشاء حساب جديد</h3>
      ${f('authName', 'الاسم', 'اختر اسمًا للحساب', 'maxlength="40" autocomplete="username"')}
      ${f('authPassword', 'كلمة المرور', '8 أحرف على الأقل', 'type="password" minlength="8" maxlength="128" autocomplete="new-password"')}
      ${f('authCode', 'رمز الدخول', 'أدخل الرمز الذي حصلت عليه', 'inputmode="numeric" maxlength="20" oninput="toggleStudentFields()"')}
      <div id="studentFields" style="display:none">
        <p class="mut">المدرسة: مدرسة أم القرى</p>
        <label>المرحلة الدراسية</label>
        <select id="authGrade"><option>أول ثانوي</option><option>ثاني ثانوي</option><option>ثالث ثانوي</option></select>
        <label>رقم الفصل</label>
        <select id="authClassNumber">${Array.from({length:9}, (_, i) => `<option value="${i+1}">فصل ${i+1}</option>`).join('')}</select>
      </div>
      <button class="btn" onclick="doJoin()">إنشاء الحساب 🚀</button>
      <button class="btn ghost" onclick="authMode='login';render()">لدي حساب بالفعل</button></div>`;
  }
  $('#app').innerHTML = `<div class="login">${header}${form}</div>`;
}

function toggleStudentFields() {
  const code = $('#authCode'), fields = $('#studentFields');
  if (code && fields) fields.style.display = code.value.trim() === '0000' ? 'block' : 'none';
}

async function doLogin() {
  try {
    await api('/api/login', 'POST', {
      name: $('#authName').value,
      password: $('#authPassword').value
    });
    authMode = 'login';
    tab = 'home';
    view = null;
    await load(true);
  } catch (e) { toast(e.message); }
}

async function doJoin() {
  try {
    await api('/api/join', 'POST', {
      name: $('#authName').value,
      password: $('#authPassword').value,
      code: $('#authCode').value.trim(),
      grade: $('#authGrade')?.value,
      classNumber: $('#authClassNumber')?.value
    });
    authMode = 'login';
    tab = 'home';
    view = null;
    await load(true);
  } catch (e) { toast(e.message); }
}

const logout = async () => {
  await api('/api/logout', 'POST');
  S = null;
  lastHash = '';
  authMode = 'login';
  render();
};"""

a = a[:ui_start] + ui + a[ui_end:]

old_display = "${u.code ? ' · الرمز: ' + esc(u.code) : ''}"
new_display = "${u.createdAt ? ' · أُنشئ: ' + new Date(u.createdAt).toLocaleDateString('ar-SA') : ' · حساب قديم'}"
if old_display not in a:
    raise SystemExit("توقف: لم أجد عرض الرمز في لوحة المسؤول.")

a = a.replace(old_display, new_display, 1)

sp.write_text(s, encoding="utf-8")
ap.write_text(a, encoding="utf-8")
print("تم تحديث server.js و public/app.js فقط.")
