const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let quiz = false, S = null, tab = 'home', view = null, creating = false, lastHash = '', notifs = [], adminData = null, shown = '', loginStep = 'welcome', pubClasses = [], curClass = null;
const ROLE = { admin: 'مسؤولة النظام', teacher: 'معلم', student: 'طالب' };
let authMode = 'login';
if (localStorage.dark === '1') document.body.classList.add('dark');

async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && S) { S = null; render(); }
  if (!r.ok) throw new Error(j.error || 'حدث خطأ');
  return j;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2500); }
const act = async fn => { try { await fn(); await load(true); } catch (e) { toast(e.message); } };
const nm = id => S.users.find(u => u.id === id)?.name || '—';
const G = id => S.groups.find(g => g.id === id);
const isStaff = () => S.me.role !== 'student';
const init = n => esc((n || '?').trim()[0]);
const myGroup = () => S.groups.find(g => g.memberIds.includes(S.me.id));
const clsLabel = id => { const c = S.classes.find(x => x.id === id); return c ? c.grade + ' · ' + c.name : '—'; };
const curC = () => isStaff() ? curClass : S.me.classId;
const inClass = () => S.groups.filter(g => g.classId === curC()).sort((a, b) => b.points - a.points);
const tm = t => new Date(t).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
const classSel = () => isStaff() ? `<select onchange="curClass=this.value;render()">${S.classes.map(c => `<option value="${c.id}" ${c.id === curClass ? 'selected' : ''}>${esc(c.grade)} · ${esc(c.name)}</option>`).join('')}</select>` : '';

async function load(force) {
  try {
    const n = await api('/api/state');
    const h = JSON.stringify(n);
    const changed = h !== lastHash; lastHash = h; S = n;
    if (isStaff() && !S.classes.some(c => c.id === curClass)) curClass = S.classes[0]?.id || null;
    const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (force || (changed && !typing)) render();
  } catch { if (!S) render(); }
}

function loginView() {
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
};

function go(t) { tab = t; view = null; creating = false; quiz = false; if (t === 'notif') loadNotifs(); render(); }
function open_(id, sub) { view = { id, sub: sub || 'chat' }; shown = ''; render(); }
function back() { view = null; creating = false; quiz = false; render(); }

function shell(inner, title) {
  const nav = [['home', '🏠', 'الرئيسية'], ['groups', '👥', 'المجموعات'], ['rank', '🏆', 'الترتيب'], ['notif', '🔔', 'الإشعارات'], ['more', '☰', 'المزيد']];
  return `<header><div class="brand">${view || creating || quiz ? '<button class="ic" onclick="back()">→</button>' : '<img src="logo.png" onerror="this.style.display=\'none\'">'}<b>${esc(title)}</b></div>
  <button class="ic" onclick="go('notif')">🔔${S.unread ? `<i class="dot">${S.unread}</i>` : ''}</button></header><main>${inner}</main>
  <nav>${nav.map(t => `<button class="${tab === t[0] && !view && !creating && !quiz ? 'on' : ''}" onclick="go('${t[0]}')"><span>${t[1]}</span>${t[2]}</button>`).join('')}</nav>`;
}
function render() {
  if (!S) return loginView();
  let h, t = 'ClassPod';
  if (quiz) { h = qzHtml(); t = 'أدوات المعلم'; }
  else if (creating) { h = createView(); t = 'مجموعة جديدة'; }
  else if (view) { const r = groupView(); h = r.h; t = r.t; }
  else if (tab === 'home') h = homeView();
  else if (tab === 'groups') { h = groupsView(); t = 'المجموعات'; }
  else if (tab === 'rank') { h = rankView(); t = 'الترتيب'; }
  else if (tab === 'notif') { h = notifView(); t = 'الإشعارات'; }
  else { h = moreView(); t = 'المزيد'; }
  $('#app').innerHTML = shell(h, t);
  if (quiz) loadQuizData();
  if (view && view.sub === 'chat') loadMsgs(); if (view && view.sub === 'points') loadPoints();
}

function groupCard(g) {
  return `<div class="card row" onclick="open_('${g.id}')"><div class="av">${init(g.name)}</div><div class="sp"><h3>${esc(g.name)}</h3>
  <span class="mut">${g.memberIds.length} أعضاء · العريف: ${esc(nm(g.leaderId))}</span></div><div style="text-align:left"><b>${g.points}</b><div class="mut">نقطة</div></div></div>`;
}
function homeView() {
  const m = S.me;
  let h = `<div class="card hero"><small>مرحباً</small><h3>${esc(m.name)}</h3><small>${ROLE[m.role]} · ${esc(S.school.name)}${m.classId ? ' · ' + esc(clsLabel(m.classId)) : ''}</small></div>`;
  if (isStaff()) {
    const l = inClass(), students = S.users.filter(u => u.role === 'student' && u.classId === curClass).length;
    h += classSel() + `<div class="card row"><div class="sp"><span class="mut">الطلاب المسجلون</span><div class="big">${students}</div></div><div class="sp"><span class="mut">المجموعات</span><div class="big">${l.length}</div></div></div>
    <button class="btn" onclick="creating=true;render()">➕ إنشاء مجموعة</button><br><br><button class="btn ghost" onclick="quiz=true;render()">🎲 أدوات المعلم: سحب عشوائي · أسئلة · طلاب</button><br><br>
    <h2>مجموعات الفصل</h2>` + (l.map(groupCard).join('') || '<p class="mut">لا توجد مجموعات في هذا الفصل بعد.</p>');
  } else {
    const g = myGroup();
    h += g ? `<h2>مجموعتي</h2>${groupCard(g)}<div class="card row"><div class="sp"><span class="mut">ترتيب مجموعتك في الفصل</span><div class="big">${g.rank}</div></div><div><span class="mut">النقاط</span><div class="big">${g.points}</div></div></div>`
      : `<div class="card"><h3>بانتظار مجموعتك ✨</h3><p class="mut">المعلم هو الذي يكوّن المجموعات. أول ما يضمّك لمجموعة تظهر هنا وتصلك رسالة.</p></div>`;
  }
  return h;
}
function createView() {
  const free = S.users.filter(u => u.role === 'student' && u.classId === curClass && !S.busy.includes(u.id));
  return `<div class="card"><p class="mut">الفصل: <b>${esc(clsLabel(curClass))}</b></p><label>اسم المجموعة</label><input id="gn" maxlength="40" placeholder="اكتب اسم المجموعة">
  <p class="mut">اختر من 2 إلى 5 طلاب، وحدّد العريف (القائد) بالدائرة:</p>
  ${free.map(u => `<label class="chk"><input type="checkbox" class="mc" value="${u.id}"><div class="av">${init(u.name)}</div><span class="sp">${esc(u.name)}</span><span class="mut">عريف</span><input type="radio" name="ld" value="${u.id}"></label>`).join('') || '<p class="mut">لا يوجد طلاب متاحون في هذا الفصل (يسجّلون بأنفسهم برمز الطلاب).</p>'}
  <button class="btn" onclick="sendCreate()">إنشاء المجموعة</button></div>`;
}
function sendCreate() {
  const ids = [...document.querySelectorAll('.mc:checked')].map(x => x.value);
  const ld = document.querySelector('input[name=ld]:checked')?.value;
  act(async () => { await api('/api/groups', 'POST', { name: $('#gn').value, classId: curClass, memberIds: ids, leaderId: ld }); creating = false; toast('تم إنشاء المجموعة'); });
}
function groupsView() { return classSel() + (inClass().map(groupCard).join('') || '<p class="mut">لا توجد مجموعات.</p>'); }
function rankView() {
  const l = inClass(), cls = ['m1', 'm2', 'm3'];
  return classSel() + `<div class="card hero"><h3>🏆 من الأفضل؟</h3><small>${esc(clsLabel(curC()))}</small></div>` +
    (l.map(g => `<div class="card row" onclick="open_('${g.id}','points')"><div class="medal ${cls[g.rank - 1] || ''}">${g.rank}</div><div class="sp"><h3>${esc(g.name)}</h3><span class="mut">${g.memberIds.length} أعضاء</span></div><b>${g.points}</b></div>`).join('') || '<p class="mut">لا يوجد ترتيب بعد.</p>');
}
function groupView() {
  const g = G(view.id); if (!g) { view = null; return { h: homeView(), t: 'ClassPod' }; }
  const tabs = [['chat', 'الدردشة'], ['points', 'النقاط'], ['members', 'الأعضاء']];
  let h = `<div class="card hero"><h3>${esc(g.name)}</h3><small>المركز ${g.rank} · ${g.points} نقطة · العريف: ${esc(nm(g.leaderId))}</small></div>
  <div class="tabs">${tabs.map(t => `<button class="${view.sub === t[0] ? 'on' : ''}" onclick="view.sub='${t[0]}';shown='';render()">${t[1]}</button>`).join('')}</div>`;
  if (view.sub === 'chat') h += `<div class="msgs" id="msgs"></div><div class="send"><input id="mt" maxlength="500" placeholder="اكتب رسالة..." onkeydown="if(event.key==='Enter')sendMsg()"><button onclick="sendMsg()">➤</button></div>`;
  else if (view.sub === 'points') h += `${isStaff() ? `<div class="card"><label>عدد النقاط (سالب للخصم)</label><input id="pa" type="number" value="10"><label>ملاحظة (اختياري)</label><input id="pn" maxlength="100"><button class="btn" onclick="addPts('${g.id}')">إضافة النقاط</button></div>` : ''}<div id="pl"></div>`;
  else h += membersHtml(g);
  return { h, t: g.name };
}
function membersHtml(g) {
  const st = isStaff();
  let h = g.memberIds.map(id => `<div class="card row"><div class="av">${init(nm(id))}</div><div class="sp"><h3>${esc(nm(id))}</h3><span class="mut">${id === g.leaderId ? '👑 العريف' : 'عضو'}</span></div>${st && g.memberIds.length > 1 ? `<button class="btn bad sm" onclick="rmMember('${g.id}','${id}')">إزالة</button>` : ''}</div>`).join('');
  if (st) {
    const free = S.users.filter(u => u.role === 'student' && u.classId === g.classId && !S.busy.includes(u.id));
    h += `<div class="card"><h3>إدارة المجموعة</h3><button class="btn ghost" onclick="rename('${g.id}')">تغيير الاسم</button><br><br>
    <label>العريف</label><select onchange="setLeader('${g.id}',this.value)">${g.memberIds.map(id => `<option value="${id}" ${id === g.leaderId ? 'selected' : ''}>${esc(nm(id))}</option>`).join('')}</select>
    ${free.length ? `<label>إضافة طالب</label><select id="addm"><option value="">اختر...</option>${free.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select><button class="btn ghost" onclick="addMember('${g.id}')">إضافة</button><br><br>` : ''}
    <button class="btn bad" onclick="delGroup('${g.id}')">حذف المجموعة</button></div>`;
  }
  return h;
}

const rename = id => { const n = prompt('الاسم الجديد', G(id).name); if (n) act(() => api(`/api/groups/${id}`, 'PATCH', { name: n })); };
const setLeader = (id, v) => act(() => api(`/api/groups/${id}`, 'PATCH', { leaderId: v }));
const addMember = id => { const v = $('#addm').value; if (v) act(() => api(`/api/groups/${id}/members`, 'POST', { userId: v })); };
const rmMember = (id, u) => confirm('إزالة الطالب من المجموعة؟') && act(() => api(`/api/groups/${id}/members/${u}`, 'DELETE'));
const delGroup = id => confirm('حذف المجموعة مع رسائلها ونقاطها؟') && act(async () => { await api(`/api/groups/${id}`, 'DELETE'); view = null; });
const addPts = id => act(() => api(`/api/groups/${id}/points`, 'POST', { amount: $('#pa').value, note: $('#pn').value }).then(() => toast('تمت الإضافة')));

async function loadMsgs() {
  if (!view || view.sub !== 'chat') return; const el = $('#msgs'); if (!el) return;
  try {
    const l = await api(`/api/groups/${view.id}/messages`);
    const key = l.length + ':' + (l.at(-1)?.id || ''); if (key === shown) return; shown = key;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80 || !el.children.length;
    el.innerHTML = l.map(m => `<div class="b ${m.userId === S.me.id ? 'me' : ''}"><small>${esc(nm(m.userId))} · ${tm(m.at)}</small><p>${esc(m.text)}</p></div>`).join('') || '<p class="mut">ابدأوا المحادثة 👋</p>';
    if (near) el.scrollTop = el.scrollHeight;
  } catch (e) { }
}
async function sendMsg() {
  const i = $('#mt'), t = i.value.trim(); if (!t) return; i.value = '';
  try { await api(`/api/groups/${view.id}/messages`, 'POST', { text: t }); shown = ''; loadMsgs(); } catch (e) { toast(e.message); }
}
async function loadPoints() {
  const el = $('#pl'); if (!el) return;
  try {
    const l = await api(`/api/groups/${view.id}/points`);
    el.innerHTML = l.map(p => `<div class="card row"><b style="color:${p.amount > 0 ? 'var(--ok)' : 'var(--bad)'}">${p.amount > 0 ? '+' : ''}${p.amount}</b><div class="sp">${esc(p.note || '—')}<div class="mut">${esc(p.byName)} · ${new Date(p.at).toLocaleString('ar')}</div></div></div>`).join('') || '<p class="mut">لا توجد نقاط بعد.</p>';
  } catch (e) { }
}
async function loadNotifs() {
  try { notifs = await api('/api/notifications'); await api('/api/notifications/read', 'POST'); S.unread = 0; if (tab === 'notif' && !view) render(); } catch (e) { }
}
function notifView() {
  return notifs.map(n => `<div class="card ${n.read ? '' : 'unread'}" ${n.groupId && G(n.groupId) ? `onclick="open_('${n.groupId}','${n.type === 'msg' ? 'chat' : 'points'}')"` : ''}>${esc(n.text)}<div class="mut">${new Date(n.at).toLocaleString('ar')}</div></div>`).join('') || '<p class="mut">لا توجد إشعارات.</p>';
}

const newCode = w => confirm('إنشاء رمز جديد؟ الرمز القديم يتوقف عن العمل.') && act(() => api('/api/codes/' + w, 'POST'));
function toggleDark() { document.body.classList.toggle('dark'); localStorage.dark = document.body.classList.contains('dark') ? '1' : '0'; }
async function loadAdmin() {
  try { adminData = await api('/api/users'); } catch (e) { return toast(e.message); }
  $('#adm').innerHTML = `<div class="card"><h3>الفصول</h3>${S.classes.map(c => `<div class="row" style="margin-bottom:6px"><span class="sp">${esc(c.grade)} · ${esc(c.name)}</span><button class="btn bad sm" onclick="delClass('${c.id}')">حذف</button></div>`).join('')}
    <label>الصف</label><select id="cg"><option>أول ثانوي</option><option>ثاني ثانوي</option><option>ثالث ثانوي</option></select>
    <label>اسم الفصل</label><input id="cn" placeholder="مثال: فصل 3"><button class="btn" onclick="addClass()">إضافة فصل</button></div>` +
    adminData.map(u => `<div class="card row"><div class="sp"><h3>${esc(u.name)}</h3><span class="mut">${ROLE[u.role]}${u.classId ? ' · ' + esc(clsLabel(u.classId)) : ''}${u.nationality ? ' · ' + esc(u.nationality) : ''}${u.createdAt ? ' · أُنشئ: ' + new Date(u.createdAt).toLocaleDateString('ar-SA') : ' · حساب قديم'}</span></div>
    <button class="btn ghost sm" onclick="renUser('${u.id}')">الاسم</button>${u.role !== 'admin' ? `<button class="btn bad sm" onclick="delUser('${u.id}')">حذف</button>` : ''}</div>`).join('');
}
const adm = fn => async () => { try { await fn(); await load(true); await loadAdmin(); } catch (e) { toast(e.message); } };
const addClass = () => adm(() => api('/api/classes', 'POST', { grade: $('#cg').value, name: $('#cn').value }))();
const delClass = id => confirm('حذف الفصل؟') && adm(() => api('/api/classes/' + id, 'DELETE'))();
const renUser = id => { const v = prompt('الاسم الجديد'); if (v) adm(() => api('/api/users/' + id, 'PATCH', { name: v }))(); };
const delUser = id => confirm('حذف المستخدم؟') && adm(() => api('/api/users/' + id, 'DELETE'))();
