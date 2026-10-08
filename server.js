const express = require('express'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const PORT = process.env.PORT || 3020;
let db;
const save = () => { fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE); };
const uid = () => crypto.randomBytes(6).toString('hex');
const rc = () => String(crypto.randomInt(100000, 999999));
const newCode = () => { let c; do { c = rc(); } while ([db.school.studentCode, db.school.teacherCode, ...db.users.map(u => u.code)].includes(c)); return c; };

function init() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE));
    if (!db.classes || !db.school.studentCode) { console.log('قاعدة بيانات قديمة: احذف data/db.json ثم شغّل من جديد'); process.exit(1); }
    return;
  }
  db = { school: { name: 'أم القرى الثانوية', studentCode: rc(), teacherCode: '' }, classes: [], users: [], groups: [], messages: [], points: [], notifications: [], sessions: {}, questions: [], challenges: [] };
  db.school.teacherCode = newCode();
  db.classes.push({ id: uid(), grade: 'أول ثانوي', name: 'فصل 7' }, { id: uid(), grade: 'أول ثانوي', name: 'فصل 8' });
  db.users.push({ id: uid(), name: 'المسؤولة', role: 'admin', code: newCode() });
  save();
}
init();
console.log('\n== رموز الدخول ==');
console.log('المسؤولة:', db.users.find(u => u.role === 'admin').code);
console.log('الطلاب  :', db.school.studentCode);
console.log('المعلم  :', db.school.teacherCode);

const clean = (s, n) => String(s || '').trim().replace(/[ \t]+/g, ' ').slice(0, n);
const isStaff = u => u.role === 'admin' || u.role === 'teacher';
const pub = u => ({ id: u.id, name: u.name, role: u.role, nationality: u.nationality || '', classId: u.classId || null });
const total = gid => db.points.filter(p => p.groupId === gid).reduce((s, p) => s + p.amount, 0);
const grp = id => db.groups.find(g => g.id === id);
const busyIds = () => db.groups.flatMap(g => g.memberIds);
function ranks() {
  const m = {};
  db.classes.forEach(c => {
    const l = db.groups.filter(g => g.classId === c.id).map(g => ({ id: g.id, p: total(g.id) })).sort((a, b) => b.p - a.p);
    l.forEach((x, i) => { m[x.id] = i && l[i - 1].p === x.p ? m[l[i - 1].id] : i + 1; });
  });
  return m;
}
function notify(ids, text, type, groupId) {
  ids.forEach(userId => db.notifications.push({ id: uid(), userId, text, type, groupId: groupId || null, at: Date.now(), read: false }));
  if (db.notifications.length > 3000) db.notifications = db.notifications.slice(-2000);
}
const E = (r, c, m) => r.status(c).json({ error: m });

const app = express();
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '20kb' }));
app.use((q, r, n) => { r.set('X-Content-Type-Options', 'nosniff'); r.set('Cache-Control', 'no-store'); n(); });

function cookies(q) {
  const o = {};
  (q.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1)); });
  return o;
}
function auth(q, r, n) {
  const sid = cookies(q).sid, s = sid && db.sessions[sid];
  if (!s || s.exp < Date.now()) return E(r, 401, 'سجّل الدخول أولاً');
  const u = db.users.find(x => x.id === s.uid);
  if (!u) return E(r, 401, 'سجّل الدخول أولاً');
  q.user = u; n();
}
const need = (...roles) => (q, r, n) => roles.includes(q.user.role) ? n() : E(r, 403, 'ليست لديك صلاحية');
const canView = (u, g) => isStaff(u) || g.memberIds.includes(u.id);
function startSession(r, u) {
  const sid = crypto.randomBytes(24).toString('hex');
  db.sessions[sid] = { uid: u.id, exp: Date.now() + 30 * 864e5 }; save();
  r.setHeader('Set-Cookie', 'sid=' + sid + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + (30 * 86400) + (r.req.secure ? '; Secure' : ''));
}
const attempts = {};
function tooMany(ip) { const a = attempts[ip] || (attempts[ip] = { n: 0, t: Date.now() }); if (Date.now() - a.t > 600000) { a.n = 0; a.t = Date.now(); } return a.n >= 8; }

app.get('/api/classes', (q, r) => r.json(db.classes));

app.post('/api/login', (q, r) => {
  if (tooMany(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');
  const c = String(q.body.code || '').trim();
  const u = db.users.find(x => x.role === 'admin' && x.code === c);
  if (!u) { attempts[q.ip].n++; return E(r, 401, 'الرمز غير صحيح'); }
  startSession(r, u); r.json({ ok: 1 });
});
app.post('/api/join', (q, r) => {
  if (tooMany(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');
  const role = q.body.role === 'teacher' ? 'teacher' : 'student';
  const code = String(q.body.code || '').trim();
  if (code !== (role === 'teacher' ? db.school.teacherCode : db.school.studentCode)) { attempts[q.ip].n++; return E(r, 401, 'الرمز غير صحيح'); }
  const name = clean(q.body.name, 40), nat = clean(q.body.nationality, 30);
  if (name.length < 2) return E(r, 400, 'اكتب اسمك');
  if (nat.length < 2) return E(r, 400, 'اكتب جنسيتك');
  let classId = null;
  if (role === 'student') { classId = q.body.classId; if (!db.classes.some(c => c.id === classId)) return E(r, 400, 'اختر فصلك'); }
  let u = db.users.find(x => x.role === role && x.name === name && (role === 'teacher' || x.classId === classId));
  if (!u) { u = { id: uid(), name, role, nationality: nat, classId }; db.users.push(u); }
  else if (!u.nationality) { u.nationality = nat; save(); }
  startSession(r, u); r.json({ ok: 1 });
});
app.post('/api/logout', (q, r) => {
  const sid = cookies(q).sid; if (sid) { delete db.sessions[sid]; save(); }
  r.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0'); r.json({ ok: 1 });
});

app.get('/api/state', auth, (q, r) => {
  const u = q.user, rk = ranks(), st = isStaff(u);
  const groups = db.groups.filter(g => st || g.classId === u.classId).map(g => ({ ...g, points: total(g.id), rank: rk[g.id] || null }));
  const users = st ? db.users : db.users.filter(x => isStaff(x) || x.classId === u.classId);
  r.json({
    me: pub(u), classes: db.classes, users: users.map(pub), busy: busyIds(), groups,
    school: { name: db.school.name, studentCode: st ? db.school.studentCode : undefined, teacherCode: u.role === 'admin' ? db.school.teacherCode : undefined },
    unread: db.notifications.filter(n => n.userId === u.id && !n.read).length
  });
});

app.post('/api/groups', auth, need('admin', 'teacher'), (q, r) => {
  const name = clean(q.body.name, 40), classId = q.body.classId;
  if (!db.classes.some(c => c.id === classId)) return E(r, 400, 'اختر الفصل');
  if (!name) return E(r, 400, 'اكتب اسم المجموعة');
  if (db.groups.some(g => g.classId === classId && g.name === name)) return E(r, 400, 'هذا الاسم مستخدم في الفصل');
  const ids = [...new Set(Array.isArray(q.body.memberIds) ? q.body.memberIds : [])];
  if (ids.length < 2 || ids.length > 5) return E(r, 400, 'المجموعة من 2 إلى 5 طلاب');
  const busy = busyIds();
  for (const id of ids) {
    const m = db.users.find(x => x.id === id);
    if (!m || m.role !== 'student' || m.classId !== classId) return E(r, 400, 'طالب غير صالح لهذا الفصل');
    if (busy.includes(id)) return E(r, 400, m.name + ' في مجموعة أخرى');
  }
  const leaderId = ids.includes(q.body.leaderId) ? q.body.leaderId : ids[0];
  const g = { id: uid(), name, classId, leaderId, memberIds: ids, createdAt: Date.now() };
  db.groups.push(g);
  notify(ids, 'تم ضمّك إلى مجموعة "' + name + '"', 'member', g.id);
  save(); r.json({ ok: 1, id: g.id });
});
app.patch('/api/groups/:id', auth, need('admin', 'teacher'), (q, r) => {
  const g = grp(q.params.id); if (!g) return E(r, 404, 'غير موجودة');
  if (q.body.name !== undefined) {
    const n = clean(q.body.name, 40); if (!n) return E(r, 400, 'اسم غير صالح');
    if (db.groups.some(x => x.classId === g.classId && x.name === n && x.id !== g.id)) return E(r, 400, 'هذا الاسم مستخدم');
    g.name = n;
  }
  if (q.body.leaderId !== undefined) { if (!g.memberIds.includes(q.body.leaderId)) return E(r, 400, 'العريف يجب أن يكون من الأعضاء'); g.leaderId = q.body.leaderId; }
  save(); r.json({ ok: 1 });
});
app.post('/api/groups/:id/members', auth, need('admin', 'teacher'), (q, r) => {
  const g = grp(q.params.id); if (!g) return E(r, 404, 'غير موجودة');
  const m = db.users.find(x => x.id === q.body.userId);
  if (!m || m.role !== 'student' || m.classId !== g.classId) return E(r, 400, 'طالب غير صالح');
  if (busyIds().includes(m.id)) return E(r, 400, 'الطالب في مجموعة أخرى');
  if (g.memberIds.length >= 5) return E(r, 400, 'الحد الأقصى 5 طلاب');
  g.memberIds.push(m.id); notify([m.id], 'تمت إضافتك إلى مجموعة "' + g.name + '"', 'member', g.id); save(); r.json({ ok: 1 });
});
app.delete('/api/groups/:id/members/:uid', auth, need('admin', 'teacher'), (q, r) => {
  const g = grp(q.params.id); if (!g || !g.memberIds.includes(q.params.uid)) return E(r, 404, 'غير موجود');
  if (g.memberIds.length <= 1) return E(r, 400, 'احذف المجموعة بدل ذلك');
  g.memberIds = g.memberIds.filter(x => x !== q.params.uid);
  if (g.leaderId === q.params.uid) g.leaderId = g.memberIds[0];
  notify([q.params.uid], 'تمت إزالتك من مجموعة "' + g.name + '"', 'member'); save(); r.json({ ok: 1 });
});
function dropGroup(g) {
  db.groups = db.groups.filter(x => x.id !== g.id);
  db.messages = db.messages.filter(m => m.groupId !== g.id);
  db.points = db.points.filter(p => p.groupId !== g.id);
}
app.delete('/api/groups/:id', auth, need('admin', 'teacher'), (q, r) => {
  const g = grp(q.params.id); if (!g) return E(r, 404, 'غير موجودة');
  notify(g.memberIds, 'تم حذف مجموعة "' + g.name + '"', 'member'); dropGroup(g); save(); r.json({ ok: 1 });
});

app.get('/api/groups/:id/messages', auth, (q, r) => {
  const g = grp(q.params.id); if (!g || !canView(q.user, g)) return E(r, 403, 'ليست لديك صلاحية');
  r.json(db.messages.filter(m => m.groupId === g.id).slice(-200));
});
app.post('/api/groups/:id/messages', auth, (q, r) => {
  const g = grp(q.params.id); if (!g || !canView(q.user, g)) return E(r, 403, 'ليست لديك صلاحية');
  const text = String(q.body.text || '').trim().slice(0, 500); if (!text) return E(r, 400, 'الرسالة فارغة');
  db.messages.push({ id: uid(), groupId: g.id, userId: q.user.id, text, at: Date.now() });
  g.memberIds.filter(x => x !== q.user.id).forEach(x => {
    if (!db.notifications.some(n => n.userId === x && n.groupId === g.id && n.type === 'msg' && !n.read))
      notify([x], 'رسالة جديدة في "' + g.name + '"', 'msg', g.id);
  });
  save(); r.json({ ok: 1 });
});

app.get('/api/groups/:id/points', auth, (q, r) => {
  const g = grp(q.params.id); if (!g || !canView(q.user, g)) return E(r, 403, 'ليست لديك صلاحية');
  r.json(db.points.filter(p => p.groupId === g.id).slice(-100).reverse());
});
app.post('/api/groups/:id/points', auth, need('admin', 'teacher'), (q, r) => {
  const g = grp(q.params.id); if (!g) return E(r, 404, 'غير موجودة');
  const amount = parseInt(q.body.amount, 10);
  if (!amount || Math.abs(amount) > 1000) return E(r, 400, 'عدد نقاط غير صالح');
  const before = ranks();
  db.points.push({ id: uid(), groupId: g.id, amount, note: clean(q.body.note, 100), by: q.user.id, byName: q.user.name, at: Date.now() });
  notify(g.memberIds, (amount > 0 ? 'تمت إضافة ' : 'تم خصم ') + Math.abs(amount) + ' نقطة ' + (amount > 0 ? 'إلى' : 'من') + ' مجموعتكم "' + g.name + '"', 'points', g.id);
  const after = ranks();
  db.groups.filter(x => before[x.id] !== after[x.id]).forEach(x => notify(x.memberIds, 'ترتيب مجموعة "' + x.name + '" أصبح ' + after[x.id], 'rank', x.id));
  save(); r.json({ ok: 1 });
});

app.get('/api/notifications', auth, (q, r) => r.json(db.notifications.filter(n => n.userId === q.user.id).slice(-50).reverse()));
app.post('/api/notifications/read', auth, (q, r) => { db.notifications.forEach(n => { if (n.userId === q.user.id) n.read = true; }); save(); r.json({ ok: 1 }); });

app.post('/api/codes/:which', auth, (q, r) => {
  const w = q.params.which;
  if ((w === 'student' && process.env.STUDENT_CODE) || (w === 'teacher' && process.env.TEACHER_CODE)) return E(r, 400, 'هذا الرمز ثابت من إعدادات الخادم');
  if (w === 'student' && isStaff(q.user)) db.school.studentCode = newCode();
  else if (w === 'teacher' && q.user.role === 'admin') db.school.teacherCode = newCode();
  else return E(r, 403, 'ليست لديك صلاحية');
  save(); r.json({ ok: 1 });
});
app.post('/api/classes', auth, need('admin', 'teacher'), (q, r) => {
  const grade = clean(q.body.grade, 30), name = clean(q.body.name, 30);
  if (!grade || !name) return E(r, 400, 'اكتب الصف واسم الفصل');
  if (db.classes.some(c => c.grade === grade && c.name === name)) return E(r, 400, 'الفصل موجود');
  db.classes.push({ id: uid(), grade, name }); save(); r.json({ ok: 1 });
});
app.delete('/api/classes/:id', auth, need('admin'), (q, r) => {
  const id = q.params.id;
  if (db.users.some(u => u.classId === id) || db.groups.some(g => g.classId === id)) return E(r, 400, 'الفصل فيه طلاب أو مجموعات');
  db.classes = db.classes.filter(c => c.id !== id); save(); r.json({ ok: 1 });
});
app.get('/api/users', auth, need('admin'), (q, r) => r.json(db.users.map(u => ({ ...pub(u), code: u.role === 'admin' ? u.code : undefined }))));
app.patch('/api/users/:id', auth, need('admin'), (q, r) => {
  const u = db.users.find(x => x.id === q.params.id); if (!u) return E(r, 404, 'غير موجود');
  const n = clean(q.body.name, 40); if (!n) return E(r, 400, 'اسم غير صالح'); u.name = n; save(); r.json({ ok: 1 });
});
app.delete('/api/users/:id', auth, need('admin'), (q, r) => {
  const u = db.users.find(x => x.id === q.params.id); if (!u || u.role === 'admin') return E(r, 400, 'لا يمكن الحذف');
  db.users = db.users.filter(x => x.id !== u.id);
  db.groups.slice().forEach(g => {
    if (!g.memberIds.includes(u.id)) return;
    g.memberIds = g.memberIds.filter(x => x !== u.id);
    if (!g.memberIds.length) dropGroup(g); else if (g.leaderId === u.id) g.leaderId = g.memberIds[0];
  });
  Object.keys(db.sessions).forEach(k => { if (db.sessions[k].uid === u.id) delete db.sessions[k]; });
  save(); r.json({ ok: 1 });
});

require('./extra')({ app, db, save, uid, clean, notify, ranks, grp, E, auth, need, isStaff, dropGroup, crypto, fs, path });
require('./dm')({ app, db, save, uid, notify, E, auth, need, isStaff });
{
  const e = process.env;
  if (e.STUDENT_CODE) db.school.studentCode = String(e.STUDENT_CODE).trim();
  if (e.TEACHER_CODE) db.school.teacherCode = String(e.TEACHER_CODE).trim();
  if (e.ADMIN_CODE) { const a = db.users.find(u => u.role === 'admin'); if (a) a.code = String(e.ADMIN_CODE).trim(); }
  save();
  if (e.STUDENT_CODE || e.TEACHER_CODE || e.ADMIN_CODE) console.log('الرموز الثابتة من الإعدادات مفعّلة');
}
app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, '0.0.0.0', () => console.log('\nClassPod يعمل على http://localhost:' + PORT + '\n'));
