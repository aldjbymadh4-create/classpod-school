module.exports = function (c) {
  const { app, db, save, uid, clean, E, auth, need } = c, crypto = require('crypto'), tries = {};
  const hash = (pw, salt) => crypto.scryptSync(String(pw), salt, 32);
  const setPw = (u, pw) => { u.pwSalt = crypto.randomBytes(16).toString('hex'); u.pwHash = hash(pw, u.pwSalt).toString('hex'); };
  const checkPw = (u, pw) => !!(u.pwHash && u.pwSalt) && crypto.timingSafeEqual(hash(pw, u.pwSalt), Buffer.from(u.pwHash, 'hex'));
  const norm = s => String(s || '').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
  const limited = ip => { const a = tries[ip] || (tries[ip] = { n: 0, t: Date.now() }); if (Date.now() - a.t > 600000) { a.n = 0; a.t = Date.now(); } return a.n >= 8; };
  const fail = ip => { tries[ip].n++; };
  function session(r, u) {
    const sid = crypto.randomBytes(24).toString('hex');
    db.sessions[sid] = { uid: u.id, exp: Date.now() + 30 * 864e5 }; save();
    r.setHeader('Set-Cookie', 'sid=' + sid + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + (30 * 86400) + (r.req && r.req.secure ? '; Secure' : ''));
  }
  const isReserved = pw => [db.school.studentCode, db.school.teacherCode, ...db.users.filter(u => u.role === 'admin').map(u => u.code)].includes(pw);

  app.post('/api/login2', (q, r) => {
    if (limited(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');
    const b = q.body || {}, code = String(b.code || '').trim(), name = norm(b.name);
    if (!code) { fail(q.ip); return E(r, 401, 'الاسم أو كلمة المرور غير صحيحة'); }
    const admin = db.users.find(u => u.role === 'admin' && u.code === code);
    if (admin) { session(r, admin); return r.json({ ok: 1, role: 'admin' }); }
    if (code === db.school.studentCode) return r.json({ need: 'student' });
    if (code === db.school.teacherCode) return r.json({ need: 'teacher' });
    if (!name) return E(r, 400, 'اكتب اسمك وكلمة المرور');
    const u = db.users.filter(x => x.role !== 'admin' && x.pwHash && norm(x.name) === name).find(x => checkPw(x, code));
    if (u) { session(r, u); return r.json({ ok: 1, role: u.role }); }
    fail(q.ip); E(r, 401, 'الاسم أو كلمة المرور غير صحيحة');
  });

  app.post('/api/register', (q, r) => {
    if (limited(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');
    const b = q.body || {}, role = b.role === 'teacher' ? 'teacher' : 'student', code = String(b.code || '').trim();
    if (code !== (role === 'teacher' ? db.school.teacherCode : db.school.studentCode)) { fail(q.ip); return E(r, 401, 'الرمز غير صحيح'); }
    const name = clean(b.name, 40), nat = clean(b.nationality, 30), pw = String(b.password || '');
    if (name.length < 2) return E(r, 400, 'اكتب اسمك');
    if (nat.length < 2) return E(r, 400, 'اكتب جنسيتك');
    if (pw.length < 6 || pw.length > 64) return E(r, 400, 'كلمة المرور من 6 إلى 64 حرفاً');
    if (isReserved(pw)) return E(r, 400, 'اختر كلمة مرور أخرى');
    let classId = null;
    if (role === 'student') { classId = b.classId; if (!db.classes.some(x => x.id === classId)) return E(r, 400, 'اختر فصلك'); }
    let u = db.users.find(x => x.role === role && norm(x.name) === norm(name) && (role === 'teacher' || x.classId === classId));
    if (u && u.pwHash) return E(r, 409, 'هذا الحساب موجود مسبقاً، سجّل الدخول باسمك وكلمة المرور');
    if (!u) { u = { id: uid(), name, role, nationality: nat, classId }; db.users.push(u); } else if (!u.nationality) u.nationality = nat;
    setPw(u, pw); session(r, u); r.json({ ok: 1 });
  });

  app.post('/api/users/:id/resetpw', auth, need('admin'), (q, r) => {
    const u = db.users.find(x => x.id === q.params.id);
    if (!u || u.role === 'admin') return E(r, 404, 'غير موجود');
    delete u.pwHash; delete u.pwSalt; delete u.pwTag;
    Object.keys(db.sessions).forEach(k => { if (db.sessions[k].uid === u.id) delete db.sessions[k]; });
    save(); r.json({ ok: 1 });
  });
};
