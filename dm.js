module.exports = function (c) {
  const { app, db, save, uid, notify, E, auth, need, isStaff } = c;
  db.dms = db.dms || []; db.reports = db.reports || [];
  if (db.school.dmStudents === undefined) db.school.dmStudents = true;
  const user = id => db.users.find(u => u.id === id);
  function canDM(a, b) {
    if (!a || !b || a.id === b.id) return false;
    if (a.role === 'student' && b.role === 'student') return a.classId === b.classId && db.school.dmStudents !== false;
    if (a.role === 'student') return isStaff(b);
    if (b.role === 'student') return true;
    return true;
  }
  const conv = (x, y) => db.dms.filter(m => (m.from === x && m.to === y) || (m.from === y && m.to === x));

  app.get('/api/dm/contacts', auth, (q, r) => {
    const me = q.user;
    const list = db.users.filter(u => canDM(me, u)).map(u => {
      const cv = conv(me.id, u.id), last = cv[cv.length - 1];
      return { id: u.id, name: u.name, role: u.role, classId: u.classId || null, unread: cv.filter(m => m.to === me.id && !m.read).length, last: last ? last.at : 0, preview: last ? last.text.slice(0, 40) : '' };
    }).sort((a, b) => b.last - a.last || a.name.localeCompare(b.name, 'ar'));
    r.json({ contacts: list, studentToStudent: db.school.dmStudents !== false });
  });
  app.get('/api/dm/unread', auth, (q, r) => r.json({ n: db.dms.filter(m => m.to === q.user.id && !m.read).length }));

  app.get('/api/dm/thread/:id', auth, (q, r) => {
    const o = user(q.params.id);
    if (!canDM(q.user, o)) return E(r, 403, 'ليست لديك صلاحية');
    const cv = conv(q.user.id, o.id); let ch = false;
    cv.forEach(m => { if (m.to === q.user.id && !m.read) { m.read = true; ch = true; } });
    if (ch) save();
    r.json(cv.slice(-200).map(m => ({ id: m.id, from: m.from, text: m.text, at: m.at })));
  });
  const rate = {};
  app.post('/api/dm/thread/:id', auth, (q, r) => {
    const o = user(q.params.id);
    if (!canDM(q.user, o)) return E(r, 403, 'ليست لديك صلاحية');
    const text = String(q.body.text || '').trim().slice(0, 500);
    if (!text) return E(r, 400, 'الرسالة فارغة');
    const now = Date.now(), arr = (rate[q.user.id] = (rate[q.user.id] || []).filter(t => now - t < 60000));
    if (arr.length >= 30) return E(r, 429, 'رسائل كثيرة، انتظر قليلاً');
    arr.push(now);
    db.dms.push({ id: uid(), from: q.user.id, to: o.id, text, at: now, read: false });
    if (db.dms.length > 20000) db.dms = db.dms.slice(-15000);
    if (!db.notifications.some(n => n.userId === o.id && n.type === 'dm' && n.fromId === q.user.id && !n.read))
      db.notifications.push({ id: uid(), userId: o.id, text: 'رسالة خاصة جديدة من ' + q.user.name, type: 'dm', groupId: null, fromId: q.user.id, at: now, read: false });
    save(); r.json({ ok: 1 });
  });

  app.post('/api/dm/report', auth, (q, r) => {
    const m = db.dms.find(x => x.id === q.body.msgId);
    if (!m || (m.to !== q.user.id && m.from !== q.user.id)) return E(r, 404, 'غير موجودة');
    if (m.from === q.user.id) return E(r, 400, 'لا يمكنك الإبلاغ عن رسالتك');
    if (db.reports.some(x => x.msgId === m.id && x.by === q.user.id)) return E(r, 400, 'سبق أن أبلغت عنها');
    const ctx = conv(m.from, m.to).filter(x => x.at <= m.at).slice(-6).map(x => ({ from: x.from, text: x.text, at: x.at }));
    db.reports.push({ id: uid(), msgId: m.id, by: q.user.id, sender: m.from, text: m.text, context: ctx, at: Date.now(), status: 'open' });
    notify(db.users.filter(isStaff).map(u => u.id), 'بلاغ جديد عن رسالة خاصة', 'report');
    save(); r.json({ ok: 1 });
  });
  const nm = id => (user(id) || { name: '—' }).name;
  app.get('/api/dm/reports', auth, need('admin', 'teacher'), (q, r) => {
    r.json(db.reports.filter(x => x.status === 'open').slice(-50).reverse().map(x => ({ id: x.id, senderName: nm(x.sender), byName: nm(x.by), at: x.at, context: x.context.map(k => ({ fromName: nm(k.from), text: k.text })) })));
  });
  app.post('/api/dm/reports/:id/resolve', auth, need('admin', 'teacher'), (q, r) => {
    const x = db.reports.find(y => y.id === q.params.id); if (!x) return E(r, 404, 'غير موجود');
    x.status = 'resolved'; save(); r.json({ ok: 1 });
  });
  app.post('/api/dm/settings', auth, need('admin'), (q, r) => { db.school.dmStudents = !!q.body.studentToStudent; save(); r.json({ ok: 1 }); });
};
