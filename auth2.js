module.exports = function (c) {
  const { app, db, save, E } = c, crypto = require('crypto'), tries = {};
  const limited = ip => { const a = tries[ip] || (tries[ip] = { n: 0, t: Date.now() }); if (Date.now() - a.t > 600000) { a.n = 0; a.t = Date.now(); } return a.n >= 8; };
  app.post('/api/login2', (q, r) => {
    if (limited(q.ip)) return E(r, 429, 'محاولات كثيرة، انتظر قليلاً');
    const code = String((q.body && q.body.code) || '').trim();
    const admin = code && db.users.find(u => u.role === 'admin' && u.code === code);
    if (admin) {
      const sid = crypto.randomBytes(24).toString('hex');
      db.sessions[sid] = { uid: admin.id, exp: Date.now() + 30 * 864e5 }; save();
      r.setHeader('Set-Cookie', 'sid=' + sid + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + (30 * 86400) + (r.req && r.req.secure ? '; Secure' : ''));
      return r.json({ ok: 1, role: 'admin' });
    }
    if (code && code === db.school.studentCode) return r.json({ need: 'student' });
    if (code && code === db.school.teacherCode) return r.json({ need: 'teacher' });
    tries[q.ip].n++; E(r, 401, 'الرمز غير صحيح');
  });
};
