module.exports = function (c) {
  const { app, db, save, uid, clean, notify, ranks, grp, E, auth, need, isStaff, dropGroup, crypto, fs, path } = c;
  db.questions = db.questions || []; db.challenges = db.challenges || [];

  function usePoints(g, amount, note, by) {
    const before = ranks();
    db.points.push({ id: uid(), groupId: g.id, amount, note: clean(note, 100), by: by.id, byName: by.name, at: Date.now() });
    notify(g.memberIds, (amount > 0 ? 'تمت إضافة ' : 'تم خصم ') + Math.abs(amount) + ' نقطة ' + (amount > 0 ? 'إلى' : 'من') + ' مجموعتكم "' + g.name + '"', 'points', g.id);
    const after = ranks();
    db.groups.filter(x => before[x.id] !== after[x.id]).forEach(x => notify(x.memberIds, 'ترتيب مجموعة "' + x.name + '" أصبح ' + after[x.id], 'rank', x.id));
  }
  const chEnd = x => x.startedAt + x.seconds * 1000;
  function chRefresh(x) { if (x.status === 'running' && Date.now() > chEnd(x)) { x.status = 'timeout'; save(); } }
  function chView(x, st) {
    const g = db.groups.find(y => y.memberIds.includes(x.studentId));
    return { id: x.id, classId: x.classId, studentId: x.studentId, studentName: x.studentName, question: x.question, answer: st ? x.answer : undefined, seconds: x.seconds, endsAt: chEnd(x), status: x.status, points: x.points, groupName: g ? g.name : null };
  }
  function removeStudent(u) {
    db.users = db.users.filter(x => x.id !== u.id);
    db.groups.slice().forEach(g => {
      if (!g.memberIds.includes(u.id)) return;
      g.memberIds = g.memberIds.filter(x => x !== u.id);
      if (!g.memberIds.length) dropGroup(g); else if (g.leaderId === u.id) g.leaderId = g.memberIds[0];
    });
    Object.keys(db.sessions).forEach(k => { if (db.sessions[k].uid === u.id) delete db.sessions[k]; });
  }

  // ---- الطلاب (المعلم) ----
  app.post('/api/students', auth, need('admin', 'teacher'), (q, r) => {
    const name = clean(q.body.name, 40), classId = q.body.classId;
    if (name.length < 2) return E(r, 400, 'اكتب اسم الطالب');
    if (!db.classes.some(x => x.id === classId)) return E(r, 400, 'اختر الفصل');
    if (db.users.some(u => u.role === 'student' && u.classId === classId && u.name === name)) return E(r, 400, 'الطالب موجود');
    db.users.push({ id: uid(), name, role: 'student', nationality: '', classId }); save(); r.json({ ok: 1 });
  });
  app.delete('/api/students/:id', auth, need('admin', 'teacher'), (q, r) => {
    const u = db.users.find(x => x.id === q.params.id && x.role === 'student'); if (!u) return E(r, 404, 'غير موجود');
    removeStudent(u); save(); r.json({ ok: 1 });
  });

  // ---- بنك الأسئلة ----
  app.get('/api/questions', auth, need('admin', 'teacher'), (q, r) => r.json(db.questions));
  app.post('/api/questions', auth, need('admin', 'teacher'), (q, r) => {
    const text = clean(q.body.text, 300); if (text.length < 3) return E(r, 400, 'اكتب السؤال');
    db.questions.push({ id: uid(), text, answer: clean(q.body.answer, 200) }); save(); r.json({ ok: 1 });
  });
  app.post('/api/questions/bulk', auth, need('admin', 'teacher'), (q, r) => {
    const items = Array.isArray(q.body.items) ? q.body.items.slice(0, 20) : []; let n = 0;
    items.forEach(x => { const text = clean(x && x.text, 300); if (text.length >= 3) { db.questions.push({ id: uid(), text, answer: clean(x.answer, 200) }); n++; } });
    save(); r.json({ ok: 1, added: n });
  });
  app.delete('/api/questions/:id', auth, need('admin', 'teacher'), (q, r) => { db.questions = db.questions.filter(x => x.id !== q.params.id); save(); r.json({ ok: 1 }); });

  // ---- السحب العشوائي ----
  app.post('/api/challenges', auth, need('admin', 'teacher'), (q, r) => {
    const classId = q.body.classId;
    if (!db.classes.some(x => x.id === classId)) return E(r, 400, 'اختر الفصل');
    const seconds = Math.max(10, Math.min(300, parseInt(q.body.seconds, 10) || 30));
    const points = Math.max(0, Math.min(100, parseInt(q.body.points, 10) || 0));
    const past = db.challenges.filter(x => x.classId === classId);
    let qu = q.body.questionId && q.body.questionId !== 'rand' ? db.questions.find(x => x.id === q.body.questionId) : null;
    if (!qu) {
      if (!db.questions.length) return E(r, 400, 'أضف أسئلة لبنك الأسئلة أولاً');
      const last = past.length ? past[past.length - 1].questionId : null;
      let pool = db.questions.filter(x => x.id !== last); if (!pool.length) pool = db.questions;
      qu = pool[crypto.randomInt(pool.length)];
    }
    const students = db.users.filter(u => u.role === 'student' && u.classId === classId);
    const pick = String(q.body.pick || 'rand'); let pool;
    if (pick.startsWith('s:')) pool = students.filter(u => u.id === pick.slice(2));
    else if (pick.startsWith('g:')) { const g = grp(pick.slice(2)); pool = g && g.classId === classId ? students.filter(u => g.memberIds.includes(u.id)) : []; }
    else pool = students;
    if (!pool.length) return E(r, 400, 'لا يوجد طلاب متاحون');
    const recent = past.slice(-Math.floor(pool.length / 2)).map(x => x.studentId);
    let cand = pick.startsWith('s:') ? pool : pool.filter(u => !recent.includes(u.id)); if (!cand.length) cand = pool;
    const stu = cand[crypto.randomInt(cand.length)];
    past.forEach(x => { if (x.status === 'running' || x.status === 'timeout') x.status = 'cancelled'; });
    db.challenges.push({ id: uid(), classId, studentId: stu.id, studentName: stu.name, questionId: qu.id, question: qu.text, answer: qu.answer, seconds, points, startedAt: Date.now(), status: 'running', by: q.user.id });
    if (db.challenges.length > 300) db.challenges = db.challenges.slice(-200);
    notify([stu.id], 'جاء دورك للإجابة على سؤال 🎯', 'quiz');
    save(); r.json({ ok: 1 });
  });
  app.post('/api/challenges/:id/mark', auth, need('admin', 'teacher'), (q, r) => {
    const x = db.challenges.find(y => y.id === q.params.id);
    if (!x || !['running', 'timeout'].includes(x.status)) return E(r, 400, 'انتهى هذا التحدي');
    const res = q.body.result;
    if (res === 'cancel') x.status = 'cancelled';
    else if (res === 'correct') {
      x.status = 'correct'; x.finishedAt = Date.now();
      const g = db.groups.find(y => y.memberIds.includes(x.studentId));
      if (g && x.points > 0) usePoints(g, x.points, 'إجابة صحيحة: ' + x.studentName, q.user);
      notify([x.studentId], 'إجابتك صحيحة 🎉' + (x.points ? ' +' + x.points : ''), 'quiz');
    } else if (res === 'wrong') {
      x.status = 'wrong'; x.finishedAt = Date.now();
      notify([x.studentId], 'إجابة خاطئة، حاول في المرة القادمة 💪', 'quiz');
    } else return E(r, 400, 'نتيجة غير صالحة');
    save(); r.json({ ok: 1 });
  });
  app.get('/api/challenge', auth, (q, r) => {
    const st = isStaff(q.user), classId = st ? String(q.query.classId || '') : q.user.classId;
    const x = db.challenges.filter(y => y.classId === classId).slice(-1)[0];
    let out = null;
    if (x) {
      chRefresh(x); const now = Date.now();
      const show = x.status === 'running' || (x.status === 'timeout' && (st || now - chEnd(x) < 25000)) || ((x.status === 'correct' || x.status === 'wrong') && now - x.finishedAt < 25000);
      if (show) out = chView(x, st);
    }
    r.json({ challenge: out, now: Date.now() });
  });
  app.get('/api/challenges/history', auth, need('admin', 'teacher'), (q, r) => {
    db.challenges.forEach(chRefresh);
    r.json(db.challenges.filter(x => x.classId === String(q.query.classId || '') && ['correct', 'wrong', 'timeout'].includes(x.status)).slice(-30).reverse().map(x => ({ studentName: x.studentName, question: x.question, status: x.status, at: x.startedAt })));
  });

  // ---- Gemini (للمعلم فقط) ----
  try {
    fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(l => {
      const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch (e) { }
  const lastAi = {};
  app.post('/api/ai/questions', auth, need('admin', 'teacher'), async (q, r) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return E(r, 400, 'مفتاح Gemini غير مضبوط في ملف .env');
    const subject = clean(q.body.subject, 60), lesson = clean(q.body.lesson, 200), level = clean(q.body.level, 20) || 'متوسط';
    const count = Math.max(1, Math.min(15, parseInt(q.body.count, 10) || 5));
    if (!subject || !lesson) return E(r, 400, 'اكتب المادة والدرس');
    if (Date.now() - (lastAi[q.user.id] || 0) < 5000) return E(r, 429, 'انتظر قليلاً ثم أعد المحاولة');
    lastAi[q.user.id] = Date.now();
    const prompt = 'أنت مساعد معلم في مدرسة ثانوية. اكتب ' + count + ' أسئلة شفهية قصيرة باللغة العربية لمادة "' + subject + '" عن الدرس: "' + lesson + '". المستوى: ' + level +
      '. كل سؤال يستطيع الطالب الإجابة عنه شفهياً خلال دقيقة، وله جواب نموذجي قصير وصحيح. أعد الناتج فقط كمصفوفة JSON بالشكل [{"q":"السؤال","a":"الجواب"}] بدون أي نص آخر.';
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    try {
      const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.7 } }),
        signal: AbortSignal.timeout(45000)
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) return E(r, 502, 'خطأ من Gemini: ' + String((j.error && j.error.message) || resp.status).slice(0, 150));
      const text = ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('bad');
      const items = arr.filter(x => x && typeof x.q === 'string' && x.q.trim()).slice(0, count).map(x => ({ text: clean(x.q, 300), answer: clean(typeof x.a === 'string' ? x.a : '', 200) }));
      if (!items.length) return E(r, 502, 'لم يرجع Gemini أسئلة، أعد المحاولة');
      r.json({ items });
    } catch (e) { E(r, 502, 'تعذّر التوليد، أعد المحاولة'); }
  });

  // ---- أدوات إضافية ----
  app.post('/api/notifications/clear', auth, (q, r) => { db.notifications = db.notifications.filter(n => n.userId !== q.user.id); save(); r.json({ ok: 1 }); });
  app.get('/api/backup', auth, need('admin'), (q, r) => {
    r.setHeader('Content-Disposition', 'attachment; filename=classpod-backup.json');
    r.json({ ...db, sessions: {} });
  });
};
