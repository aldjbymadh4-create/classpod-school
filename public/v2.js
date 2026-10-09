if (localStorage.dark !== '0') document.body.classList.add('dark');
let sub2 = null;
const V2 = { tasks: [], tasksSig: '', tasksFor: null, ann: [], annSig: '', rep: null, repSig: '', repFor: null, roster: [], rosterSig: '', rosterFor: null, filter: 'all' };
const SUBJ = ['الرياضيات', 'اللغة الإنجليزية', 'اللغة العربية', 'الفيزياء', 'الكيمياء', 'الأحياء', 'العلوم', 'الحاسب الآلي', 'التربية الإسلامية', 'الاجتماعيات'];
const SCOL = ['#7c5cff', '#17a673', '#1fb6ff', '#ff9f43', '#ef5da8', '#e5484d'];
const subjCol = s => SCOL[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % SCOL.length];
const STL = { pending: ['قيد التنفيذ', 'st-p'], late: ['متأخر', 'st-l'], submitted: ['قيد المراجعة', 'st-s'], done: ['مكتمل', 'st-d'] };
const fmtD = t => new Date(t).toLocaleString('ar', { weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const ring = p => `<div class="ring" style="--p:${p}"><span>${p}%</span></div>`;
const pill = s => `<span class="stp ${STL[s][1]}">${STL[s][0]}</span>`;
const v2Cid = () => isStaff() ? curClass : S.me.classId;
const tasksNow = () => V2.tasksFor === v2Cid() ? V2.tasks : [];
const repNow = () => V2.repFor === v2Cid() ? V2.rep : null;
function v2Go(x) { sub2 = x; view = null; creating = false; quiz = false; render(); }
const v2Chips = cur => `<div class="chips"><button class="chip ${cur === 'groups' ? 'on' : ''}" onclick="go('groups')">👥 المجموعات</button><button class="chip ${cur === 'rank' ? 'on' : ''}" onclick="go('rank')">🏆 الترتيب</button></div>`;

function go(t) { tab = t; view = null; creating = false; quiz = false; sub2 = null; if (t === 'notif') loadNotifs(); render(); }
function back() { view = null; creating = false; quiz = false; sub2 = null; render(); }
function shell(inner, title) {
  const nav = [['home', '🏠', 'الرئيسية'], ['tasks', '📝', 'الواجبات'], ['reports', '📊', 'التقارير'], ['groups', '👥', 'المجموعات'], ['more', '☰', 'المزيد']];
  const sub = view || creating || quiz || sub2, m = S.me;
  return `<header>${sub ? '<button class="ic" onclick="back()">→</button>' : `<button class="chipuser" onclick="go('more')"><div class="av sm">${init(m.name)}</div><span>${esc(m.name.split(' ')[0])}</span></button>`}
  <div class="brand"><img src="logo.png" onerror="this.style.display='none'"><b>${esc(title)}</b></div>
  <button class="ic" onclick="go('notif')">🔔${S.unread ? `<i class="dot">${S.unread}</i>` : ''}</button></header><main>${inner}</main>
  <nav>${nav.map(t => `<button class="${tab === t[0] && !view && !creating && !quiz ? 'on' : ''}" onclick="go('${t[0]}')"><span>${t[1]}</span>${t[2]}</button>`).join('')}</nav>`;
}
function render() {
  if (!S) return loginView();
  let h, t = 'ClassPod';
  if (sub2) { const r = v2Sub(); h = r.h; t = r.t; }
  else if (quiz) { h = qzHtml(); t = 'أدوات المعلم'; }
  else if (creating) { h = createView(); t = 'مجموعة جديدة'; }
  else if (view) { const r = groupView(); h = r.h; t = r.t; }
  else if (tab === 'home') h = homeView();
  else if (tab === 'tasks') { h = v2Tasks(); t = 'الواجبات'; }
  else if (tab === 'reports') { h = v2Reports(); t = 'التقارير'; }
  else if (tab === 'groups') { h = v2Chips('groups') + groupsView(); t = 'المجموعات'; }
  else if (tab === 'rank') { h = v2Chips('rank') + rankView(); t = 'الترتيب'; }
  else if (tab === 'notif') { h = notifView(); t = 'الإشعارات'; }
  else { h = moreView(); t = 'المزيد'; }
  $('#app').innerHTML = shell(h, t);
  if (quiz) loadQuizData();
  if (view && view.sub === 'chat') loadMsgs(); if (view && view.sub === 'points') loadPoints();
  v2Load();
}
function v2Sub() {
  if (sub2 === 'ann') return { h: v2Ann(), t: 'الإعلانات' };
  if (sub2 === 'newtask') return { h: v2NewTask(), t: 'واجب جديد' };
  if (sub2 && sub2.startsWith('task:')) return v2TaskDetail(sub2.slice(5));
  sub2 = null; return { h: homeView(), t: 'ClassPod' };
}

async function v2Get(key, url) {
  try { const d = await api(url), sig = JSON.stringify(d); if (sig === V2[key + 'Sig']) return false; V2[key + 'Sig'] = sig; V2[key] = d; return true; } catch (e) { return false; }
}
async function v2Load() {
  if (!S) return;
  const cid = v2Cid(); let ch = false;
  const wantTasks = tab === 'home' || tab === 'tasks' || (sub2 && sub2.startsWith('task:'));
  if (wantTasks && !quiz && !view) {
    if (await v2Get('tasks', '/api/assignments?classId=' + (cid || ''))) ch = true;
    if (V2.tasksFor !== cid) { V2.tasksFor = cid; ch = true; }
  }
  if ((tab === 'home' && !view && !quiz) || sub2 === 'ann') { if (await v2Get('ann', '/api/announcements')) ch = true; }
  if (tab === 'reports' && !sub2 && !view) {
    if (await v2Get('rep', '/api/reports?classId=' + (cid || ''))) ch = true;
    if (V2.repFor !== cid) { V2.repFor = cid; ch = true; }
  }
  if (sub2 && sub2.startsWith('task:') && isStaff()) {
    const id = sub2.slice(5);
    if (await v2Get('roster', '/api/assignments/' + id + '/students')) ch = true;
    if (V2.rosterFor !== id) { V2.rosterFor = id; ch = true; }
  }
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (ch && !typing) render();
}
setInterval(() => { if (S) v2Load(); }, 6000);

function v2Banner() {
  const m = S.me, first = esc(m.name.split(' ')[0]);
  const t = m.role === 'student' ? ['أهلاً وسهلاً بك يا ' + first, 'مستقبلك يبدأ بخطوة.. استمر في التميز ⭐', '🎒']
    : m.role === 'teacher' ? ['أهلاً أستاذ ' + first, 'معاً نصنع جيلاً مبدعاً 👑', '📚'] : ['مرحباً ' + first, 'إدارة شاملة .. لبيئة تعليمية أفضل 🛡️', '🖥️'];
  return `<div class="banner"><small>${ROLE[m.role]} · ${esc(S.school.name)}</small><h3>${t[0]}</h3><div>${t[1]}</div><span class="deco">${t[2]}</span></div>`;
}
function homeView() {
  const m = S.me, st = isStaff(), g = myGroup(), tasks = tasksNow(), ann = V2.ann.slice(0, 2);
  const tiles = [['t1', '📝', 'الواجبات', "go('tasks')"], ['t2', '📊', st ? 'التقارير' : 'تقاريري', "go('reports')"],
    ['t3', '👥', st ? 'المجموعات' : 'مجموعتي', !st && g ? `open_('${g.id}')` : "go('groups')"], ['t4', '📣', 'الإعلانات', "v2Go('ann')"]];
  let h = v2Banner() + `<div class="tiles">${tiles.map(t => `<button class="tile ${t[0]}" onclick="${t[3]}"><i>${t[1]}</i>${t[2]}</button>`).join('')}</div>`;
  const annHtml = ann.length ? `<div class="sech"><h2>📣 آخر الإعلانات</h2><a onclick="v2Go('ann')">عرض الكل</a></div>` + ann.map(a => `<div class="card"><div class="mut">${esc(a.byName)} · ${fmtD(a.at)}</div><p style="margin:6px 0 0;white-space:pre-wrap">${esc(a.text)}</p></div>`).join('') : '';
  if (st) {
    const l = inClass(), stu = S.users.filter(u => u.role === 'student' && u.classId === curClass).length, late = tasks.reduce((t, a) => t + (a.late || 0), 0);
    h += classSel() + `<div class="stats"><div class="stat"><b>${stu}</b>الطلاب</div><div class="stat"><b>${l.length}</b>المجموعات</div><div class="stat"><b>${tasks.length}</b>الواجبات</div><div class="stat"><b>${late}</b>المتأخرة</div></div><br>
    <div class="acts"><button class="btn sm" onclick="creating=true;render()">➕ مجموعة</button><button class="btn sm" onclick="v2Go('newtask')">📝 واجب</button><button class="btn sm" onclick="quiz=true;render()">🎲 الأدوات</button><button class="btn sm" onclick="dmOpen();dmReports()">🚩 البلاغات</button></div>` + annHtml;
    h += `<div class="sech"><h2>👥 مجموعات الفصل</h2><a onclick="go('groups')">عرض الكل</a></div>` + (l.slice(0, 3).map(groupCard).join('') || '<p class="mut">لا توجد مجموعات في هذا الفصل بعد.</p>');
    const up = tasks.filter(a => a.dueAt > Date.now()).slice(0, 3);
    if (up.length) h += `<div class="sech"><h2>📝 واجبات قريبة</h2><a onclick="go('tasks')">عرض الكل</a></div>` + up.map(a => taskCard(a, true)).join('');
  } else {
    const left = tasks.filter(a => a.status === 'pending' || a.status === 'late').slice(0, 3);
    h += `<div class="sech"><h2>📝 مهامي القريبة</h2><a onclick="go('tasks')">عرض الكل</a></div>` + (left.map(a => taskCard(a, false)).join('') || '<div class="card mut">لا توجد واجبات متبقية 🎉</div>');
    h += g ? `<div class="sech"><h2>👥 مجموعتي</h2></div>${groupCard(g)}<div class="card row"><div class="sp"><span class="mut">ترتيب مجموعتك</span><div class="big">${g.rank}</div></div><div><span class="mut">النقاط</span><div class="big">${g.points}</div></div></div>`
      : `<div class="card"><h3>بانتظار مجموعتك ✨</h3><p class="mut">المعلم هو الذي يكوّن المجموعات. أول ما يضمّك لمجموعة تظهر هنا وتصلك رسالة.</p></div>`;
    h += annHtml;
  }
  return h;
}

function taskCard(a, st) {
  const c = subjCol(a.subject);
  return `<div class="card row task" onclick="v2Go('task:${a.id}')"><div class="tic" style="background:${c}22;color:${c}">📄</div><div class="sp"><span class="subj" style="background:${c}22;color:${c}">${esc(a.subject)}</span><h3>${esc(a.title)}</h3><div class="mut">⏰ ${fmtD(a.dueAt)}</div></div>
  ${st ? `<div class="mut" style="text-align:left;line-height:1.7">✅ ${a.done}<br>📥 ${a.submitted}<br>⚠️ ${a.late}</div>` : pill(a.status)}</div>`;
}
function v2Tasks() {
  const st = isStaff(), all = tasksNow();
  let h = `<div class="banner"><small>${st ? 'إدارة الواجبات' : 'واجباتي'}</small><h3>${st ? 'متابعة التسليم' : 'كل مجهود صغير اليوم .. يصنع فرقاً كبيراً'}</h3><span class="deco">📝</span></div>`;
  if (st) {
    const sum = k => all.reduce((t, a) => t + (a[k] || 0), 0);
    h += classSel() + `<div class="stats"><div class="stat"><b>${all.length}</b>الواجبات</div><div class="stat"><b>${sum('done')}</b>المعتمدة</div><div class="stat"><b>${sum('submitted')}</b>للمراجعة</div><div class="stat"><b>${sum('late')}</b>المتأخرة</div></div><br>
    <button class="btn" onclick="v2Go('newtask')">➕ إضافة واجب جديد</button><br><br>` + (all.slice().reverse().map(a => taskCard(a, true)).join('') || '<p class="mut">لا توجد واجبات في هذا الفصل بعد.</p>');
  } else {
    const f = V2.filter, fl = [['all', 'الكل'], ['left', 'المتبقية'], ['done', 'المكتملة']];
    const list = all.filter(a => f === 'all' || (f === 'left' ? a.status === 'pending' || a.status === 'late' : a.status === 'submitted' || a.status === 'done'));
    h += `<div class="chips">${fl.map(x => `<button class="chip ${f === x[0] ? 'on' : ''}" onclick="V2.filter='${x[0]}';render()">${x[1]}</button>`).join('')}</div>` + (list.map(a => taskCard(a, false)).join('') || '<p class="mut">لا توجد واجبات هنا.</p>');
  }
  return h;
}
function v2TaskDetail(id) {
  const a = tasksNow().find(x => x.id === id), st = isStaff();
  if (!a) return { h: '<p class="mut">جارٍ التحميل... أو تم حذف الواجب.</p>', t: 'الواجب' };
  const c = subjCol(a.subject);
  let h = `<div class="card"><span class="subj" style="background:${c}22;color:${c}">${esc(a.subject)}</span><h3>${esc(a.title)}</h3><div class="mut">⏰ ${fmtD(a.dueAt)}${st ? ' · ' + esc(clsLabel(a.classId)) : ''}</div>${a.desc ? `<p style="white-space:pre-wrap">${esc(a.desc)}</p>` : ''}</div>`;
  if (!st) {
    h += `<div class="card row"><span class="sp">حالتك</span>${pill(a.status)}</div>`;
    h += a.status === 'pending' || a.status === 'late' ? `<button class="btn ok" onclick="v2Submit('${a.id}')">✅ تم التسليم</button>` : a.status === 'submitted' ? `<button class="btn ghost" onclick="v2Unsubmit('${a.id}')">↩️ تراجع عن التسليم</button><p class="mut">بانتظار اعتماد المعلم.</p>` : '<p class="mut">تم اعتماد واجبك 🎉</p>';
  } else {
    const ro = V2.rosterFor === id ? V2.roster : [];
    h += `<h2>الطلاب (${ro.length})</h2>` + ro.map(s => `<div class="card row"><div class="sp"><b>${esc(s.name)}</b></div>${pill(s.status)}${s.status === 'done' ? `<button class="btn ghost sm" onclick="v2Review('${a.id}','${s.id}','reset')">إعادة</button>` : `<button class="btn ok sm" onclick="v2Review('${a.id}','${s.id}','done')">اعتماد</button>`}</div>`).join('');
    h += `<br><button class="btn bad" onclick="v2DelTask('${a.id}')">🗑️ حذف الواجب</button>`;
  }
  return { h, t: 'الواجب' };
}
function v2NewTask() {
  const d = new Date(Date.now() + 864e5); d.setMinutes(0, 0, 0);
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return `<div class="card"><label>الفصل</label><select id="tc">${S.classes.map(c => `<option value="${c.id}" ${c.id === curClass ? 'selected' : ''}>${esc(c.grade)} · ${esc(c.name)}</option>`).join('')}</select>
  <label>المادة</label><input id="ts" list="subjl" maxlength="40" placeholder="مثال: الرياضيات"><datalist id="subjl">${SUBJ.map(s => `<option value="${s}">`).join('')}</datalist>
  <label>عنوان الواجب</label><input id="tt" maxlength="100" placeholder="مثال: حل التمرين 45">
  <label>التفاصيل (اختياري)</label><textarea id="td" rows="3" maxlength="500"></textarea>
  <label>موعد التسليم</label><input id="tdue" type="datetime-local" value="${iso}">
  <button class="btn" onclick="v2PostTask()">نشر الواجب 📝</button></div>`;
}
const v2Reset = () => { V2.tasksSig = ''; V2.rosterSig = ''; V2.repSig = ''; };
const v2PostTask = () => act(async () => {
  await api('/api/assignments', 'POST', { classId: $('#tc').value, subject: $('#ts').value, title: $('#tt').value, desc: $('#td').value, dueAt: new Date($('#tdue').value).getTime() });
  sub2 = null; v2Reset(); toast('تم نشر الواجب ✅');
});
const v2Submit = id => act(async () => { await api('/api/assignments/' + id + '/submit', 'POST'); v2Reset(); toast('تم تسجيل التسليم ✅'); });
const v2Unsubmit = id => act(async () => { await api('/api/assignments/' + id + '/unsubmit', 'POST'); v2Reset(); });
const v2Review = (a, s, action) => act(async () => { await api('/api/assignments/' + a + '/review', 'POST', { studentId: s, action }); v2Reset(); });
const v2DelTask = id => confirm('حذف الواجب نهائياً؟') && act(async () => { await api('/api/assignments/' + id, 'DELETE'); sub2 = null; v2Reset(); });

function v2Ann() {
  const st = isStaff();
  let h = '';
  if (st) h += `<div class="card"><label>نص الإعلان</label><textarea id="at" rows="3" maxlength="500" placeholder="اكتب الإعلان..."></textarea><label>إلى</label><select id="ac"><option value="all">كل الفصول</option>${S.classes.map(c => `<option value="${c.id}" ${c.id === curClass ? 'selected' : ''}>${esc(c.grade)} · ${esc(c.name)}</option>`).join('')}</select><button class="btn" onclick="v2PostAnn()">إرسال الإعلان 📣</button></div>`;
  return h + (V2.ann.map(a => `<div class="card"><div class="mut">${esc(a.byName)} · ${fmtD(a.at)} · ${a.classId ? esc(clsLabel(a.classId)) : 'الجميع'}</div><p style="margin:6px 0;white-space:pre-wrap">${esc(a.text)}</p>${st ? `<button class="btn bad sm" onclick="v2DelAnn('${a.id}')">حذف</button>` : ''}</div>`).join('') || '<p class="mut">لا توجد إعلانات.</p>');
}
const v2PostAnn = () => act(async () => { await api('/api/announcements', 'POST', { text: $('#at').value, classId: $('#ac').value }); V2.annSig = ''; toast('تم إرسال الإعلان 📣'); });
const v2DelAnn = id => confirm('حذف الإعلان؟') && act(async () => { await api('/api/announcements/' + id, 'DELETE'); V2.annSig = ''; });

function v2Reports() {
  const R = repNow(), st = isStaff();
  if (!R) return '<p class="mut">جارٍ تحميل التقارير...</p>';
  let h = `<div class="banner"><small>${st ? 'تقارير شاملة' : 'تقاريري'}</small><h3>${st ? 'متابعة أداء الفصل' : 'نسبة إنجازك في الواجبات'}</h3><span class="deco">📊</span></div>`;
  if (R.type === 'student') {
    h += `<div class="card row">${ring(R.overall)}<div class="sp"><h3>الإنجاز العام</h3><div class="mut">${R.total} واجب · ${R.late} متأخر</div></div></div>`;
    h += `<div class="sech"><h2>📚 حسب المادة</h2></div>` + (R.subjects.map(s => `<div class="card row">${ring(s.pct)}<div class="sp"><span class="subj" style="background:${subjCol(s.subject)}22;color:${subjCol(s.subject)}">${esc(s.subject)}</span><div class="mut">${s.total} واجب · ${s.late} متأخر</div></div></div>`).join('') || '<p class="mut">لا توجد واجبات بعد.</p>');
    h += `<div class="sech"><h2>🎲 أسئلة السحب العشوائي</h2></div><div class="card row">${ring(R.challenges.pct)}<div class="sp"><h3>نسبة الإجابات الصحيحة</h3><div class="mut">${R.challenges.correct} صحيحة من ${R.challenges.total}</div></div></div>`;
    h += R.group ? `<div class="sech"><h2>👥 مجموعتي</h2></div><div class="card row" onclick="open_('${R.group.id}','points')"><div class="sp"><h3>${esc(R.group.name)}</h3><span class="mut">المركز ${R.group.rank}</span></div><div class="big">${R.group.points}</div></div>` : '';
    return h;
  }
  h += classSel() + `<div class="stats"><div class="stat"><b>${R.students}</b>الطلاب</div><div class="stat"><b>${R.groupsCount}</b>المجموعات</div><div class="stat"><b>${R.assignments}</b>الواجبات</div><div class="stat"><b>${R.pct}%</b>الإنجاز</div></div>`;
  if (R.platform) {
    const p = R.platform;
    h += `<div class="sech"><h2>🛡️ نظرة عامة على النظام</h2></div><div class="stats"><div class="stat"><b>${p.students}</b>الطلاب</div><div class="stat"><b>${p.teachers}</b>المعلمون</div><div class="stat"><b>${p.groups}</b>المجموعات</div><div class="stat"><b>${p.assignments}</b>الواجبات</div></div><br>
    <div class="acts"><button class="btn sm" onclick="dmOpen();dmReports()">🚩 البلاغات (${p.openReports})</button><button class="btn sm ghost" onclick="dmOpen();dmReports()">🔇 المكتومون (${p.muted})</button></div>
    <div class="sech"><h2>🏫 تقارير الفصول</h2></div>` + p.classes.map(c => `<div class="card row">${ring(c.pct)}<div class="sp"><h3>${esc(c.label)}</h3><div class="mut">${c.students} طالب · ${c.assignments} واجب · ${c.late} متأخر</div></div></div>`).join('');
  }
  h += `<div class="sech"><h2>📚 الإنجاز حسب المادة</h2></div>` + (R.subjects.map(s => `<div class="card row">${ring(s.pct)}<div class="sp"><span class="subj" style="background:${subjCol(s.subject)}22;color:${subjCol(s.subject)}">${esc(s.subject)}</span></div></div>`).join('') || '<p class="mut">لا توجد واجبات في هذا الفصل بعد.</p>');
  h += `<div class="sech"><h2>👥 تقارير المجموعات</h2></div>` + (R.groups.map(g => `<div class="card row" onclick="open_('${g.id}','points')">${ring(g.pct)}<div class="sp"><h3>${esc(g.name)}</h3><div class="mut">${g.members} أعضاء · ${g.points} نقطة</div></div></div>`).join('') || '<p class="mut">لا توجد مجموعات.</p>');
  h += `<div class="sech"><h2>🎓 تقرير الطلاب</h2></div>` + (R.rows.map(s => `<div class="card row"><div class="sp"><b>${esc(s.name)}</b><div class="mut">${s.late} متأخر · أسئلة: ${s.correct}/${s.challenges}</div></div>${ring(s.pct)}</div>`).join('') || '<p class="mut">لا يوجد طلاب مسجلون في هذا الفصل.</p>');
  return h;
}

async function dmReports() {
  DM.screen = 'reports';
  let l = [], ms = []; try { [l, ms] = await Promise.all([api('/api/mod/reports'), api('/api/mutes')]); } catch (e) { toast(e.message); }
  const sc = { all: 'كل المحادثات', dm: 'الخاصة', group: 'الجماعية' };
  $('#dmbox').innerHTML = `<div class="dmh"><button class="ic" onclick="dmBack()">→</button><b>البلاغات والكتم</b><span></span></div><div class="dmb">` +
    (l.map(r => `<div class="card"><b>${esc(r.senderName)}</b> <span class="mut">(أبلغ: ${esc(r.byName)})</span>${r.context.map(k => `<div class="mut">${esc(k.fromName)}: ${esc(k.text)}</div>`).join('')}<br>
    <div class="row" style="flex-wrap:wrap"><input id="mh_${r.id}" type="number" step="0.5" min="0.1" value="3" style="width:80px;margin:0"><span class="mut">ساعة</span>
    <select id="ms_${r.id}" style="width:auto;margin:0"><option value="all">كل المحادثات</option><option value="dm">الخاصة فقط</option><option value="group">الجماعية فقط</option></select></div><br>
    <div class="row"><button class="btn bad sm" onclick="dmMute('${r.id}','${r.senderId}')">🔇 كتم</button><button class="btn ok sm" onclick="dmResolve('${r.id}')">تمت المراجعة</button></div></div>`).join('') || '<p class="mut">لا توجد بلاغات.</p>') +
    `<h2>المكتومون حالياً</h2>` + (ms.map(m => `<div class="card row"><div class="sp"><b>${esc(m.name)}</b><div class="mut">${sc[m.scope]} · باقي ${esc(m.leftText)}</div></div><button class="btn ghost sm" onclick="dmUnmute('${m.userId}')">رفع الكتم</button></div>`).join('') || '<p class="mut">لا أحد مكتوم.</p>') + `</div>`;
}
const dmMute = (rid, uid_) => api('/api/mutes', 'POST', { userId: uid_, hours: $('#mh_' + rid).value, scope: $('#ms_' + rid).value, reportId: rid }).then(() => { toast('تم الكتم 🔇'); dmReports(); }).catch(e => toast(e.message));
const dmUnmute = id => api('/api/mutes/' + id, 'DELETE').then(() => { toast('تم رفع الكتم'); dmReports(); }).catch(e => toast(e.message));
if (S) render();
