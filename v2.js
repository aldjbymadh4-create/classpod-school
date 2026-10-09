module.exports = function (c) {
  const { app, db, save, uid, clean, notify, E, auth, need, isStaff } = c;
  db.assignments = db.assignments || []; db.submissions = db.submissions || []; db.announcements = db.announcements || [];
  db.mutes = db.mutes || []; db.reports = db.reports || []; db.challenges = db.challenges || [];
  const user = id => db.users.find(u => u.id === id);
  const nm = id => (user(id) || { name: '—' }).name;
  const roster = classId => db.users.filter(u => u.role === 'student' && u.classId === classId);
  const stOf = (a, sid) => { const s = db.submissions.find(x => x.assignmentId === a.id && x.studentId === sid); return s ? s.status : (Date.now() > a.dueAt ? 'late' : 'pending'); };
  const pct = (n, d) => d ? Math.round(n * 100 / d) : 0;
  const fmtLeft = ms => { const m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60), r = m % 60; return (h ? h + ' ساعة' : '') + (h && r ? ' و ' : '') + (r || !h ? r + ' دقيقة' : ''); };
  const muteLeft = (id, scope) => { const m = db.mutes.find(x => x.userId === id && x.until > Date.now() && (x.scope === 'all' || x.scope === scope)); return m ? m.until - Date.now() : 0; };

  const mw = (q, r, n) => {
    if (q.method !== 'POST') return n();
    const scope = /^\/api\/groups\/[^/]+\/messages$/.test(q.path) ? 'group' : /^\/api\/dm\/thread\/[^/]+$/.test(q.path) ? 'dm' : null;
    if (!scope) return n();
    const m = /(?:^|;\s*)sid=([^;]+)/.exec(q.headers.cookie || ''), s = m && db.sessions[decodeURIComponent(m[1])];
    if (!s) return n();
    const left = muteLeft(s.uid, scope);
    if (left) return E(r, 403, 'أنت مكتوم من ' + (scope === 'dm' ? 'الدردشة الخاصة' : 'الدردشة الجماعية') + ' لمدة ' + fmtLeft(left));
    n();
  };
  app.use(mw);
  try { const st = app._router.stack, l = st.pop(); st.splice(2, 0, l); console.log('الكتم مفعّل على الدردشات'); } catch (e) { console.log('تحذير: تعذّر تفعيل الكتم'); }

  app.get('/api/assignments', auth, (q, r) => {
    const u = q.user, st = isStaff(u), classId = st ? String(q.query.classId || '') : u.classId, ro = roster(classId);
    r.json(db.assignments.filter(a => a.classId === classId).sort((a, b) => a.dueAt - b.dueAt).map(a => {
      const base = { id: a.id, classId: a.classId, subject: a.subject, title: a.title, desc: a.desc, dueAt: a.dueAt };
      if (!st) return { ...base, status: stOf(a, u.id) };
      const s = ro.map(x => stOf(a, x.id)), n = k => s.filter(x => x === k).length;
      return { ...base, total: ro.length, pending: n('pending'), late: n('late'), submitted: n('submitted'), done: n('done') };
    }));
  });
  app.post('/api/assignments', auth, need('admin', 'teacher'), (q, r) => {
    const classId = q.body.classId, subject = clean(q.body.subject, 40), title = clean(q.body.title, 100), desc = clean(q.body.desc, 500), dueAt = Number(q.body.dueAt);
    if (!db.classes.some(x => x.id === classId)) return E(r, 400, 'اختر الفصل');
    if (!subject || !title) return E(r, 400, 'اكتب المادة وعنوان الواجب');
    if (!dueAt || dueAt < Date.now() - 3600e3) return E(r, 400, 'اختر موعد تسليم صحيحاً');
    const a = { id: uid(), classId, subject, title, desc, dueAt, createdBy: q.user.id, createdAt: Date.now() };
    db.assignments.push(a);
    notify(roster(classId).map(s => s.id), 'واجب جديد في ' + subject + ': ' + title, 'task');
    save(); r.json({ ok: 1, id: a.id });
  });
  app.delete('/api/assignments/:id', auth, need('admin', 'teacher'), (q, r) => {
    db.assignments = db.assignments.filter(a => a.id !== q.params.id);
    db.submissions = db.submissions.filter(s => s.assignmentId !== q.params.id);
    save(); r.json({ ok: 1 });
  });
  const aOf = (q, r) => { const a = db.assignments.find(x => x.id === q.params.id); if (!a) { E(r, 404, 'الواجب غير موجود'); return null; } return a; };
  app.post('/api/assignments/:id/submit', auth, need('student'), (q, r) => {
    const a = aOf(q, r); if (!a) return;
    if (a.classId !== q.user.classId) return E(r, 403, 'ليس واجب فصلك');
    if (!db.submissions.some(s => s.assignmentId === a.id && s.studentId === q.user.id)) db.submissions.push({ id: uid(), assignmentId: a.id, studentId: q.user.id, status: 'submitted', at: Date.now() });
    save(); r.json({ ok: 1 });
  });
  app.post('/api/assignments/:id/unsubmit', auth, need('student'), (q, r) => {
    const a = aOf(q, r); if (!a) return;
    const s = db.submissions.find(x => x.assignmentId === a.id && x.studentId === q.user.id);
    if (s && s.status === 'done') return E(r, 400, 'تم اعتماد الواجب ولا يمكن التراجع');
    db.submissions = db.submissions.filter(x => x !== s); save(); r.json({ ok: 1 });
  });
  app.get('/api/assignments/:id/students', auth, need('admin', 'teacher'), (q, r) => {
    const a = aOf(q, r); if (!a) return;
    r.json(roster(a.classId).map(s => ({ id: s.id, name: s.name, status: stOf(a, s.id) })));
  });
  app.post('/api/assignments/:id/review', auth, need('admin', 'teacher'), (q, r) => {
    const a = aOf(q, r); if (!a) return;
    const s = user(q.body.studentId); if (!s || s.role !== 'student' || s.classId !== a.classId) return E(r, 400, 'طالب غير صالح');
    const cur = db.submissions.find(x => x.assignmentId === a.id && x.studentId === s.id);
    if (q.body.action === 'done') {
      if (cur) { cur.status = 'done'; cur.reviewedAt = Date.now(); } else db.submissions.push({ id: uid(), assignmentId: a.id, studentId: s.id, status: 'done', at: Date.now(), reviewedAt: Date.now() });
      notify([s.id], 'تم اعتماد واجبك: ' + a.title + ' ✅', 'task');
    } else if (q.body.action === 'reset') db.submissions = db.submissions.filter(x => x !== cur);
    else return E(r, 400, 'إجراء غير صالح');
    save(); r.json({ ok: 1 });
  });

  app.get('/api/announcements', auth, (q, r) => {
    const u = q.user, st = isStaff(u);
    r.json(db.announcements.filter(a => st || !a.classId || a.classId === u.classId).slice(-30).reverse());
  });
  app.post('/api/announcements', auth, need('admin', 'teacher'), (q, r) => {
    const text = clean(q.body.text, 500); if (text.length < 2) return E(r, 400, 'اكتب نص الإعلان');
    const classId = q.body.classId && q.body.classId !== 'all' ? q.body.classId : null;
    if (classId && !db.classes.some(x => x.id === classId)) return E(r, 400, 'فصل غير صالح');
    db.announcements.push({ id: uid(), classId, text, byName: q.user.name, at: Date.now() });
    if (db.announcements.length > 300) db.announcements = db.announcements.slice(-200);
    notify(db.users.filter(u => u.role === 'student' && (!classId || u.classId === classId)).map(u => u.id), 'إعلان جديد: ' + text.slice(0, 60), 'ann');
    save(); r.json({ ok: 1 });
  });
  app.delete('/api/announcements/:id', auth, need('admin', 'teacher'), (q, r) => { db.announcements = db.announcements.filter(a => a.id !== q.params.id); save(); r.json({ ok: 1 }); });

  function classStats(classId) {
    const ro = roster(classId), as = db.assignments.filter(a => a.classId === classId);
    const rows = ro.map(s => {
      let d = 0, sb = 0, late = 0; as.forEach(a => { const x = stOf(a, s.id); if (x === 'done') d++; else if (x === 'submitted') sb++; else if (x === 'late') late++; });
      const ch = db.challenges.filter(x => x.studentId === s.id && (x.status === 'correct' || x.status === 'wrong'));
      return { id: s.id, name: s.name, pct: pct(d + sb, as.length), late, challenges: ch.length, correct: ch.filter(x => x.status === 'correct').length };
    });
    const subj = {};
    as.forEach(a => { const o = subj[a.subject] || (subj[a.subject] = { subject: a.subject, total: 0, ok: 0 }); ro.forEach(s => { o.total++; const x = stOf(a, s.id); if (x === 'done' || x === 'submitted') o.ok++; }); });
    const total = as.length * ro.length, ok = rows.reduce((t, x) => t + Math.round(x.pct * as.length / 100), 0);
    const pts = g => db.points.filter(p => p.groupId === g.id).reduce((t, p) => t + p.amount, 0);
    const groups = db.groups.filter(g => g.classId === classId).map(g => { const m = rows.filter(x => g.memberIds.includes(x.id)); return { id: g.id, name: g.name, members: g.memberIds.length, points: pts(g), pct: m.length ? Math.round(m.reduce((t, x) => t + x.pct, 0) / m.length) : 0 }; }).sort((a, b) => b.points - a.points);
    return { students: ro.length, assignments: as.length, groupsCount: groups.length, pct: pct(ok, total), late: rows.reduce((t, x) => t + x.late, 0), rows, groups, subjects: Object.values(subj).map(o => ({ subject: o.subject, pct: pct(o.ok, o.total) })) };
  }
  app.get('/api/reports', auth, (q, r) => {
    const u = q.user;
    if (!isStaff(u)) {
      const as = db.assignments.filter(a => a.classId === u.classId), subj = {};
      let ok = 0, late = 0;
      as.forEach(a => { const x = stOf(a, u.id), o = subj[a.subject] || (subj[a.subject] = { subject: a.subject, total: 0, ok: 0, late: 0 }); o.total++; if (x === 'done' || x === 'submitted') { o.ok++; ok++; } if (x === 'late') { o.late++; late++; } });
      const ch = db.challenges.filter(x => x.studentId === u.id && (x.status === 'correct' || x.status === 'wrong')), cc = ch.filter(x => x.status === 'correct').length;
      const g = db.groups.find(x => x.memberIds.includes(u.id));
      let grp = null;
      if (g) {
        const pts = x => db.points.filter(p => p.groupId === x.id).reduce((t, p) => t + p.amount, 0), mine = pts(g);
        grp = { id: g.id, name: g.name, points: mine, rank: 1 + db.groups.filter(x => x.classId === g.classId && pts(x) > mine).length };
      }
      return r.json({ type: 'student', overall: pct(ok, as.length), total: as.length, late, subjects: Object.values(subj).map(o => ({ subject: o.subject, total: o.total, late: o.late, pct: pct(o.ok, o.total) })), challenges: { total: ch.length, correct: cc, pct: pct(cc, ch.length) }, group: grp });
    }
    const out = { type: 'staff', ...classStats(String(q.query.classId || '')) };
    if (u.role === 'admin') {
      out.platform = {
        students: db.users.filter(x => x.role === 'student').length, teachers: db.users.filter(x => x.role === 'teacher').length, groups: db.groups.length, assignments: db.assignments.length,
        muted: db.mutes.filter(m => m.until > Date.now()).length, openReports: db.reports.filter(x => x.status === 'open').length,
        classes: db.classes.map(cl => { const s = classStats(cl.id); return { id: cl.id, label: cl.grade + ' · ' + cl.name, students: s.students, assignments: s.assignments, pct: s.pct, late: s.late }; })
      };
    }
    r.json(out);
  });

  app.get('/api/mod/reports', auth, need('admin', 'teacher'), (q, r) => {
    r.json(db.reports.filter(x => x.status === 'open').slice(-50).reverse().map(x => ({ id: x.id, senderId: x.sender, senderName: nm(x.sender), byName: nm(x.by), at: x.at, context: x.context.map(k => ({ fromName: nm(k.from), text: k.text })) })));
  });
  app.get('/api/mutes', auth, need('admin', 'teacher'), (q, r) => {
    r.json(db.mutes.filter(m => m.until > Date.now()).map(m => ({ userId: m.userId, name: nm(m.userId), scope: m.scope, leftText: fmtLeft(m.until - Date.now()) })));
  });
  app.post('/api/mutes', auth, need('admin', 'teacher'), (q, r) => {
    const t = user(q.body.userId); if (!t || t.role !== 'student') return E(r, 400, 'يمكن كتم الطلاب فقط');
    const hours = parseFloat(q.body.hours); if (!(hours >= 0.1 && hours <= 720)) return E(r, 400, 'اكتب عدد ساعات صحيحاً (مثال: 3 أو 2.5)');
    const scope = ['dm', 'group', 'all'].includes(q.body.scope) ? q.body.scope : 'all', until = Date.now() + Math.round(hours * 3600e3);
    db.mutes = db.mutes.filter(m => m.userId !== t.id && m.until > Date.now());
    db.mutes.push({ userId: t.id, scope, until, by: q.user.id, byName: q.user.name, at: Date.now() });
    const rep = q.body.reportId && db.reports.find(x => x.id === q.body.reportId); if (rep) rep.status = 'resolved';
    notify([t.id], 'تم كتمك من ' + ({ dm: 'الدردشة الخاصة', group: 'الدردشة الجماعية', all: 'كل المحادثات' })[scope] + ' لمدة ' + fmtLeft(until - Date.now()), 'mute');
    save(); r.json({ ok: 1 });
  });
  app.delete('/api/mutes/:userId', auth, need('admin', 'teacher'), (q, r) => { db.mutes = db.mutes.filter(m => m.userId !== q.params.userId); save(); r.json({ ok: 1 }); });
};
