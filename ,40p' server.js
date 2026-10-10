[1mdiff --git a/server.js b/server.js[m
[1mindex 0af9ef1..4b2f6eb 100644[m
[1m--- a/server.js[m
[1m+++ b/server.js[m
[36m@@ -75,27 +75,112 @@[m [mfunction tooMany(ip) { const a = attempts[ip] || (attempts[ip] = { n: 0, t: Date[m
 [m
 app.get('/api/classes', (q, r) => r.json(db.classes));[m
 [m
[32m+[m
[32m+[m[32mconst hashPassword = password => {[m
[32m+[m[32m  const salt = crypto.randomBytes(16).toString('hex');[m
[32m+[m[32m  return salt + ':' + crypto.scryptSync(String(password), salt, 64).toString('hex');[m
[32m+[m[32m};[m
[32m+[m[32mconst checkPassword = (password, stored) => {[m
[32m+[m[32m  try {[m
[32m+[m[32m    const [salt, hash] = String(stored || '').split(':');[m
[32m+[m[32m    if (!salt || !hash) return false;[m
[32m+[m[32m    const actual = crypto.scryptSync(String(password), salt, 64);[m
[32m+[m[32m    const expected = Buffer.from(hash, 'hex');[m
[32m+[m[32m    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);[m
[32m+[m[32m  } catch { return false; }[m
[32m+[m[32m};[m
[32m+[m
 app.post('/api/login', (q, r) => {[m
   if (tooMany(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');[m
[31m-  const c = String(q.body.code || '').trim();[m
[31m-  const u = db.users.find(x => x.role === 'admin' && x.code === c);[m
[31m-  if (!u) { attempts[q.ip].n++; return E(r, 401, 'الرمز غير صحيح'); }[m
[31m-  startSession(r, u); r.json({ ok: 1 });[m
[32m+[m[32m  const name = clean(q.body.name, 40);[m
[32m+[m[32m  const password = String(q.body.password || '');[m
[32m+[m[32m  const u = db.users.find(x =>[m
[32m+[m[32m    String(x.name || '').toLowerCase() === name.toLowerCase() && x.passwordHash[m
[32m+[m[32m  );[m
[32m+[m[32m  if (!u || !checkPassword(password, u.passwordHash)) {[m
[32m+[m[32m    attempts[q.ip].n++;[m
[32m+[m[32m    return E(r, 401, 'الاسم أو كلمة المرور غير صحيحة');[m
[32m+[m[32m  }[m
[32m+[m[32m  attempts[q.ip].n = 0;[m
[32m+[m[32m  startSession(r, u);[m
[32m+[m[32m  r.json({ ok: 1 });[m
 });[m
[32m+[m
 app.post('/api/join', (q, r) => {[m
   if (tooMany(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');[m
[31m-  const role = q.body.role === 'teacher' ? 'teacher' : 'student';[m
[32m+[m
   const code = String(q.body.code || '').trim();[m
[31m-  if (code !== (role === 'teacher' ? db.school.teacherCode : db.school.studentCode)) { attempts[q.ip].n++; return E(r, 401, 'الرمز غير صحيح'); }[m
[31m-  const name = clean(q.body.name, 40), nat = clean(q.body.nationality, 30);[m
[32m+[m[32m  const admin = db.users.find(u => u.role === 'admin');[m
[32m+[m[32m  let role = null;[m
[32m+[m
[32m+[m[32m  if (code === String(db.school.studentCode)) role = 'student';[m
[32m+[m[32m  else if (code === String(db.school.teacherCode)) role = 'teacher';[m
[32m+[m[32m  else if (admin && code === String(admin.code)) role = 'admin';[m
[32m+[m
[32m+[m[32m  if (!role) {[m
[32m+[m[32m    attempts[q.ip].n++;[m
[32m+[m[32m    return E(r, 401, 'رمز الدخول غير صحيح');[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  const name = clean(q.body.name, 40);[m
[32m+[m[32m  const password = String(q.body.password || '');[m
[32m+[m
   if (name.length < 2) return E(r, 400, 'اكتب اسمك');[m
[31m-  if (nat.length < 2) return E(r, 400, 'اكتب جنسيتك');[m
[32m+[m[32m  if (password.length < 8 || password.length > 128)[m
[32m+[m[32m    return E(r, 400, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');[m
[32m+[m
[32m+[m[32m  const duplicate = db.users.some(u =>[m
[32m+[m[32m    String(u.name || '').toLowerCase() === name.toLowerCase() &&[m
[32m+[m[32m    !(role === 'admin' && admin && u.id === admin.id)[m
[32m+[m[32m  );[m
[32m+[m[32m  if (duplicate) return E(r, 409, 'هذا الاسم مستخدم بالفعل، اختر اسمًا آخر');[m
[32m+[m
[32m+[m[32m  if (role === 'admin') {[m
[32m+[m[32m    if (!admin) return E(r, 500, 'حساب المسؤول الحالي غير موجود');[m
[32m+[m[32m    if (admin.passwordHash)[m
[32m+[m[32m      return E(r, 409, 'تم إعداد حساب المسؤول مسبقًا. سجّل الدخول بالاسم وكلمة المرور');[m
[32m+[m
[32m+[m[32m    admin.name = name;[m
[32m+[m[32m    admin.passwordHash = hashPassword(password);[m
[32m+[m[32m    admin.createdAt = admin.createdAt || Date.now();[m
[32m+[m[32m    save();[m
[32m+[m[32m    attempts[q.ip].n = 0;[m
[32m+[m[32m    startSession(r, admin);[m
[32m+[m[32m    return r.json({ ok: 1 });[m
[32m+[m[32m  }[m
[32m+[m
   let classId = null;[m
[31m-  if (role === 'student') { classId = q.body.classId; if (!db.classes.some(c => c.id === classId)) return E(r, 400, 'اختر فصلك'); }[m
[31m-  let u = db.users.find(x => x.role === role && x.name === name && (role === 'teacher' || x.classId === classId));[m
[31m-  if (!u) { u = { id: uid(), name, role, nationality: nat, classId }; db.users.push(u); }[m
[31m-  else if (!u.nationality) { u.nationality = nat; save(); }[m
[31m-  startSession(r, u); r.json({ ok: 1 });[m
[32m+[m[32m  if (role === 'student') {[m
[32m+[m[32m    const grade = String(q.body.grade || '');[m
[32m+[m[32m    const grades = ['أول ثانوي', 'ثاني ثانوي', 'ثالث ثانوي'];[m
[32m+[m[32m    const number = Number(q.body.classNumber);[m
[32m+[m
[32m+[m[32m    if (!grades.includes(grade)) return E(r, 400, 'اختر المرحلة الدراسية');[m
[32m+[m[32m    if (!Number.isInteger(number) || number < 1 || number > 9)[m
[32m+[m[32m      return E(r, 400, 'اختر رقم الفصل من 1 إلى 9');[m
[32m+[m
[32m+[m[32m    const className = 'فصل ' + number;[m
[32m+[m[32m    let cls = db.classes.find(c => c.grade === grade && c.name === className);[m
[32m+[m[32m    if (!cls) {[m
[32m+[m[32m      cls = { id: uid(), grade, name: className };[m
[32m+[m[32m      db.classes.push(cls);[m
[32m+[m[32m    }[m
[32m+[m[32m    classId = cls.id;[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  db.users.push({[m
[32m+[m[32m    id: uid(),[m
[32m+[m[32m    name,[m
[32m+[m[32m    role,[m
[32m+[m[32m    classId,[m
[32m+[m[32m    nationality: '',[m
[32m+[m[32m    passwordHash: hashPassword(password),[m
[32m+[m[32m    createdAt: Date.now()[m
[32m+[m[32m  });[m
[32m+[m
[32m+[m[32m  attempts[q.ip].n = 0;[m
[32m+[m[32m  startSession(r, db.users[db.users.length - 1]);[m
[32m+[m[32m  r.json({ ok: 1 });[m
 });[m
 app.post('/api/logout', (q, r) => {[m
   const sid = cookies(q).sid; if (sid) { delete db.sessions[sid]; save(); }[m
[36m@@ -220,7 +305,7 @@[m [mapp.delete('/api/classes/:id', auth, need('admin'), (q, r) => {[m
   if (db.users.some(u => u.classId === id) || db.groups.some(g => g.classId === id)) return E(r, 400, 'الفصل فيه طلاب أو مجموعات');[m
   db.classes = db.classes.filter(c => c.id !== id); save(); r.json({ ok: 1 });[m
 });[m
[31m-app.get('/api/users', auth, need('admin'), (q, r) => r.json(db.users.map(u => ({ ...pub(u), code: u.role === 'admin' ? u.code : undefined }))));[m
[32m+[m[32mapp.get('/api/users', auth, need('admin'), (q, r) => r.json(db.users.map(u => ({ ...pub(u), createdAt: u.createdAt || null }))));[m
 app.patch('/api/users/:id', auth, need('admin'), (q, r) => {[m
   const u = db.users.find(x => x.id === q.params.id); if (!u) return E(r, 404, 'غير موجود');[m
   const n = clean(q.body.name, 40); if (!n) return E(r, 400, 'اسم غير صالح'); u.name = n; save(); r.json({ ok: 1 });[m
