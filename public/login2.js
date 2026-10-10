const LG = { screen: 'welcome', classes: [], f: { name: '', nat: '', natOther: '', grade: '', classId: '', code: '' }, show: false, booted: false, busy: false };
(function () { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'; document.head.appendChild(l); })();
setTimeout(() => { LG.booted = true; if (!S) render(); }, 900);
const NATS = ['سعودي', 'مصري', 'يمني', 'سوري', 'أردني', 'سوداني', 'فلسطيني', 'لبناني', 'عراقي', 'إماراتي', 'كويتي', 'قطري', 'بحريني', 'عماني', 'مغربي', 'تونسي', 'جزائري', 'ليبي', 'صومالي', 'إثيوبي', 'باكستاني', 'هندي', 'بنغلاديشي', 'إندونيسي', 'فلبيني', 'تركي'];
const ICO = p => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC = {
  lock: ICO('<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  eye: ICO('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeoff: ICO('<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.6M6.5 7.5C3.8 9.2 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1"/>'),
  user: ICO('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'),
  globe: ICO('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  book: ICO('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/>'),
  users: ICO('<circle cx="9" cy="8" r="3.5"/><path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M16 4.5a3.5 3.5 0 0 1 0 7M22 20v-1a5 5 0 0 0-3-4.6"/>'),
  back: ICO('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  login: ICO('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>'),
  adduser: ICO('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
  info: ICO('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  chev: ICO('<path d="M15 6l-6 6 6 6"/>')
};
const LGART = `<svg class="lgart" viewBox="0 0 350 140" xmlns="http://www.w3.org/2000/svg"><ellipse cx="175" cy="128" rx="170" ry="8" fill="#e6edff"/>
<rect x="10" y="108" width="88" height="16" rx="3" fill="#1557e6"/><rect x="18" y="92" width="76" height="16" rx="3" fill="#7c5cff"/><rect x="24" y="76" width="66" height="16" rx="3" fill="#4fb3ff"/>
<rect x="110" y="34" width="116" height="76" rx="8" fill="#eef3ff" stroke="#2f4fa8" stroke-width="5"/><rect x="98" y="110" width="140" height="10" rx="5" fill="#9fb4e6"/>
<path d="M168 56l30 12-30 12-30-12z" fill="#1d3f9e"/><path d="M152 76v13c9 7 21 7 30 0V76" fill="#2a5bd7"/>
<rect x="244" y="58" width="56" height="64" rx="16" fill="#ff8a3d"/><rect x="254" y="90" width="36" height="26" rx="8" fill="#ffb067"/><path d="M260 60q12-18 24 0" stroke="#ff8a3d" stroke-width="5" fill="none"/>
<rect x="308" y="92" width="30" height="30" rx="6" fill="#2563eb"/><rect x="312" y="62" width="5" height="34" rx="2" fill="#ef4444" transform="rotate(-10 314 80)"/><rect x="321" y="58" width="5" height="38" rx="2" fill="#22c55e"/><rect x="330" y="64" width="5" height="32" rx="2" fill="#8b5cf6" transform="rotate(10 332 80)"/></svg>`;

const lgPage = (inner, back) => `<div class="lgw"><div class="lgc">${back ? `<button class="lgback" onclick="${back}">${IC.back}</button>` : ''}${inner}</div></div>`;
const lgLogo = big => `<div class="lglogo ${big ? 'big' : ''}"><img src="logo.png" alt="ClassPod" onerror="this.outerHTML='<div class=lgtxt><b>ClassPod</b><span>كلاس بود</span></div>'"></div>`;
const lgErr = e => /fetch|network|load failed/i.test((e && e.message) || '') ? 'تعذّر الاتصال بالخادم، تأكد من الإنترنت وحاول مرة أخرى.' : ((e && e.message) || 'حدث خطأ غير متوقع');

function lgModal(type, title, msg, html) {
  const old = document.getElementById('lgmodal'); if (old) old.remove();
  const d = document.createElement('div'); d.id = 'lgmodal'; d.className = 'lgmodal';
  d.innerHTML = `<div class="lgmbox"><div class="lgmic ${type}">${{ error: '✕', warn: '!', success: '✓', info: 'i' }[type]}</div><h3>${esc(title)}</h3><div class="lgmmsg">${html ? msg : esc(msg)}</div><button class="lgbtn" onclick="document.getElementById('lgmodal').remove()">موافق</button></div>`;
  document.body.appendChild(d);
}
function lgLoader(on, text) {
  const old = document.getElementById('lgload'); if (old) old.remove();
  LG.busy = on;
  const b = document.getElementById('lgsubmit'); if (b) b.disabled = on;
  if (!on) return;
  const d = document.createElement('div'); d.id = 'lgload'; d.className = 'lgload';
  d.innerHTML = `<div class="lgmbox"><div class="lgspin"></div><div>${esc(text || 'جاري التحقق من البيانات...')}</div></div>`;
  document.body.appendChild(d);
}
function lgHelp() {
  lgModal('info', 'مساعدة', '<ul class="lghl"><li>إذا كان عندك رمز الدخول الخاص بك (مسؤولة)، اضغط «تسجيل الدخول» وأدخله.</li><li>الطالب: اضغط «إنشاء حساب جديد» ثم «حساب طالب»، واكتب بياناتك مع رمز تسجيل الطلاب الذي يعطيك إياه معلمك.</li><li>المعلم: اختر «حساب معلم» وأدخل رمز تسجيل المعلمين من المسؤولة.</li><li>إذا سجّلت من قبل ودخلت من جهاز جديد: أدخل الرمز في «تسجيل الدخول» وأكمل نفس الاسم والفصل.</li></ul>', true);
}

async function lgLoadClasses() { try { LG.classes = await api('/api/classes'); } catch (e) { } }
async function lgGo(s) {
  LG.screen = s; LG.show = false; LG.f.code = '';
  if (s === 'student' || s === 'teacher' || s === 'type') await lgLoadClasses();
  render();
}
const lgEye = () => { LG.show = !LG.show; const i = document.getElementById('lgcode'); if (i) i.type = LG.show ? 'text' : 'password'; const b = document.querySelector('.lgeye'); if (b) b.innerHTML = LG.show ? IC.eye : IC.eyeoff; };

function lgVWelcome() {
  return lgPage(`${lgLogo(true)}<h1>مرحبًا بك في كلاس بود</h1><p class="lgsub">مساحتك المدرسية للتعلم والتعاون والإنجاز</p>${LGART}
  <button class="lgbtn" onclick="lgGo('login')"><span>تسجيل الدخول</span>${IC.login}</button>
  <button class="lgbtn out" onclick="lgGo('type')"><span>إنشاء حساب جديد</span>${IC.adduser}</button>
  <a class="lghelp" onclick="lgHelp()">${IC.info}<span>مساعدة؟</span></a>`);
}
function lgVLogin() {
  return lgPage(`${lgLogo()}<h2>تسجيل الدخول</h2><p class="lgsub">أدخل رمز الدخول الخاص بك</p>
  <div class="lgfield"><span class="lgi">${IC.lock}</span><input id="lgcode" type="${LG.show ? 'text' : 'password'}" inputmode="numeric" autocomplete="off" placeholder="أدخل رمز الدخول" value="${esc(LG.f.code)}" oninput="LG.f.code=this.value" onkeydown="if(event.key==='Enter')lgDoLogin()"><button class="lgeye" type="button" onclick="lgEye()">${LG.show ? IC.eye : IC.eyeoff}</button></div>
  <button class="lgbtn" id="lgsubmit" onclick="lgDoLogin()"><span>دخول</span>${IC.login}</button>
  <button class="lgbtn out" onclick="lgGo('welcome')"><span>العودة</span>${IC.back}</button><div class="lgshield">🛡️</div>`, "lgGo('welcome')");
}
function lgVType() {
  const card = (cls, emo, t, d, go) => `<div class="lgcard ${cls}" onclick="${go}"><div class="lgav">${emo}</div><div class="sp"><b>${t}</b><span>${d}</span></div><span class="lgchev">${IC.chev}</span></div>`;
  return lgPage(`${lgLogo()}<h2>إنشاء حساب جديد</h2><p class="lgsub">اختر نوع الحساب الذي تريد إنشاءه</p>
  ${card('', '🧑‍🎓', 'حساب طالب', 'للانضمام إلى فصلك الدراسي', "lgGo('student')")}${card('p', '👨‍🏫', 'حساب معلم', 'للمعلمين والمعلمات', "lgGo('teacher')")}
  <button class="lgbtn out lgsmall" onclick="lgGo('welcome')"><span>العودة</span>${IC.back}</button>
  <p class="lgnote">هل أنتِ المسؤولة؟ <a onclick="lgGo('login')">سجّلي الدخول برمزك الخاص</a></p>`, "lgGo('welcome')");
}
function lgNat() {
  const o = LG.f.nat === '__other';
  return `<div class="lgfield"><span class="lgi">${IC.globe}</span><select onchange="LG.f.nat=this.value;render()"><option value="">اختر الجنسية</option>${NATS.map(n => `<option ${LG.f.nat === n ? 'selected' : ''}>${n}</option>`).join('')}<option value="__other" ${o ? 'selected' : ''}>أخرى</option></select></div>` +
    (o ? `<div class="lgfield"><span class="lgi">${IC.globe}</span><input placeholder="اكتب الجنسية" maxlength="30" value="${esc(LG.f.natOther)}" oninput="LG.f.natOther=this.value"></div>` : '');
}
const lgName = () => `<div class="lgfield"><span class="lgi">${IC.user}</span><input placeholder="الاسم الكامل" maxlength="40" value="${esc(LG.f.name)}" oninput="LG.f.name=this.value"></div>`;
const lgCode = ph => `<div class="lgfield"><span class="lgi">${IC.lock}</span><input type="password" inputmode="numeric" autocomplete="off" placeholder="${ph}" value="${esc(LG.f.code)}" oninput="LG.f.code=this.value"></div>`;
function lgVStudent() {
  const grades = [...new Set(LG.classes.map(c => c.grade))], cl = LG.classes.filter(c => c.grade === LG.f.grade);
  const sel = (ico, ph, opts, cur, on) => `<div class="lgfield"><span class="lgi">${ico}</span><select onchange="${on}"><option value="">${ph}</option>${opts.map(o => `<option value="${esc(o[0])}" ${o[0] === cur ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  return lgPage(`${lgLogo()}<h2>إنشاء حساب طالب</h2><p class="lgsub">أدخل بياناتك للانضمام إلى فصلك</p>${lgName()}${lgNat()}
  ${sel(IC.book, 'اختر الصف الدراسي', grades.map(g => [g, g]), LG.f.grade, "LG.f.grade=this.value;LG.f.classId='';render()")}
  ${sel(IC.users, 'اختر الفصل / المجموعة', cl.map(c => [c.id, c.name]), LG.f.classId, 'LG.f.classId=this.value')}
  ${lgCode('رمز تسجيل الطلاب')}
  <button class="lgbtn" id="lgsubmit" onclick="lgDoJoin('student')"><span>إنشاء الحساب</span>${IC.adduser}</button>`, "lgGo('type')");
}
function lgVTeacher() {
  return lgPage(`${lgLogo()}<h2>إنشاء حساب معلم</h2><p class="lgsub">أدخل بياناتك وأكمل التسجيل</p>${lgName()}${lgNat()}${lgCode('رمز تسجيل المعلمين')}
  <button class="lgbtn" id="lgsubmit" onclick="lgDoJoin('teacher')"><span>إنشاء الحساب</span>${IC.adduser}</button>`, "lgGo('type')");
}
function loginView() {
  if (!LG.booted) { $('#app').innerHTML = `<div class="lgw"><div class="lgc" style="justify-content:center">${lgLogo(true)}<div class="lgspin"></div></div></div>`; return; }
  const s = LG.screen;
  $('#app').innerHTML = s === 'login' ? lgVLogin() : s === 'type' ? lgVType() : s === 'student' ? lgVStudent() : s === 'teacher' ? lgVTeacher() : lgVWelcome();
}

function lgAfterLogin() {
  LG.f = { name: '', nat: '', natOther: '', grade: '', classId: '', code: '' }; LG.screen = 'welcome'; LG.show = false;
  tab = 'home'; view = null; creating = false; quiz = false; if (typeof sub2 !== 'undefined') sub2 = null;
}
async function lgDoLogin() {
  if (LG.busy) return;
  const code = LG.f.code.trim();
  if (!code) return lgModal('warn', 'الرمز مطلوب', 'يرجى إدخال رمز الدخول.');
  lgLoader(true, 'جاري التحقق من البيانات...');
  try {
    const r = await api('/api/login2', 'POST', { code });
    lgLoader(false);
    if (r.need) { await lgLoadClasses(); LG.screen = r.need; LG.f.code = code; render(); toast('الرمز صحيح، أكمل بياناتك للدخول'); return; }
    lgAfterLogin(); await load(true);
    if (S) toast('تم تسجيل الدخول بنجاح ✅'); else lgModal('error', 'تعذّر تسجيل الدخول', 'لم يتم حفظ الجلسة، حاول مرة أخرى.');
  } catch (e) {
    lgLoader(false);
    if (/غير صحيح/.test(e.message)) lgModal('error', 'الرمز غير صحيح', 'تأكد من إدخال الرمز الصحيح.');
    else lgModal('error', 'تعذّر تسجيل الدخول', lgErr(e));
  }
}
async function lgDoJoin(role) {
  if (LG.busy) return;
  const f = LG.f, nat = f.nat === '__other' ? f.natOther.trim() : f.nat;
  if (f.name.trim().length < 2 || !nat || !f.code.trim() || (role === 'student' && !f.classId)) return lgModal('warn', 'بيانات ناقصة', 'بعض الحقول المطلوبة فارغة، يرجى تعبئتها كاملة.');
  lgLoader(true, 'جاري التحقق من البيانات...');
  try {
    await api('/api/join', 'POST', { role, code: f.code, name: f.name, nationality: nat, classId: role === 'student' ? f.classId : undefined });
    lgLoader(false); lgAfterLogin(); await load(true);
    if (S) toast('تم إنشاء الحساب بنجاح ✅'); else lgModal('error', 'تعذّر إنشاء الحساب', 'لم يتم حفظ الجلسة، حاول مرة أخرى.');
  } catch (e) {
    lgLoader(false);
    if (/غير صحيح/.test(e.message)) lgModal('error', 'الرمز غير صحيح', 'تأكد من إدخال الرمز الصحيح.');
    else if (/صلاح/.test(e.message)) lgModal('error', 'لا يمكن إنشاء الحساب', 'لا يمكن إنشاء الحساب بسبب نقص الصلاحيات.');
    else lgModal('error', 'تعذّر إنشاء الحساب', lgErr(e));
  }
}
if (!S) render();
