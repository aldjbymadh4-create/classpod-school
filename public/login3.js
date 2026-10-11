LG.f.pw = ''; LG.f.pw2 = '';
const lgPw = (ph, key) => `<div class="lgfield"><span class="lgi">${IC.lock}</span><input type="password" autocomplete="new-password" placeholder="${ph}" value="${esc(LG.f[key])}" oninput="LG.f.${key}=this.value"></div>`;
function lgGo(s) {
  LG.screen = s; LG.show = false; LG.f.code = ''; LG.f.pw = ''; LG.f.pw2 = '';
  const go = () => render();
  if (s === 'student' || s === 'teacher' || s === 'type') return lgLoadClasses().then(go);
  go();
}
function lgAfterLogin() {
  LG.f = { name: '', nat: '', natOther: '', grade: '', classId: '', code: '', pw: '', pw2: '' }; LG.screen = 'welcome'; LG.show = false;
  tab = 'home'; view = null; creating = false; quiz = false; if (typeof sub2 !== 'undefined') sub2 = null;
}
function lgVLogin() {
  return lgPage(`${lgLogo()}<h2>تسجيل الدخول</h2><p class="lgsub">أدخل اسمك وكلمة المرور</p>
  <div class="lgfield"><span class="lgi">${IC.user}</span><input id="lgname" placeholder="الاسم الكامل" maxlength="40" autocomplete="username" value="${esc(LG.f.name)}" oninput="LG.f.name=this.value"></div>
  <div class="lgfield"><span class="lgi">${IC.lock}</span><input id="lgcode" type="${LG.show ? 'text' : 'password'}" autocomplete="current-password" placeholder="كلمة المرور" value="${esc(LG.f.code)}" oninput="LG.f.code=this.value" onkeydown="if(event.key==='Enter')lgDoLogin()"><button class="lgeye" type="button" onclick="lgEye()">${LG.show ? IC.eye : IC.eyeoff}</button></div>
  <button class="lgbtn" id="lgsubmit" onclick="lgDoLogin()"><span>دخول</span>${IC.login}</button>
  <button class="lgbtn out" onclick="lgGo('welcome')"><span>العودة</span>${IC.back}</button>
  <p class="lgnote">المسؤولة: اكتبي رمز الدخول الخاص بك في خانة كلمة المرور.</p>
  <p class="lgnote">ليس لديك حساب؟ <a onclick="lgGo('type')">أنشئ حساباً جديداً</a></p><div class="lgshield">🛡️</div>`, "lgGo('welcome')");
}
function lgVStudent() {
  const grades = [...new Set(LG.classes.map(c => c.grade))], cl = LG.classes.filter(c => c.grade === LG.f.grade);
  const sel = (ico, ph, opts, cur, on) => `<div class="lgfield"><span class="lgi">${ico}</span><select onchange="${on}"><option value="">${ph}</option>${opts.map(o => `<option value="${esc(o[0])}" ${o[0] === cur ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  return lgPage(`${lgLogo()}<h2>إنشاء حساب طالب</h2><p class="lgsub">أدخل بياناتك وأنشئ كلمة مرور للدخول لاحقاً</p>${lgName()}${lgNat()}
  ${sel(IC.book, 'اختر الصف الدراسي', grades.map(g => [g, g]), LG.f.grade, "LG.f.grade=this.value;LG.f.classId='';render()")}
  ${sel(IC.users, 'اختر الفصل / المجموعة', cl.map(c => [c.id, c.name]), LG.f.classId, 'LG.f.classId=this.value')}
  ${lgCode('رمز تسجيل الطلاب')}${lgPw('كلمة المرور (6 أحرف أو أكثر)', 'pw')}${lgPw('تأكيد كلمة المرور', 'pw2')}
  <button class="lgbtn" id="lgsubmit" onclick="lgDoJoin('student')"><span>إنشاء الحساب</span>${IC.adduser}</button>`, "lgGo('type')");
}
function lgVTeacher() {
  return lgPage(`${lgLogo()}<h2>إنشاء حساب معلم</h2><p class="lgsub">أدخل بياناتك وأنشئ كلمة مرور للدخول لاحقاً</p>${lgName()}${lgNat()}${lgCode('رمز تسجيل المعلمين')}${lgPw('كلمة المرور (6 أحرف أو أكثر)', 'pw')}${lgPw('تأكيد كلمة المرور', 'pw2')}
  <button class="lgbtn" id="lgsubmit" onclick="lgDoJoin('teacher')"><span>إنشاء الحساب</span>${IC.adduser}</button>`, "lgGo('type')");
}
async function lgDoLogin() {
  if (LG.busy) return;
  const code = LG.f.code.trim();
  if (!code) return lgModal('warn', 'البيانات ناقصة', 'يرجى إدخال اسمك وكلمة المرور.');
  lgLoader(true, 'جاري التحقق من البيانات...');
  try {
    const r = await api('/api/login2', 'POST', { code, name: LG.f.name });
    lgLoader(false);
    if (r.need) { await lgLoadClasses(); LG.screen = r.need; LG.f.code = code; render(); toast('رمز التسجيل صحيح، أكمل بياناتك وأنشئ كلمة مرور'); return; }
    lgAfterLogin(); await load(true);
    if (S) toast('تم تسجيل الدخول بنجاح ✅'); else lgModal('error', 'تعذّر تسجيل الدخول', 'لم يتم حفظ الجلسة، حاول مرة أخرى.');
  } catch (e) {
    lgLoader(false);
    if (/اكتب اسمك/.test(e.message)) lgModal('warn', 'الاسم مطلوب', 'اكتب اسمك الكامل مع كلمة المرور.');
    else if (/غير صحيح/.test(e.message)) lgModal('error', 'بيانات الدخول غير صحيحة', 'تأكد من الاسم وكلمة المرور وحاول مرة أخرى.');
    else lgModal('error', 'تعذّر تسجيل الدخول', lgErr(e));
  }
}
async function lgDoJoin(role) {
  if (LG.busy) return;
  const f = LG.f, nat = f.nat === '__other' ? f.natOther.trim() : f.nat;
  if (f.name.trim().length < 2 || !nat || !f.code.trim() || !f.pw || !f.pw2 || (role === 'student' && !f.classId)) return lgModal('warn', 'بيانات ناقصة', 'بعض الحقول المطلوبة فارغة، يرجى تعبئتها كاملة.');
  if (f.pw.length < 6) return lgModal('warn', 'كلمة المرور قصيرة', 'يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.');
  if (f.pw !== f.pw2) return lgModal('warn', 'كلمتا المرور غير متطابقتين', 'أعد كتابة كلمة المرور في خانة التأكيد.');
  lgLoader(true, 'جاري إنشاء الحساب...');
  try {
    await api('/api/register', 'POST', { role, code: f.code, name: f.name, nationality: nat, classId: role === 'student' ? f.classId : undefined, password: f.pw });
    lgLoader(false); lgAfterLogin(); await load(true);
    if (S) toast('تم إنشاء الحساب بنجاح ✅'); else lgModal('error', 'تعذّر إنشاء الحساب', 'لم يتم حفظ الجلسة، حاول مرة أخرى.');
  } catch (e) {
    lgLoader(false);
    if (/^الرمز غير صحيح/.test(e.message)) lgModal('error', 'رمز التسجيل غير صحيح', 'تأكد من إدخال رمز التسجيل الصحيح.');
    else lgModal('error', 'تعذّر إنشاء الحساب', lgErr(e));
  }
}

const resetPw = id => confirm('إعادة تعيين كلمة مرور هذا المستخدم؟ سيسجّل من جديد برمز التسجيل وينشئ كلمة مرور جديدة.') && adm(() => api('/api/users/' + id + '/resetpw', 'POST').then(() => toast('تمت إعادة التعيين')))();
async function loadAdmin() {
  try { adminData = await api('/api/users'); } catch (e) { return toast(e.message); }
  $('#adm').innerHTML = `<div class="card"><h3>الفصول</h3>${S.classes.map(c => `<div class="row" style="margin-bottom:6px"><span class="sp">${esc(c.grade)} · ${esc(c.name)}</span><button class="btn bad sm" onclick="delClass('${c.id}')">حذف</button></div>`).join('')}
    <label>الصف</label><select id="cg"><option>أول ثانوي</option><option>ثاني ثانوي</option><option>ثالث ثانوي</option></select>
    <label>اسم الفصل</label><input id="cn" placeholder="مثال: فصل 3"><button class="btn" onclick="addClass()">إضافة فصل</button></div>` +
    adminData.map(u => `<div class="card"><div class="sp"><h3>${esc(u.name)}</h3><span class="mut">${ROLE[u.role]}${u.classId ? ' · ' + esc(clsLabel(u.classId)) : ''}${u.nationality ? ' · ' + esc(u.nationality) : ''}${u.code ? ' · الرمز: ' + esc(u.code) : ''}</span></div>
    <div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn ghost sm" onclick="renUser('${u.id}')">الاسم</button>${u.role !== 'admin' ? `<button class="btn ghost sm" onclick="resetPw('${u.id}')">🔑 إعادة كلمة المرور</button><button class="btn bad sm" onclick="delUser('${u.id}')">حذف</button>` : ''}</div></div>`).join('');
}
